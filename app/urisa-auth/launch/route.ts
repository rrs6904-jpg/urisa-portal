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
    const grants = await serverRpc<Array<{ page_name: string }>>('erp_general_page_grants_v1', {
      p_app_token: appToken,
    })
    if (grants.error || !Array.isArray(grants.data) || grants.data.length === 0) {
      return new NextResponse('ERP staging permission check denied', {
        status: 403,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    const count = grants.data.length
    const html = `<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="robots" content="noindex,nofollow">
<title>URISA ERP · SSO de prueba</title>
<style>body{font-family:Arial,sans-serif;max-width:650px;margin:70px auto;padding:20px;color:#030173}
strong{color:#086a3a}</style></head><body>
<h1>URISA ERP · SSO general</h1>
<p><strong>Autenticación y permisos: PASS</strong></p>
<p>Páginas permitidas verificadas por Supabase: <strong>${count}</strong></p>
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
