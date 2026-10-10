import { NextResponse, type NextRequest } from 'next/server'
import { ERP_SESSION_COOKIE, ERP_AUTH_BASE_PATH, ERP_FULL_STAGE } from '@/lib/erp/config'
import { serverRpc } from '@/lib/erp/server-rpc'
import { hashOpaqueToken, isOpaqueToken, newOpaqueToken } from '@/lib/erp/token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function operationsUrl(token: string): URL | null {
  const configured = process.env.URISA_ERP_APPSMITH_FULL_URL
  if (!configured) return null

  let url: URL
  try {
    url = new URL(configured)
  } catch {
    return null
  }

  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'erp.urisacompresores.com' ||
    !url.pathname.startsWith('/app/urisa-erp-appsmith/')
  ) {
    return null
  }

  url.search = ''
  url.searchParams.set('erp_token', token)
  return url
}

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get(ERP_SESSION_COOKIE)?.value

  if (!isOpaqueToken(sessionToken)) {
    return NextResponse.redirect(
      new URL(`https://erp.urisacompresores.com${ERP_AUTH_BASE_PATH}/start`),
      302,
    )
  }

  const appToken = newOpaqueToken()
  const { data, error } = await serverRpc<boolean>('erp_general_bind_appsmith_token_v1', {
    p_session_hash: hashOpaqueToken(sessionToken),
    p_app_token_hash: hashOpaqueToken(appToken),
  })

  if (error || data !== true) {
    const response = NextResponse.redirect(
      new URL(`https://erp.urisacompresores.com${ERP_AUTH_BASE_PATH}/start`),
      302,
    )
    response.cookies.delete(ERP_SESSION_COOKIE)
    return response
  }

  // Canary ends at a server-verified page-count probe: it never opens Appsmith.
  if (ERP_FULL_STAGE) {
    const grants = await serverRpc<Array<{ page_name: string; appsmith_page: string | null }>>('erp_general_page_grants_v1', {
      p_app_token: appToken,
    })
    if (grants.error || !Array.isArray(grants.data) || grants.data.length === 0) {
      return new NextResponse('ERP staging permission check denied', {
        status: 403,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    // Verify a legitimate, newly bound application token against the
    // independently deployed stage-permissions API (loopback only).
    // No token is returned to the browser, written to a URL, or logged.
    let verifiedApiCount = 0
    try {
      const apiResponse = await fetch(
        'http://127.0.0.1:3007/urisa-auth/stage-permissions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ erp_token: appToken }),
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        },
      )
      if (!apiResponse.ok) {
        return new NextResponse('ERP STAGE permissions API denied', {
          status: 503,
          headers: { 'Cache-Control': 'private, no-store' },
        })
      }
      const payload: unknown = await apiResponse.json()
      if (!payload || typeof payload !== 'object' || !('grants' in payload)) {
        return new NextResponse('ERP STAGE permissions API invalid response', {
          status: 503, headers: { 'Cache-Control': 'private, no-store' },
        })
      }
      const { grants: apiGrants } = payload as { grants: unknown }
      if (!Array.isArray(apiGrants) || apiGrants.length === 0) {
        return new NextResponse('ERP STAGE permissions API no grants', {
          status: 503, headers: { 'Cache-Control': 'private, no-store' },
        })
      }
      // The grants count displayed below must match the canonical
      // physical page count already obtained from Supabase.
      verifiedApiCount = apiGrants.filter(
        (row: unknown) => row && typeof row === 'object' &&
          'appsmith_page' in row &&
          typeof row.appsmith_page === 'string' &&
          'can_view' in row && row.can_view === true,
      ).length
    } catch {
      return new NextResponse('ERP STAGE permissions API unavailable', {
        status: 503, headers: { 'Cache-Control': 'private, no-store' },
      })
    }

    // Distinguish physical Appsmith pages from auxiliary catalog permissions.
    const count = grants.data.length
    const mapped = grants.data.filter(row => typeof row.appsmith_page === 'string' && row.appsmith_page.length > 0).length
    const auxiliary = count - mapped

    const permissionChecks = await Promise.all([
      serverRpc<boolean>('erp_general_can_access_page_v1', {
        p_app_token: appToken, p_appsmith_page: 'Home', p_require_edit: false,
      }),
      serverRpc<boolean>('erp_general_can_access_page_v1', {
        p_app_token: appToken, p_appsmith_page: 'Operations', p_require_edit: false,
      }),
      serverRpc<boolean>('erp_general_can_access_page_v1', {
        p_app_token: appToken, p_appsmith_page: 'MLB', p_require_edit: false,
      }),
    ])
    if (permissionChecks.some(check => check.error || typeof check.data !== 'boolean')) {
      return new NextResponse('ERP staging page authorization probe failed', {
        status: 503, headers: { 'Cache-Control': 'private, no-store' },
      })
    }
    const [home, operations, mlb] = permissionChecks.map(check => check.data === true)
    const html = `<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="robots" content="noindex,nofollow">
<title>URISA ERP · SSO de prueba</title>
<style>body{font-family:Arial,sans-serif;max-width:650px;margin:70px auto;padding:20px;color:#030173}
strong{color:#086a3a}</style></head><body>
<h1>URISA ERP · SSO general</h1>
<p><strong>Autenticación y permisos: PASS</strong></p>
<p>Permisos activos del catálogo: <strong>${count}</strong></p>
<p>Páginas Appsmith vinculadas al catálogo: <strong>${mapped}</strong> · Categorías auxiliares: <strong>${auxiliary}</strong></p>
<p>API HTTPS de permisos (motor 3007): <strong>${verifiedApiCount === mapped ? 'PASS' : 'REVISAR'}</strong> · Páginas validadas: <strong>${verifiedApiCount}</strong></p>
<p>Home (solo lectura): <strong>${home ? 'PERMITIDO' : 'DENEGADO'}</strong></p>
<p>Operations: <strong>${operations ? 'PERMITIDO' : 'DENEGADO'}</strong></p>
<p>MLB (pendiente de catálogo): <strong>${mlb ? 'PERMITIDO' : 'DENEGADO'}</strong></p>
<p>Prueba aislada: todavía NO se ha abierto Appsmith ni modificado el portal productivo.</p>
</body></html>`

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  }

  const target = operationsUrl(appToken)
  if (!target) {
    return new NextResponse('Full ERP route is not configured', { status: 503 })
  }

  const response = NextResponse.redirect(target, 302)
  response.headers.set('Cache-Control', 'private, no-store')
  response.headers.set('Referrer-Policy', 'no-referrer')
  return response
}
