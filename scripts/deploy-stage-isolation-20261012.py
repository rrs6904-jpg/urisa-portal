#!/usr/bin/env python3
"""Temporary cutover of existing PM2 id 11 only. No Nginx changes, no pm2 save."""
import argparse
import copy
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request

BACKUP = Path('/root/urisa-sso-backups/stage-3009-20261012T154043Z')
OLD = '/var/www/portal-erp-stage-context-20261010'
NEW = '/var/www/portal-erp-stage-isolation-20261012'
NAME = 'urisa-erp-stage-context-canary'
ID = 11
COMMIT = 'af4b9c10c7369374d81073bf810eaf2e69767bf9'
HOST = 'erp.urisacompresores.com'

def require(ok, code):
    if not ok:
        raise RuntimeError(code)

def command(args, code):
    p = subprocess.run(args, capture_output=True, text=True, timeout=45)
    if p.returncode:
        with (BACKUP / 'deployment-private.log').open('a') as f:
            f.write(code + '\n' + p.stdout + '\n' + p.stderr + '\n')
        raise RuntimeError(code)
    return p.stdout

def processes():
    return json.loads(command(['pm2', 'jlist'], 'PM2_READ_FAIL'))

def stage(apps, cwd):
    matches = [a for a in apps if a.get('name') == NAME or a.get('pm_id') == ID]
    require(len(matches) == 1, 'PM2_ID_NAME_AMBIGUOUS')
    a = matches[0]
    e = a['pm2_env']
    require(a.get('pm_id') == ID and a.get('name') == NAME, 'PM2_ID_NAME_CHANGED')
    require(e.get('pm_cwd') == cwd and e.get('pm_exec_path') == '/usr/bin/npm', 'PM2_STARTUP_CHANGED')
    require(e.get('status') == 'online' and e.get('exec_mode') == 'fork_mode', 'PM2_NOT_READY')
    return a

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def status(path, method='GET', cookie=None, origin=None):
    headers = {'Host': HOST, 'Content-Type': 'application/json'}
    if cookie is not None:
        headers['Cookie'] = cookie
    if origin is not None:
        headers['Origin'] = origin
    body = b'{"method":"GET","target":"/app/urisa-erp-sso-stage/home-6aca7db6ca8e986ee7957afe"}' if method == 'POST' else None
    req = urllib.request.Request('http://127.0.0.1:3009'+path, data=body, headers=headers, method=method)
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    try:
        with opener.open(req, timeout=3) as response:
            return response.status
    except urllib.error.HTTPError as e:
        e.close()
        return e.code
    except (OSError, urllib.error.URLError):
        return 0

def ready(cwd, probe):
    for _ in range(20):
        try:
            stage(processes(), cwd)
            if status('/urisa-auth/stage-context') == 401 and status('/urisa-auth/check-rolling') == 401:
                expected = 401 if probe else 404
                if status('/urisa-auth/stage-isolation-check', 'POST') == expected:
                    sockets = command(['ss', '-ltnp', 'sport = :3009'], 'LISTENER_READ_FAIL')
                    pids = set(re.findall(r'pid=(\d+)', sockets))
                    if pids and all(os.readlink('/proc/'+pid+'/cwd') == cwd for pid in pids):
                        return True
        except (RuntimeError, OSError):
            pass
        time.sleep(1)
    return False

def config(saved, cwd, probe):
    e = saved['pm2_env']
    variables = copy.deepcopy(e.get('env', {}))
    require(isinstance(variables, dict), 'ENV_FORMAT_INVALID')
    for k, v in e.items():
        if re.fullmatch(r'[A-Z_][A-Z0-9_]*', k) and isinstance(v, (str, int, float)):
            variables[k] = v
    variables['URISA_ERP_FULL_STAGE'] = '1'
    variables['URISA_STAGE_ISOLATION_PROBE'] = '1' if probe else '0'
    # Only the working directory and probe flag change. Preserve args and interpreter.
    app = {'name': NAME, 'script': e['pm_exec_path'], 'pm_exec_path': e['pm_exec_path'],
           'cwd': cwd, 'pm_cwd': cwd, 'exec_mode': 'fork',
           'interpreter': e.get('exec_interpreter', '/usr/bin/node'),
           'exec_interpreter': e.get('exec_interpreter', '/usr/bin/node'),
           'args': e.get('args', []), 'env': variables}
    return {'apps': [app]}

def write_config(filename, value):
    path = BACKUP / filename
    path.write_text('module.exports = '+json.dumps(value)+';\n')
    path.chmod(0o600)
    return path

def restart(path):
    # Guard prevents configuration-file restart from creating a missing process.
    apps = processes()
    matches = [a for a in apps if a.get('name') == NAME]
    require(len(matches) == 1 and matches[0].get('pm_id') == ID, 'RESTART_TARGET_CHANGED')
    command(['pm2', 'restart', str(path), '--only', NAME, '--update-env'], 'PM2_RESTART_FAIL')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--rollback', action='store_true')
    args = parser.parse_args()
    require(args.apply != args.rollback, 'USE_APPLY_OR_ROLLBACK')
    require(os.geteuid() == 0, 'ROOT_REQUIRED')
    os.umask(0o077)
    saved = json.loads((BACKUP / 'pm2-stage.json').read_text())
    stage([saved], OLD)
    original_args = json.dumps(saved['pm2_env'].get('args', []))
    require(OLD not in original_args and '--prefix' not in original_args, 'ARGS_REQUIRE_REVIEW')
    rollback = write_config('rollback.config.js', config(saved, OLD, False))
    if args.rollback:
        current = processes()
        a = [a for a in current if a.get('pm_id') == ID]
        require(len(a) == 1 and a[0]['pm2_env'].get('pm_cwd') in (OLD, NEW), 'ROLLBACK_TARGET_CHANGED')
        restart(rollback)
        require(ready(OLD, False), 'ROLLBACK_HEALTH_FAIL')
        print('ROLLBACK_PASS: proceso 11 restaurado; Nginx sin cambios')
        return

    before = processes()
    live = stage(before, OLD)
    require(live['pm2_env'].get('args', []) == saved['pm2_env'].get('args', []), 'ARGS_CHANGED_AFTER_BACKUP')
    require(command(['git', '-C', NEW, 'rev-parse', 'HEAD'], 'CANDIDATE_GIT_FAIL').strip() == COMMIT, 'CANDIDATE_COMMIT_CHANGED')
    require((Path(NEW)/'.next/BUILD_ID').is_file(), 'CANDIDATE_NOT_BUILT')
    require((Path(NEW)/'.next/server/app/urisa-auth/stage-isolation-check/route.js').is_file(), 'PROBE_NOT_BUILT')
    require(ready(OLD, False), 'BASELINE_HEALTH_FAIL')
    newconf = write_config('candidate.config.js', config(saved, NEW, True))
    try:
        restart(newconf)
        require(ready(NEW, True), 'CANDIDATE_HEALTH_FAIL')
        path = '/urisa-auth/stage-isolation-check'
        require(status(path, 'POST', cookie='__Host-urisa_erp_full_session=invalid') == 401, 'BAD_COOKIE_NOT_REJECTED')
        require(status(path, 'POST', origin='https://invalid.example') == 403, 'FOREIGN_ORIGIN_NOT_REJECTED')
        after = processes()
        require({a['pm_id'] for a in before} == {a['pm_id'] for a in after}, 'PM2_PROCESS_SET_CHANGED')
        old_others = {a['pm_id']:(a.get('pid'), a.get('name'), a['pm2_env'].get('pm_cwd')) for a in before if a['pm_id'] != ID}
        new_others = {a['pm_id']:(a.get('pid'), a.get('name'), a['pm2_env'].get('pm_cwd')) for a in after if a['pm_id'] != ID}
        require(old_others == new_others, 'OTHER_PROCESS_CHANGED')
    except BaseException:
        print('CUTOVER_FAIL: intentando rollback del proceso 11')
        restart(rollback)
        require(ready(OLD, False), 'ROLLBACK_HEALTH_FAIL')
        print('ROLLBACK_PASS: version anterior restaurada')
        raise
    print('CUTOVER_LOCAL_PASS')
    print('PM2_ID=11; PM2_NOMBRE='+NAME)
    print('DIRECTORIO='+NEW)
    print('SIN_COOKIE=401; COOKIE_MALFORMADA=401; ORIGEN_AJENO=403')
    print('NGINX_SIN_CAMBIOS; SIN_PM2_SAVE; STAGE_DEBE_SEGUIR_PRIVADA')
    print('PENDIENTE: sesion real, permisos y aislamiento de runtime/API')

if __name__ == '__main__':
    try:
        main()
    except BaseException as e:
        # Never print raw process output, environment or exception messages containing secrets.
        code = str(e) if isinstance(e, RuntimeError) and re.fullmatch(r'[A-Z0-9_]+', str(e)) else type(e).__name__
        print('STOP: '+code)
        sys.exit(1)
