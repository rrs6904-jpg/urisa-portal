# URISA ERP single-login pilot

Status: branch-only design. Not deployed. No Supabase schema changes are part of this commit.

## Scope

Preserve the existing Appsmith ERP. The portal is the authentication authority and Nginx is the runtime perimeter. This pilot does not rebuild Operations or any other ERP page.

## Hosts

- portal.urisacompresores.com: existing Supabase-authenticated portal.
- erp.urisacompresores.com: employee runtime entry point, deny-by-default until auth is enabled.
- dashboard.urisacompresores.com: Appsmith administrative/editor entry point; must be separately protected before production cutover.

## Handshake

1. Browser requests https://erp.urisacompresores.com/urisa-auth/start.
2. Nginx proxies only /urisa-auth/* to the existing portal Next.js service on 127.0.0.1:3001.
3. /urisa-auth/start creates a cryptographically random browser nonce, sets a short-lived host-only HttpOnly Secure cookie on erp.urisacompresores.com, and redirects to an allowlisted portal authorize URL.
4. /erp/authorize runs on portal.urisacompresores.com, validates the live Supabase user/session and current active-user state, validates the browser nonce format, creates a cryptographically random one-time code, stores only hashes server-side, and redirects to the fixed ERP exchange URL.
5. /urisa-auth/exchange consumes the code atomically and requires the matching browser nonce cookie. A code can succeed once only.
6. Exchange creates an opaque ERP session and sets a host-only HttpOnly Secure SameSite=Lax cookie on erp.urisacompresores.com.
7. Nginx auth_request calls /urisa-auth/check for every protected runtime request.
8. /urisa-auth/check validates the opaque ERP session and the current authoritative user/session state. Failure returns 401/403 and never stale cached authorization.
9. The ERP session cookie is not forwarded upstream to Appsmith.

## Required server-side persistence

Do not use an in-memory map: PM2 restarts or multiple workers would break one-time consumption and revocation.

Required records:

### Login code
- code_hash
- browser_nonce_hash
- user_id
- source_session_id
- expires_at
- consumed_at
- created_at

Atomic exchange condition:
- matching code_hash
- matching browser_nonce_hash
- consumed_at is null
- expires_at > now()

The consume and session creation must be one transaction.

### ERP session
- session_hash
- user_id
- source_session_id
- expires_at
- revoked_at
- created_at
- last_seen_at

## Revocation checks

A valid ERP cookie alone is insufficient. /urisa-auth/check must fail closed when:
- ERP session is expired or revoked;
- Supabase source session no longer exists/is valid;
- user is disabled/banned/unconfirmed;
- profile or app_users is inactive;
- ERP/page entitlement has been removed.

## Redirect safety

No arbitrary redirect URL from query parameters.

Allowed redirects are fixed server-side:
- Portal authorize: https://portal.urisacompresores.com/erp/authorize
- ERP exchange: https://erp.urisacompresores.com/urisa-auth/exchange
- Failed auth: https://portal.urisacompresores.com/login

## Appsmith boundary

This pilot solves perimeter access only. It does not claim that Appsmith internal authorization is solved.

Before production certification:
- email query parameters must not be authoritative;
- Comercial must not gain Roberto permissions by changing page/query parameters;
- direct Appsmith APIs and alternate hosts/ports must not bypass authorization;
- dashboard editor/admin access must remain available only through its intended authentication;
- 8080/8443 direct publication must be removed or network-restricted after the protected route is proven.

## Deployment gates

1. ERP Nginx host returns 403 by default.
2. DNS resolves ERP host to the VPS.
3. TLS certificate works.
4. Start/authorize/exchange/check pass isolated tests.
5. Appsmith runtime is proxied only after auth succeeds.
6. Direct bypass paths are closed.
7. Operations identity/authorization tests pass.
8. Expand page-by-page only after the pilot is certified.
