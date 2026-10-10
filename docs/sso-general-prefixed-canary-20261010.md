# URISA ERP SSO general: canary aislado por prefijos (10-oct-2026)

## Por qué
Nginx actual dirige `/urisa-auth/` al piloto en 3002, `/erp/login` y `/erp/authorize` al piloto en 3002, y el auth_request del ERP general al guard de Operations en 3004. La app de 22 páginas aún usa `?email=`. Por ello **NO** sustituir esas rutas ni redirigir el portal productivo.

## Rama y activación
Rama `work/sso-full-erp-stage-20261010` se origina de
`work/sso-full-erp-20261010`. Antes de compilar configurar SOLO en
el entorno de ensayo:
- `URISA_ERP_FULL_STAGE=1`
- `URISA_ERP_PORTAL_AUTHORIZE_URL=https://portal.urisacompresores.com/erp/full/authorize`
- `URISA_ERP_APPSMITH_FULL_URL` debe conservar la URL segura preparada previamente (en ensayo solo se valida, no se visita).

El piloto conserva sus cookies `__Host-urisa_erp_session` y
`__Host-urisa_erp_bootstrap`. El canary utiliza cookies **separadas**:
`__Host-urisa_erp_full_session` y `__Host-urisa_erp_full_bootstrap`.

## Sólo tras build exitoso y revisión de las dos configuraciones Nginx completas
Rutas propuestas (dentro de los server SSL correspondientes, añadir
SIN alterar las rutas actuales):

Portal:
```nginx
location ^~ /erp/full/ {
    proxy_pass http://127.0.0.1:3006/erp/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache off;
    add_header Cache-Control "private, no-store" always;
}
```

ERP:
```nginx
location ^~ /urisa-auth/full/ {
    proxy_pass http://127.0.0.1:3006/urisa-auth/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache off;
    add_header Cache-Control "private, no-store" always;
}
```

Nginx usa coincidencia de prefijo más largo y el `proxy_pass .../`
reemplaza el prefijo por el del servicio 3006. La configuración de
producción de `/urisa-auth/` continúa enviando al piloto 3002.

La URL de prueba es `https://erp.urisacompresores.com/urisa-auth/full/start`.
El flujo pasa por `/erp/full/authorize` y, si hace falta, `/erp/full/login`
en portal; vuelve a `/urisa-auth/full/exchange` y finalmente
`/urisa-auth/full/launch` en ERP.

En modo stage el launch **NO abre Appsmith**: valida la sesión, genera
credencial de 15 min, consulta
`erp_general_page_grants_v1(p_app_token)` con service_role y presenta
únicamente el recuento de páginas permitidas (sin email ni token).
Salida con `/urisa-auth/full/logout`, que redirige al logout del portal
y revoca únicamente la sesión de canary.

## Condiciones de cierre
- Probar 401 sin cookie o con cookie falsa, no permitir consulta de
  permisos a través de RPC anon o authenticated.
- Probar usuario de Operations y usuario con otra página, con consentimiento
  y credenciales escritas SOLO en login real, nunca en comandos o chat.
- Verificar que no se invalida cookie/session del piloto y que F5,
  logout y revocación funcionan.
- No abrir `/app/urisa-erp-appsmith` con SSO hasta adaptar
  consultas/acciones del JSON productivo y backend de permisos.
- Antes de tocar Nginx, respaldar archivos con `cp -p`; ejecutar
  `nginx -t`; preparar rollback inmediato (restaurar backup, recargar).
