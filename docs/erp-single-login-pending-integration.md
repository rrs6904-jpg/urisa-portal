# Pending integration changes before pilot deployment

These changes are required before the ERP pilot branch can be deployed.

## 1. Portal middleware

The existing middleware currently requires a Supabase portal session for every non-public route. The ERP perimeter endpoints under /urisa-auth/* must be allowed through without requiring the portal Supabase cookie, because they authenticate using the ERP bootstrap/session cookies and server-side RPC validation.

Required behavior:
- /urisa-auth/start: public to the ERP hostname only.
- /urisa-auth/exchange: requires valid bootstrap cookie + one-time code.
- /urisa-auth/check: requires valid ERP session cookie.
- /urisa-auth/logout: revokes ERP session if present.
- Nginx must expose /urisa-auth/* only on erp.urisacompresores.com.
- portal.urisacompresores.com must not proxy these ERP runtime endpoints externally.

## 2. Login action redirect

The current login action ignores the hidden redirectTo field and always redirects to Appsmith after password sign-in.

For the ERP handshake only, loginAction must allow one safe internal redirect:
  /erp/authorize?nonce=<43-char opaque token>

All other login flows must preserve the existing production behavior.

The redirect must be validated server-side:
- relative path only;
- pathname exactly /erp/authorize;
- nonce must pass isOpaqueToken();
- reject arbitrary origins or paths.

## 3. Deployment ordering

Do not deploy this branch until:
1. erp.urisacompresores.com DNS resolves to the VPS;
2. TLS is issued;
3. Nginx serves the ERP hostname deny-by-default;
4. URISA_SUPABASE_SECRET_KEY is configured server-side only;
5. the reviewed SQL migration is applied;
6. middleware/login integration is committed;
7. portal build passes;
8. isolated /urisa-auth/start -> authorize -> exchange -> check tests pass.

No Appsmith proxy is enabled until those tests pass.
