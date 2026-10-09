# ERP piloto — renovación server-side, SIN modificar Appsmith

**Decisión 2026-10-09:** Appsmith JSObject fetch() excluye cookies (documentación
oficial). Por ello la variante basada en `renewAppToken()` en la rama
`urisa-erp-appsmith-pilot/pilot/sso-token-renewal-20261009` NO SE DEBE DESPLEGAR.

## Implementación compatible
Nginx ya ejecuta auth_request `/_urisa_erp_auth_check` antes de pasar
rutas Appsmith al puerto 8080, llevando la cookie HttpOnly ERP al backend
Next.js (sin transmitirla a Appsmith). Nuevo checker server-side:

- GET /urisa-auth/check-rolling en el servicio canario 3003
- RPC erp_validate_session_rolling_v1 en Dashboard Supabase
- La RPC primero llama a erp_validate_session, respetando todos los
  bloqueos y revocaciones de las sesiones originales.
- Al validar, extiende el lease de Appsmith a min(expiry ERP, now+15m)
  si quedan <=10m. Nunca cambia expiry de la sesión matriz de 8h.
- Una sesión inactiva >15m recupera lease en el PRÓXIMO request
  protegido que pase por Nginx (antes de atender la API Appsmith).
- Sin intervalos JS, sin tokens en logs ni cookies expuestas a widgets,
  sin necesidad de cambios en Appsmith piloto, ni en rama master.
- GET /urisa-auth/check-rolling directamente sin cookie -> 401,
  con cookie ERP válida -> 204. Mantenerlo accesible solo como auth
  subrequest en Nginx en cutover final si se requiere hardening.

## Secuencia de prueba / cutover
1. SQL aditivo + revocaciones/grants, probar hash inválido -> false.
2. Construir la nueva rama del portal en worktree canario puerto 3003.
   NO tocar los servicios 3001 ni 3002. Antes, revisar git status y backups.
3. Validar GET localhost:3003/urisa-auth/check-rolling sin cookie -> 401.
4. Tomar backup de /etc/nginx/sites-available/erp y cambiar ÚNICAMENTE
   `location = /_urisa_erp_auth_check` a
   `proxy_pass http://127.0.0.1:3003/urisa-auth/check-rolling;`
   sin tocar el resto de rutas. Primero nginx -t y luego reload.
5. Pruebas: ventana incógnito sin sesión -> redirect, login -> piloto,
   F5, escritura/lectura después de >20 min, logout ERP y Portal -> bloquea.
6. Verificar en DB `app_token_expires_at` se mueve con la actividad,
   nunca superando `expires_at`.
7. Rollback: restaurar respaldos de Nginx; sin reiniciar procesos; el
   checker original 3002 permanece intacto.

## Riesgos y pendientes
- Si Next.js 3003 cae, Nginx falla cerrado y piloto ERP queda temporalmente
  sin acceso. Monitorizar el canario y probar regresión antes del cambio.
- Tráfico de Appsmith por una conexión websocket ya establecida no dispara
  auth_request para cada mensaje; verificar si acciones reales usan HTTP.
- Seguridad de rutas alternativas dashboard/8080 y privilegios individuales
  aún pendiente; no migrar 22 páginas hasta certificación.
