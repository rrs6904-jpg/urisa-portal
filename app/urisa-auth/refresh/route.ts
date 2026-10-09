import { NextResponse, type NextRequest } from 'next/server'
import { ERP_SESSION_COOKIE } from '@/lib/erp/config'
import { serverRpc } from '@/lib/erp/server-rpc'
import { hashOpaqueToken, isOpaqueToken } from '@/lib/erp/token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ERP_ORIGIN = 'https://erp.urisacompresores.com'
const NO_STORE = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
}

function deny(status: number): NextResponse {
  return NextResponse.json({ ok: false }, { status, headers: NO_STORE })
}

// Browser-only, same-origin renewal. Called by the PILOT Appsmith JSObject.
// Never sends a token in the URL and never returns new bearer secrets.
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== ERP_ORIGIN ||
      (request.headers.get('sec-fetch-site') &&
       request.headers.get('sec-fetch-site') !== 'same-origin')) {
    return deny(403)
  }

  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return deny(415)
  }

  const sessionToken = request.cookies.get(ERP_SESSION_COOKIE)?.value
  if (!isOpaqueToken(sessionToken)) return deny(401)

  let appToken: unknown
  try {
    const body = await request.json()
    appToken = body?.app_token
  } catch {
    return deny(400)
  }

  if (!isOpaqueToken(appToken)) return deny(401)

  const { data, error } = await serverRpc<boolean>('erp_refresh_appsmith_token_v1', {
    p_session_hash: hashOpaqueToken(sessionToken),
    p_app_token_hash: hashOpaqueToken(appToken),
  })

  if (error || data !== true) return deny(401)

  return NextResponse.json({ ok: true, lease_seconds: 900 }, {
    status: 200,
    headers: NO_STORE,
  })
}
