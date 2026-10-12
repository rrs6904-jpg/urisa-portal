# Fase C: evidencia y prueba de decisiones — 12 octubre 2026

Estado actualizado 12 octubre 2026, 10:25 America/Mexico_City: NO CERTIFICADO.
STAGE sigue privada según el procedimiento; no se solicitó hacerla pública.
Se desplegó el diagnóstico en el proceso PM2 11 existente y se agregaron dos
rutas de diagnóstico en Nginx. No se cambiaron Dashboard, el destino del portal,
las rutas generales de Appsmith ni la base de datos. Este paquete no es un proxy
de seguridad terminado.

## Resultado integrado recibido del administrador

Captura de pantalla de la página de prueba: 6/6 PASS con sesión real.

| Caso | HTTP diagnóstico | Resultado |
|---|---|---|
| Home | 200 | PERIMETER_NOT_CERTIFIED; permiso de recurso verdadero |
| Operations | 200 | PERIMETER_NOT_CERTIFIED; permiso de recurso verdadero |
| SQL en cuarentena | 200 | ACTION_QUARANTINED |
| Modo editor | 200 | EDITOR_MODE_FORBIDDEN |
| Página ajena sintética | 200 | RESOURCE_NOT_IN_STAGE |
| Permisos falsificados en JSON | 400 | Solicitud rechazada |

La página exige diagnostic_only=true y execution_allowed=false en los cinco
casos con HTTP 200. Ninguna fila acredita bloqueo del endpoint real de Appsmith.
Página ajena usa un ID inexistente: no prueba un usuario real sin permiso para
otra página existente. SQL en cuarentena clasifica un ID: no ejecuta el SQL.

Evidencia adicional reportada desde SSH: CUTOVER_LOCAL_PASS y PROBE_HTTPS_PASS;
sin cookie 401, cookie malformada 401, origen ajeno 403. El rechazo de una sesión
revocada no se volvió a comprobar contra este nuevo endpoint.

Proceso activo: PM2 11 urisa-erp-stage-context-canary, puerto 3009,
/var/www/portal-erp-stage-isolation-20261012, build del commit af4b9c10c7369374d81073bf810eaf2e69767bf9.
El despliegue no se persistió con pm2 save.

Rutas nuevas:
- /urisa-auth/full/stage-isolation-check: POST autenticado, diagnóstico JSON.
- /urisa-auth/full/stage-isolation-test: página estática sin datos personales,
  script autorizado por hash CSP y connect-src self; seis comprobaciones al pulsar.
La CSP default-src none de stage-context permanece intacta. Ejecutar fetch desde
su consola fue una instrucción incorrecta; el navegador lo bloqueó antes de la API.

Incidentes resueltos: reinicio PM2 conservaba cwd anterior (corregido mediante
env.pm_cwd y PWD, con rollback); primera comprobación HTTPS devolvió 404 justo
tras reload (se corrigió espera acotada y marcador de ruta; luego pasó). No se
atribuye el primer 404 a un fallo de autenticación.

Respaldos y reversión (aplicar en orden inverso si se retira todo el ensayo):
1. /root/urisa-sso-backups/stage-3009-20261012T154043Z/install-stage-test-page-20261012.py --rollback
2. /root/urisa-sso-backups/stage-3009-20261012T154043Z/expose-stage-isolation-probe-v2.py --rollback
3. /root/urisa-sso-backups/stage-3009-20261012T154043Z/deploy-stage-isolation-cwd-fix.py --rollback
Ejecutar como root. Los rollback de Nginx comprueban hash para no pisar cambios
posteriores y ejecutan nginx -t antes de reload. No ejecutar fuera de orden.

## Evidencia observada

- Editor autenticado: URISA ERP · SSO STAGE, rama master, Home y Operations.
- Share: Make application public desactivado.
- Help: Appsmith Community v1.97. Imagen Docker reportada por administrador:
  sha256:eb93b040f94cf7370b1887d5e5ff69553761bdeb8929fb7de44601d88df00d48.
- Docker publica 8080/8443 en 127.0.0.1. Esto no certifica otros procesos/puertos.
- Se leyeron las 11 qry_ops_* en el editor: todas muestran exactamente
  `select 'SSO_STAGE_QUARANTINED'::text as status where false;`.
  No se pulsó Run ni Deploy. No se verificó aquí la versión publicada ni todos
  los ajustes de ejecución automática. Conservan la datasource compartida.
- Home y Operations tienen acciones REST get_my_page_access. Home sigue
  enviando erp_token de URL; su navegación también conserva ese parámetro.
- IDs de páginas y acciones: lib/erp/stage-isolation-policy.ts, obtenidos de las
  URLs del editor, no de nombres proporcionados por un empleado.
- La UI observada de Home tiene un modelo que intenta obtener full_name de
  data[0], aunque la API retorna grants. Corrección visual pendiente, secundaria.

## Hallazgos de aislamiento

- Dashboard location / continúa enviando tráfico a Appsmith sin auth_basic global.
- ERP HTML STAGE usa 3009; las API generales caen en el verificador 3004.
- El verificador check-rolling en la rama base solo comprueba sesión: no resuelve
  página, acción ni permiso por recurso.
- El canary previo usa /api/v1/consolidated/view. La ruta v1.97 real es
  /api/v1/consolidated-api/view y acepta defaultPageId, applicationId y referencias
  de Git. El extractor previo solo buscaba pageId/applicationId: SIN_IDS no
  demuestra que faltaran identificadores bajo otros nombres.
- v1.97 ActionControllerCE ejecuta POST /api/v1/actions/execute como multipart;
  ActionExecutionSolutionCEImpl parsea executeActionDTO, incluido actionId.
- ConsolidatedAPIServiceCEImpl devuelve, además de la página solicitada, metadatos
  de páginas y colecciones JS de la aplicación. Comprobar defaultPageId no basta
  para certificar que la respuesta no exponga contenido de páginas denegadas.
- /files/ existe en Dashboard y default HTTP hacia storage público route-sheets.
  No se evaluó contenido ni dependencia; no se modificó.

Fuentes de código: appsmithorg/appsmith, tag v1.97:
app/server/appsmith-server/src/main/java/com/appsmith/server/controllers/ConsolidatedAPIController.java
app/server/appsmith-server/src/main/java/com/appsmith/server/controllers/ce/ActionControllerCE.java
app/server/appsmith-server/src/main/java/com/appsmith/server/solutions/ce/ActionExecutionSolutionCEImpl.java
app/server/appsmith-server/src/main/java/com/appsmith/server/services/ce/ConsolidatedAPIServiceCEImpl.java

## Qué hace este paquete

Agrega POST /urisa-auth/stage-isolation-check, desactivado por defecto.
Requiere URISA_ERP_FULL_STAGE=1 y URISA_STAGE_ISOLATION_PROBE=1. Usa el RPC existente
erp_general_session_page_grants_v1 y la cookie HttpOnly STAGE. No admite identidad
ni permisos en el cuerpo. Devuelve decisiones sin datos personales.

Cuerpo diagnóstico: {"method":"GET","target":"/app/urisa-erp-sso-stage/home-6aca7db6ca8e986ee7957afe"}.
Para simular una acción, method=POST, target=/api/v1/actions/execute y actionId,
viewMode=true. Esto es una descripción de una solicitud, NO el multipart real.

Nunca conectar a auth_request: HTTP 200 significa diagnóstico completado, no
autorización. execution_allowed siempre es false. resource_permission solo
indica coincidencia entre recurso registrado y permisos de sesión del servidor.
No pasa tráfico a Appsmith ni a consultas PostgreSQL.

32 pruebas locales de política con Node 24.19.0 pasaron:
`node --test tests/stage-isolation-policy.test.mjs`.
Build completo Next.js: BUILD_PASS reportado en VPS. Prueba HTTP con sesión real:
6/6 PASS reportado en la captura anterior.
Los casos de sesión ausente/revocada son entradas sintéticas sin grants; no son
una nueva certificación de la revocación real en Supabase.

## Preparación original completada

Identificar PID, directorio y commit que atienden 3009 mediante ss y /proc, sin
imprimir variables de entorno ni secretos. Preparar build separado y conservar
directorio/commit/configuración de arranque anteriores. No ejecutar git pull ni
build sobre el proceso activo. No iniciar otro servicio PM2.

Exponer después únicamente una ruta de prueba específica a 3009, con respaldo
del archivo Nginx, nginx -t previo y rollback al bloque anterior. La ruta catch-all
/urisa-auth/full/ hoy apunta a 3006, por lo que NO llega automáticamente a 3009.
El siguiente despliegue debe incluir un procedimiento concreto de rollback del
proceso y del bloque Nginx antes de modificar cualquiera de ellos.

Para el ensayo integrado: sesión válida obtiene decisión esperada; sesión ausente
o revocada obtiene 401; recurso sin permiso es denegado en decisión; SQL en
cuarentena nunca ejecutable; errores RPC cierran acceso. STAGE permanece privada.

## Pendiente antes de prueba pública

1. Intermediario real que analice la solicitud multipart, vincule acción/página,
   rechace ambigüedad y conserve identidad verificable en backend.
2. Sustitución real del token URL; adapter de permisos basado en sesión de servidor.
3. Filtrado de metadatos/colecciones y cierre de API/editor, aliases y WebSocket.
4. Cierre selectivo demostrado de STAGE por Dashboard y otras entradas sin afectar
   producción, o resolución explícita de la dependencia de producción de Dashboard.
5. Probar controles de frontera con STAGE aún privada. Una vez suficiente,
   prueba pública temporal con reversión inmediata si cualquier control falla.

No declarar viable/certificado el runtime basándose en los tests de este paquete.

## Siguiente evidencia necesaria para el proxy real

Inventario de rutas de una carga real del runtime Home STAGE privado mediante
Dashboard, con sesión administrativa existente. El inventario inicial de logs
mezclaba dominios, escáneres y aplicaciones; no permite enumerar las dependencias
del runtime STAGE. Recoger únicamente pathname e iniciador, sin query strings,
cookies, cabeceras ni respuestas personales. No ejecutar acciones de Operations.
Esto define las rutas a interceptar: no convierte el diagnóstico en autorización.
