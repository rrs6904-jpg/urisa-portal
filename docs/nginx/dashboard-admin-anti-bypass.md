# Dashboard anti-bypass design

Status: design only. Not deployed.

## Objective

Keep the existing Appsmith instance and editor for the administrator while preventing employees from bypassing the protected ERP runtime by opening dashboard.urisacompresores.com directly.

## Key constraint

The Appsmith application currently has to remain public for the employee runtime pilot. A public Appsmith app is reachable without an Appsmith login, so a second hostname pointing to the same instance is not automatically an administrative boundary.

Therefore dashboard.urisacompresores.com must have its own external access control.

## Recommended administrative boundary

Use Nginx HTTP Basic Authentication on dashboard.urisacompresores.com as the first administrative gate, followed by Appsmith's own administrator login.

Flow:

Administrator browser
  -> dashboard.urisacompresores.com
  -> Nginx Basic Auth
  -> Appsmith
  -> Appsmith administrator login/editor

Employees:
  -> dashboard.urisacompresores.com
  -> Nginx Basic Auth challenge
  -> no access

This is intentionally separate from the employee ERP session and does not require Appsmith Enterprise.

## Why Basic Auth for the admin host

- available in standard Nginx builds;
- no dependency on Appsmith SSO;
- no dependency on Supabase portal cookies;
- protects both runtime and editor routes on the dashboard hostname;
- works before Appsmith receives any request;
- simple rollback: remove the auth_basic directives and reload Nginx.

## Required controls

1. Strong unique administrator password stored only in /etc/nginx/.htpasswd-urisa-dashboard (or equivalent).
2. HTTPS only.
3. No password in GitHub, chat, scripts or URLs.
4. dashboard host must never trust ?email= as authentication.
5. Direct container ports 8080/8443 must be closed/rebound after ERP runtime certification, otherwise the Nginx dashboard gate can be bypassed.
6. The old Next.js portal on :3000 must be dependency-checked and then removed/restricted.
7. Appsmith form login/open signup settings must remain appropriate for administration; employee access uses erp.urisacompresores.com, not dashboard.

## Nginx draft

Do not deploy until the ERP pilot is ready and administrator access is tested in a second browser/session.

Inside the existing dashboard HTTPS server block:

    auth_basic "URISA Appsmith Administration";
    auth_basic_user_file /etc/nginx/.htpasswd-urisa-dashboard;

These directives at server level protect every path on dashboard.urisacompresores.com, including public runtime URLs, editor URLs, assets and API calls for that hostname.

The existing /files/ location may need an explicit decision:
- inherit Basic Auth (safest default), or
- move public file delivery to a separate hostname/path before dashboard lock-down.

Do not add auth_basic only to /edit; that would leave public runtime/API paths on dashboard as a bypass.

## Test gates

Before enabling:
- current Appsmith editor URL works through dashboard;
- admin can authenticate through Nginx then Appsmith;
- fresh incognito without Basic Auth receives 401 from Nginx;
- a public Appsmith runtime URL on dashboard also receives 401;
- Appsmith API/WebSocket requests on dashboard cannot bypass Basic Auth;
- erp.urisacompresores.com remains independent;
- /files/ behavior is tested.

## Alternatives

More sophisticated options (VPN, client certificates, IP allowlist) can replace Basic Auth later. They are not required for the first pilot and should not delay the single-login objective.
