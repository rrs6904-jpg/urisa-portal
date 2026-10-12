#!/usr/bin/env python3
"""Expose ONLY the authenticated diagnostic endpoint; never an Appsmith proxy."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

TARGET = Path('/etc/nginx/sites-available/erp')
ENABLED = Path('/etc/nginx/sites-enabled/erp')
BACKUP = Path('/root/urisa-sso-backups/nginx-stage-isolation-20261012')
BASE_SHA = '648fd836bf3513a5ddba214b9ef89d5ff1cf0fb47565f2f2bdc266bb6ff9c6f1'
HOST = 'erp.urisacompresores.com'
ROUTE = '/urisa-auth/full/stage-isolation-check'
BLOCK = '''    # URISA diagnostic only: session required, no Appsmith execution.
    location = /urisa-auth/full/stage-isolation-check {
        client_max_body_size 4k;
        proxy_pass http://127.0.0.1:3009/urisa-auth/stage-isolation-check;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Cookie $http_cookie;
        proxy_set_header Origin $http_origin;
        proxy_set_header Sec-Fetch-Site $http_sec_fetch_site;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache off;
        proxy_connect_timeout 3s;
        proxy_read_timeout 15s;
        add_header Cache-Control "private, no-store" always;
    }
'''

def require(ok, code):
    if not ok:
        raise RuntimeError(code)

def sha(data):
    return hashlib.sha256(data).hexdigest()

def run(args):
    return subprocess.run(args, capture_output=True, text=True, timeout=45)

def nginx_test():
    return run(['nginx', '-t']).returncode == 0

def reload():
    require(nginx_test(), 'NGINX_TEST_FAIL')
    require(run(['systemctl', 'reload', 'nginx']).returncode == 0, 'NGINX_RELOAD_FAIL')

def https_status(path, method='POST', extra=()):
    args = ['curl', '--noproxy', '*', '--silent', '--show-error',
            '--max-time', '12', '--resolve', HOST+':443:127.0.0.1',
            '--output', '/dev/null', '--write-out', '%{http_code}',
            '--request', method]
    if method == 'POST':
        args += ['--header', 'Content-Type: application/json', '--data', '{}']
    args += list(extra) + ['https://'+HOST+path]
    result = run(args)
    return result.stdout.strip() if result.returncode == 0 else 'TRANSPORT_FAIL'

def candidate_config(original):
    text = original.decode('utf-8')
    require(ROUTE not in text, 'PROBE_ROUTE_ALREADY_PRESENT')
    pattern = r'(?m)^[ \t]*location\s+=\s+/urisa-auth/full/stage-context\s*\{'
    matches = list(re.finditer(pattern, text))
    require(len(matches) == 1, 'STAGE_CONTEXT_ANCHOR_AMBIGUOUS')
    start = matches[0].start()
    return (text[:start]+BLOCK+text[start:]).encode('utf-8')

def replace(data):
    temp = TARGET.with_name('erp.urisa-probe.tmp')
    require(not temp.exists(), 'TEMP_FILE_ALREADY_EXISTS')
    try:
        shutil.copy2(TARGET, temp)
        temp.write_bytes(data)
        os.replace(temp, TARGET)
    finally:
        if temp.exists():
            temp.unlink()

def restore(state):
    original = (BACKUP/'erp.conf').read_bytes()
    require(sha(original) == state['before'], 'BACKUP_HASH_MISMATCH')
    require(sha(TARGET.read_bytes()) in (state['before'], state['after']), 'ROLLBACK_CONFIG_DRIFT')
    replace(original)
    reload()
    print('NGINX_ROLLBACK_PASS', flush=True)

def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--apply', action='store_true')
    group.add_argument('--rollback', action='store_true')
    args = parser.parse_args()
    require(os.geteuid() == 0, 'ROOT_REQUIRED')
    os.umask(0o077)
    require(ENABLED.resolve() == TARGET.resolve(), 'ENABLED_TARGET_MISMATCH')
    if args.rollback:
        restore(json.loads((BACKUP/'state.json').read_text()))
        return
    original = TARGET.read_bytes()
    require(sha(original) == BASE_SHA, 'NGINX_CHANGED_SINCE_BACKUP')
    require(nginx_test(), 'NGINX_BASELINE_INVALID')
    require(https_status('/urisa-auth/full/stage-context', 'GET') == '401', 'CONTEXT_BASELINE_FAIL')
    candidate = candidate_config(original)
    require(not BACKUP.exists(), 'BACKUP_ALREADY_EXISTS')
    BACKUP.mkdir(mode=0o700)
    (BACKUP/'erp.conf').write_bytes(original)
    state = {'before': sha(original), 'after': sha(candidate)}
    (BACKUP/'state.json').write_text(json.dumps(state))
    try:
        # Detect edits made while preparing the backup.
        require(sha(TARGET.read_bytes()) == state['before'], 'NGINX_CONCURRENT_CHANGE')
        replace(candidate)
        reload()
        for label, headers, expected in (
            ('SIN_COOKIE', (), '401'),
            ('COOKIE_MALFORMADA', ('--header', 'Cookie: __Host-urisa_erp_full_session=invalid'), '401'),
            ('ORIGEN_AJENO', ('--header', 'Origin: https://invalid.example'), '403'),
        ):
            actual = https_status(ROUTE, extra=headers)
            print(label+': '+actual+' esperado='+expected, flush=True)
            require(actual == expected, 'PROBE_HTTPS_CHECK_FAIL')
        require(https_status('/urisa-auth/full/stage-context', 'GET') == '401', 'CONTEXT_REGRESSION_FAIL')
    except BaseException:
        restore(state)
        raise
    print('PROBE_HTTPS_PASS; STAGE_PRIVADA; AISLAMIENTO_NO_CERTIFICADO')
    print('BACKUP='+str(BACKUP))

if __name__ == '__main__':
    try:
        main()
    except BaseException as error:
        code = str(error)
        print('STOP: '+(code if isinstance(error, RuntimeError) and re.fullmatch(r'[A-Z0-9_]+', code) else type(error).__name__))
        sys.exit(1)
