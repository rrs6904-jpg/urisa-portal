import { NextResponse, type NextRequest } from 'next/server'
import { newOpaqueToken } from '@/lib/erp/token'
import { ERP_BOOTSTRAP_COOKIE, ERP_PORTAL_AUTHORIZE_PATH } from '@/lib/erp/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BOOTSTRAP_COOKIE = ERP_BOOTSTRAP_COOKIE

export async function GET(request: NextRequest) {
  const portalAuthorize = process.env.URISA_ERP_PORTAL_AUTHORIZE_URL

  let authorizeUrl: URL
  try {
    authorizeUrl = new URL(portalAuthorize ?? '')
  } catch {
    return new NextResponse('ERP authentication is not configured', { status: 503 })
  }

  if (
    authorizeUrl.protocol !== 'https:' ||
    authorizeUrl.hostname !== 'portal.urisacompresores.com' ||
    authorizeUrl.pathname !== ERP_PORTAL_AUTHORIZE_PATH
  ) {
    return new NextResponse('ERP authentication is not configured', { status: 503 })
  }

  const nonce = newOpaqueToken()
  authorizeUrl.search = ''
  authorizeUrl.searchParams.set('nonce', nonce)

  const response = NextResponse.redirect(authorizeUrl, 302)
  response.headers.set('Cache-Control', 'private, no-store')
  response.cookies.set(BOOTSTRAP_COOKIE, nonce, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  })

  return response
}
