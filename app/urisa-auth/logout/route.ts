import { NextResponse, type NextRequest } from 'next/server'
import { ERP_SESSION_COOKIE, ERP_PORTAL_LOGOUT_PATH } from '@/lib/erp/config'
import { serverRpc } from '@/lib/erp/server-rpc'
import { hashOpaqueToken, isOpaqueToken } from '@/lib/erp/token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ERP_SESSION_COOKIE)?.value

  if (isOpaqueToken(token)) {
    await serverRpc<boolean>('erp_revoke_session', {
      p_session_hash: hashOpaqueToken(token),
    })
  }

  const target = new URL(`https://portal.urisacompresores.com${ERP_PORTAL_LOGOUT_PATH}`)
  const response = NextResponse.redirect(target, 302)
  response.headers.set('Cache-Control', 'private, no-store')
  response.cookies.delete(ERP_SESSION_COOKIE)
  return response
}
