# Fase C: evidencia y prueba de decisiones — 12 octubre 2026

Estado: NO CERTIFICADO. STAGE privada. No se cambió visibilidad, Nginx, PM2,
producción ni la base de datos. Este paquete no es un proxy de seguridad terminado.

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
No se ejecutó aún build completo Next.js ni la prueba HTTP integrada con cookies.
Los casos de sesión ausente/revocada son entradas sintéticas sin grants; no son
una nueva certificación de la revocación real en Supabase.

## Próximo paso y rollback

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
