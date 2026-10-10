import { NextResponse, type NextRequest } from 'next/server'
import {
  ERP_BOOTSTRAP_COOKIE,
  ERP_SESSION_COOKIE,
  ERP_SESSION_MAX_AGE_SECONDS,
  ERP_AUTH_BASE_PATH,
} from '@/lib/erp/config'
import { serverRpc } from '@/lib/erp/server-rpc'
import { hashOpaqueToken, isOpaqueToken, newOpaqueToken } from '@/lib/erp/token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const nonce = request.cookies.get(ERP_BOOTSTRAP_COOKIE)?.value

  if (!isOpaqueToken(code) || !isOpaqueToken(nonce)) {
    return new NextResponse('ERP exchange denied', { status: 401 })
  }

  const sessionToken = newOpaqueToken()
  const { data, error } = await serverRpc<boolean>('erp_exchange_login_code', {
    p_code_hash: hashOpaqueToken(code),
    p_browser_nonce_hash: hashOpaqueToken(nonce),
    p_session_hash: hashOpaqueToken(sessionToken),
  })

  if (error || data !== true) {
    return new NextResponse('ERP exchange denied', { status: 401 })
  }

  const response = NextResponse.redirect(new URL(`https://erp.urisacompresores.com${ERP_AUTH_BASE_PATH}/launch`), 302)
  response.headers.set('Cache-Control', 'private, no-store')
  response.headers.set('Referrer-Policy', 'no-referrer')

  response.cookies.delete(ERP_BOOTSTRAP_COOKIE)
  response.cookies.set(ERP_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ERP_SESSION_MAX_AGE_SECONDS,
  })

  return response
}
