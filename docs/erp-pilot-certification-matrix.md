# URISA ERP single-login pilot — certification matrix

No production cutover until every REQUIRED test is PASS.

## A. Perimeter / Nginx

| Test | Expected |
|---|---|
| ERP hostname without session | 401/403 or redirect to portal; never Appsmith content |
| ERP runtime with valid ERP session | Appsmith runtime loads |
| Direct VPS:8080 from Internet | blocked after cutover |
| Direct VPS:8443 from Internet | blocked after cutover |
| Old portal :3000 exposure | removed/restricted after dependency check |
| dashboard hostname as employee bypass | blocked |
| Appsmith API route without ERP session | blocked |
| WebSocket handshake without ERP session | blocked |
| Auth service unavailable | fail closed |

## B. Handoff

| Test | Expected |
|---|---|
| start -> authorize -> exchange | succeeds once |
| expired code | denied |
| reused code | denied |
| same code concurrent exchanges | exactly one succeeds |
| code copied to another browser | denied by bootstrap nonce |
| malformed nonce/code | 400/401 |
| arbitrary redirect URL | ignored/rejected |
| code/token in logs | secrets not logged |

## C. Session lifecycle

| Test | Expected |
|---|---|
| reload/new tab | same identity |
| portal logout | ERP access stops on validation |
| user disabled in profiles | ERP access stops |
| user disabled in app_users | ERP access stops |
| Ops_Board can_view removed | ERP access stops |
| Supabase source session removed | ERP access stops |
| ERP logout | ERP cookie removed + server session revoked |
| expired ERP session | denied |

## D. Identity / authorization

Perimeter PASS is not sufficient for security certification.

| Test | Expected |
|---|---|
| Comercial changes ?email= to Roberto | no identity/permission change |
| Comercial changes user_id/role params | no privilege escalation |
| Comercial requests unauthorized page | denied |
| direct query/API invocation | same authorization as UI |
| failed live permission lookup | no stale-cache access |
| account switch in same browser | previous identity/cache cleared |

## E. Operations pilot

| Capability | Required |
|---|---|
| feed/read | correct visibility |
| categories | only allowed area/categories |
| events | only visible items |
| create | actor determined server-side |
| update | actor + can_edit validated server-side |
| comment | actor + item visibility validated |
| close day | actor + authorization validated |
| attachments | list/read/upload permissions preserved |
| notifications | correct actor |
| audit trail | verified actor, no client-supplied identity |

## F. Administration

| Test | Expected |
|---|---|
| Roberto editor login | works |
| employee dashboard/editor URL | cannot bypass runtime auth |
| employee admin API call | denied |
| Appsmith admin credentials | never shared with employees |

## Cutover rule

Only after A+B+C are PASS may the same Appsmith runtime be exposed through erp.urisacompresores.com.

Only after D+Operations server-side authorization are PASS may the pilot be called secure end-to-end.

The remaining 21 pages expand one-by-one after Operations certification.
