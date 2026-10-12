#!/usr/bin/env python3
"""Install one static diagnostic page, without changing the JSON endpoint CSP."""
import argparse
import base64
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
import time

BASE = Path('/root/urisa-sso-backups/stage-3009-20261012T154043Z')
HELPER = BASE/'expose-stage-isolation-probe-v2.py'
HELPER_SHA = 'a93da7d58e3d1daa6f7a6354d77296f6b41a391fa6295d466124e1356ef60751'
BACKUP = Path('/root/urisa-sso-backups/nginx-stage-test-page-20261012')
UI = '/urisa-auth/full/stage-isolation-test'

JS = r'''const button = document.getElementById("run");
const status = document.getElementById("status");
const rows = document.getElementById("rows");
button.addEventListener("click", async () => {
  button.disabled = true;
  rows.replaceChildren();
  status.textContent = "Comprobando permisos con la sesión de este navegador…";
  const home = "/app/urisa-erp-sso-stage/home-6aca7db6ca8e986ee7957afe";
  const cases = [
    ["Home", {method:"GET",target:home},200,"PERIMETER_NOT_CERTIFIED",true],
    ["Operations",{method:"GET",target:"/app/urisa-erp-sso-stage/operations-6aca842aca8e986ee7958031"},200,"PERIMETER_NOT_CERTIFIED",true],
    ["SQL en cuarentena",{method:"POST",target:"/api/v1/actions/execute",actionId:"6aca8e6fca8e986ee7958061",viewMode:true},200,"ACTION_QUARANTINED",false],
    ["Modo editor",{method:"POST",target:"/api/v1/actions/execute",actionId:"6aca8e6fca8e986ee7958050",viewMode:false},200,"EDITOR_MODE_FORBIDDEN",false],
    ["Página ajena",{method:"GET",target:"/api/v1/consolidated-api/view?defaultPageId=000000000000000000000000"},200,"RESOURCE_NOT_IN_STAGE",false],
    ["Permisos falsificados",{method:"GET",target:home,grants:[{appsmith_page:"Operations",can_view:true}]},400,null,null]
  ];
  let passed = 0;
  try {
    for (const [label,body,expected,reason,permission] of cases) {
      const r = await fetch("/urisa-auth/full/stage-isolation-check", {
        method:"POST", credentials:"same-origin", redirect:"error", cache:"no-store",
        headers:{"Content-Type":"application/json"}, body:JSON.stringify(body),
        signal:AbortSignal.timeout(15000)
      });
      if (r.status === 401) {status.textContent="STOP · Sesión STAGE ausente, vencida o sin permisos válidos. Usa Iniciar sesión STAGE y vuelve a esta página."; return;}
      if (r.status === 503) {status.textContent="STOP · El servidor no pudo validar los permisos (HTTP 503)."; return;}
      const d = await r.json().catch(() => null);
      const ok = r.status === expected && (expected === 400 ||
        (d?.diagnostic_only === true && d?.execution_allowed === false && d?.reason === reason && d?.resource_permission === permission));
      if (ok) passed++;
      const tr = document.createElement("tr");
      for (const text of [label,String(r.status),ok?"PASS":"FAIL",typeof d?.reason === "string"?d.reason:"Solicitud rechazada"]) {
        const td=document.createElement("td"); td.textContent=text; tr.append(td);
      }
      rows.append(tr);
    }
    status.textContent="Diagnóstico: "+passed+"/6 PASS. Esto NO certifica el aislamiento de Appsmith ni ejecuta sus operaciones.";
  } catch {
    status.textContent="STOP · No se pudo completar la solicitud. Comparte este mensaje; no compartas cookies ni credenciales.";
  } finally {button.disabled=false;}
});'''

HTML = '''<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>URISA · Prueba STAGE</title></head><body>
<h1>URISA · Prueba de permisos STAGE</h1>
<p>Usa la cuenta que tiene permiso para Home y Operations.</p>
<p>Esta página consulta el diagnóstico. No abre Appsmith ni ejecuta sus consultas.</p>
<p><a href="/urisa-auth/full/start" target="_blank" rel="noopener noreferrer">Iniciar sesión STAGE</a> · Después vuelve a esta pestaña.</p>
<button id="run" type="button">Ejecutar las seis comprobaciones</button>
<p id="status" role="status">Listo. La sesión se envía mediante su cookie HttpOnly.</p>
<table border="1" cellpadding="8"><thead><tr><th>Caso</th><th>HTTP</th><th>Resultado</th><th>Motivo</th></tr></thead><tbody id="rows"></tbody></table>
<p>Comparte únicamente el resultado y la tabla. STAGE debe permanecer privada.</p>
<script>'''+JS+'''</script></body></html>'''

def digest(data):
    return hashlib.sha256(data).hexdigest()

def quote(value):
    # Nginx return strings interpolate variables; this page contains none.
    if '$' in value:
        raise RuntimeError('UNEXPECTED_NGINX_VARIABLE')
    return "'"+value.replace('\\','\\\\').replace("'","\\'").replace('\n','\\n')+"'"

def block():
    script_hash=base64.b64encode(hashlib.sha256(JS.encode()).digest()).decode()
    policy="default-src 'none'; script-src 'sha256-"+script_hash+"'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    return ('    location = '+UI+' {\n'
            '        default_type text/html;\n        charset utf-8;\n'
            '        add_header Cache-Control "private, no-store" always;\n'
            '        add_header X-Content-Type-Options nosniff always;\n'
            '        add_header Referrer-Policy no-referrer always;\n'
            '        add_header Content-Security-Policy '+quote(policy)+' always;\n'
            '        return 200 '+quote(HTML)+';\n    }\n')

def load_helper():
    if digest(HELPER.read_bytes()) != HELPER_SHA:
        raise RuntimeError('HELPER_VERSION_MISMATCH')
    spec=importlib.util.spec_from_file_location('nginx_probe',HELPER)
    helper=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    return helper

def page_response(m):
    result=m.run(['curl','--noproxy','*','--silent','--show-error','--max-time','3',
                  '--resolve',m.HOST+':443:127.0.0.1','--write-out','\nURISA_STATUS=%{http_code}',
                  'https://'+m.HOST+UI])
    body, sep, code=result.stdout.rpartition('\nURISA_STATUS=')
    return code if result.returncode == 0 and sep else 'TRANSPORT_FAIL', body

def wait_page(m,active):
    deadline=time.monotonic()+20
    while time.monotonic()<deadline:
        code,body=page_response(m)
        if active and code=='200' and body==HTML:
            return
        if not active and code=='404':
            return
        time.sleep(0.5)
    raise RuntimeError('PAGE_ACTIVATION_TIMEOUT' if active else 'PAGE_ROLLBACK_TIMEOUT')

def rollback(m,state):
    original=(BACKUP/'erp.conf').read_bytes()
    m.require(digest(original)==state['before'],'BACKUP_HASH_MISMATCH')
    m.require(digest(m.TARGET.read_bytes()) in (state['before'],state['after']),'ROLLBACK_CONFIG_DRIFT')
    m.replace(original)
    m.reload()
    wait_page(m,False)
    print('TEST_PAGE_ROLLBACK_PASS',flush=True)

def main():
    parser=argparse.ArgumentParser()
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--apply',action='store_true')
    group.add_argument('--rollback',action='store_true')
    args=parser.parse_args()
    os.umask(0o077)
    if os.geteuid()!=0: raise RuntimeError('ROOT_REQUIRED')
    m=load_helper()
    m.require(m.ENABLED.resolve()==m.TARGET.resolve(),'ENABLED_TARGET_MISMATCH')
    if args.rollback:
        rollback(m,json.loads((BACKUP/'state.json').read_text()))
        return
    original=m.TARGET.read_bytes()
    previous=json.loads((m.BACKUP/'state.json').read_text())
    m.require(digest(original)==previous['after'],'NGINX_CHANGED_SINCE_PROBE')
    m.require(m.nginx_test(),'NGINX_BASELINE_INVALID')
    m.require(m.response(m.ROUTE)==('401',True),'PROBE_BASELINE_FAIL')
    m.require(page_response(m)[0]=='404','PAGE_BASELINE_NOT_404')
    text=original.decode()
    anchor='    location = '+m.ROUTE+' {'
    m.require(text.count(anchor)==1 and UI not in text,'ANCHOR_AMBIGUOUS')
    candidate=text.replace(anchor,block()+anchor,1).encode()
    m.require(not BACKUP.exists(),'BACKUP_ALREADY_EXISTS')
    BACKUP.mkdir(mode=0o700)
    (BACKUP/'erp.conf').write_bytes(original)
    state={'before':digest(original),'after':digest(candidate)}
    (BACKUP/'state.json').write_text(json.dumps(state))
    try:
        m.require(digest(m.TARGET.read_bytes())==state['before'],'NGINX_CONCURRENT_CHANGE')
        m.replace(candidate)
        m.reload()
        wait_page(m,True)
        m.require(m.response(m.ROUTE)==('401',True),'PROBE_REGRESSION_FAIL')
    except BaseException:
        rollback(m,state)
        raise
    print('TEST_PAGE_HTTPS_PASS; PRUEBA_CON_SESION_PENDIENTE')
    print('URL=https://'+m.HOST+UI)
    print('STAGE_PRIVADA; CSP_STAGE_CONTEXT_SIN_CAMBIOS')

if __name__=='__main__':
    try: main()
    except BaseException as error:
        code=str(error)
        print('STOP: '+(code if isinstance(error,RuntimeError) and re.fullmatch(r'[A-Z0-9_]+',code) else type(error).__name__))
        sys.exit(1)
