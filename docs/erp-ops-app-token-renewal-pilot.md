# URISA ERP PILOT — renovación no disruptiva de token (09-oct-2026)

## Alcance y mecanismo
- Se ejecuta **solo en el piloto**. No cambian los redirects de portal productivo, 
  Nginx, el editor ni las 22 páginas productivas.
- Token Appsmith: leasing de 15 minutos. La sesión principal ERP (cookie 
  `__Host-urisa_erp_session` Secure/HttpOnly) mantiene su vencimiento original de 8 horas.
- El navegador, desde `https://erp.urisacompresores.com`, hace POST cada 4 minutos
  a `/urisa-auth/refresh` y antes de recargar permisos en Operations.
- El servidor exige Origin same-origin, cookie ERP vigente y token de Operations
  coincidente. Supabase revalida sesión fuente y autorización **en vivo**.
- La DB amplía solamente `app_token_expires_at` hasta 
  `min(erp_sessions.expires_at, now()+15min)`; no modifica `expires_at`.
- **No rota** el token en cada solicitud para no invalidar consultas en vuelo o 
  otras pestañas. Si hay token vencido por suspensión, se renueva únicamente con 
  cookie ERP y sesión fuente todavía válidas.
- Si se revoca la sesión de portal, el refresh devuelve 401 y las consultas 
  siguientes deben ser denegadas. El caché local nunca autoriza SQL.
- El endpoint no devuelve ni registra credenciales. No exponerlo en 
  `portal.urisacompresores.com` (solo en el hostname ERP).

## Estado comprobado: 09-oct-2026
- Migración aditiva **APLICADA** en Supabase Dashboard. Permisos comprobados: anon/authenticated DENY, service_role ALLOW, token falso devuelve false; cero leases superan a la sesión principal.
- Endpoint Next.js y JSObject de Operations **PREPARADOS EN RAMAS PILOTO, NO DESPLEGADOS**.
- Test de sintaxis/simulación JS: PASS; integración HTTP real Appsmith pendiente.

## Orden de implementación
1. Ya aplicada migración aditiva `docs/sql/erp-ops-app-token-rolling-v1.sql` en
   Supabase Dashboard `rcglkvoqvefenhzquaba`.
2. Desplegar código de Portal `app/urisa-auth/refresh/route.ts` en el
   servicio existente del piloto (no tocar `main`).
3. Confirmar Nginx expone `/urisa-auth/refresh` **solo** bajo el hostname ERP
   y pasa cookie, Host, HTTPS y Origin sin alterar el proxy de producción.
4. Integrar `pages/Operations/jsobjects/auth_control/auth_control.js` desde
   el branch de piloto Appsmith y **publicar solo piloto** (no ERP productivo).
5. Probar con sesión real: respuesta POST 200, TTL renovado +15 min, 
   permanecer 20–30 min en Operations realizando consultas.
6. Probar negativos: sin cookie → 401; token falso → 401; otra Origin →403;
   sesión revocada en Portal →401; permisos revocados →401;
   expiración ERP 8h →401; editor `dashboard` conserva acceso.

## Riesgos pendientes de seguridad / no-certificaciones
- La compatibilidad exacta de Fetch API de Appsmith 1.97 y la recepción de
  cookies same-origin requiere **prueba en navegador** tras el despliegue.
- `storeValue(TOKEN_KEY, token, true)` del piloto conserva el bearer en 
  localStorage, inspeccionable por el usuario. Reducir esa exposición en
  siguiente fase sin romper F5 ni navegación de tabs.
- Los bypass por dashboard directo, puertos VPS y API Appsmith, y permisos
  de las 22 páginas siguen pendientes de certificación.
- Si el POST de renovación falla transitoriamente, la consulta normal puede
  continuar con el lease anterior; si vence, el piloto ya contempla 
  `/urisa-auth/launch` como recuperación visible.
- No mezclar las ramas de piloto con `main` / `master` productivos.

## Criterio de aceptación
PASS solamente tras observar renovación automática **sin redirección ni pérdida 
de formularios**, TTL de 15 min extendido dentro de la sesión de 8 horas, 
revocación real y negativo por orígenes/permisos.
