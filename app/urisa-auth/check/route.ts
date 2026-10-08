import { NextResponse, type NextRequest } from 'next/server'
import { ERP_SESSION_COOKIE } from '@/lib/erp/config'
import { serverRpc } from '@/lib/erp/server-rpc'
import { hashOpaqueToken, isOpaqueToken } from '@/lib/erp/token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get(ERP_SESSION_COOKIE)?.value
  if (!isOpaqueToken(sessionToken)) {
    return new NextResponse(null, {
      status: 401,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  }

  const { data, error } = await serverRpc<boolean>('erp_validate_session', {
    p_session_hash: hashOpaqueToken(sessionToken),
  })

  return new NextResponse(null, {
    status: !error && data === true ? 204 : 401,
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
