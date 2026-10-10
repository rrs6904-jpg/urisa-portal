import { NextResponse, type NextRequest } from 'next/server'
import { ERP_SESSION_COOKIE } from '@/lib/erp/config'
import { serverRpc } from '@/lib/erp/server-rpc'
import { hashOpaqueToken, isOpaqueToken } from '@/lib/erp/token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Used by Nginx internal auth_request only. All cookie authority stays on
// the server; Appsmith JSObject never receives or forwards this cookie.
export async function GET(request: NextRequest) {
  const headers = {
    'Cache-Control': 'private, no-store, max-age=0',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  }
  const token = request.cookies.get(ERP_SESSION_COOKIE)?.value
  if (!isOpaqueToken(token)) {
    return new NextResponse(null, { status: 401, headers })
  }
  try {
    const { data, error } = await serverRpc<boolean>('erp_general_validate_rolling_v1', {
      p_session_hash: hashOpaqueToken(token),
    })
    return new NextResponse(null, {
      status: !error && data === true ? 204 : 401,
      headers,
    })
  } catch {
    return new NextResponse(null, { status: 401, headers })
  }
}
