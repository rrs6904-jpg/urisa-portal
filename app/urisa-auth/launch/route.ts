import { NextResponse, type NextRequest } from 'next/server'
import { ERP_SESSION_COOKIE } from '@/lib/erp/config'
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
      new URL('https://erp.urisacompresores.com/urisa-auth/start'),
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
      new URL('https://erp.urisacompresores.com/urisa-auth/start'),
      302,
    )
    response.cookies.delete(ERP_SESSION_COOKIE)
    return response
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
