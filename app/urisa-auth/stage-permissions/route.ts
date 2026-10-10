import { NextResponse, type NextRequest } from 'next/server'
import { ERP_FULL_STAGE } from '@/lib/erp/config'
import { serverRpc } from '@/lib/erp/server-rpc'
import { isOpaqueToken } from '@/lib/erp/token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Grant = {
  page_name: string
  appsmith_page: string | null
  can_view: boolean
  can_edit: boolean
  is_admin: boolean
  full_name: string | null
  email: string
}

const securityHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
}

export async function POST(request: NextRequest) {
  // This route is only for the independently compiled SSO STAGE process.
  if (!ERP_FULL_STAGE) {
    return new NextResponse(null, { status: 404, headers: securityHeaders })
  }
  // Refuse oversized requests before parsing. This endpoint needs one short
  // opaque token only and must never proxy arbitrary SQL or RPC names.
  const lengthHeader = request.headers.get('content-length')
  if (lengthHeader && Number(lengthHeader) > 1024) {
    return new NextResponse(null, { status: 413, headers: securityHeaders })
  }
  let body: unknown
  try {
    const raw = await request.text()
    if (raw.length > 1024) {
      return new NextResponse(null, { status: 413, headers: securityHeaders })
    }
    body = JSON.parse(raw)
  } catch {
    return new NextResponse(null, { status: 400, headers: securityHeaders })
  }

  const token = body && typeof body === 'object' && 'erp_token' in body
    ? (body as { erp_token: unknown }).erp_token
    : null
  if (!isOpaqueToken(token)) {
    return new NextResponse(null, { status: 401, headers: securityHeaders })
  }

  try {
    const { data, error } = await serverRpc<Grant[]>(
      'erp_general_page_grants_v1',
      { p_app_token: token },
    )
    if (error || !Array.isArray(data)) {
      return new NextResponse(null, { status: 503, headers: securityHeaders })
    }

    // Validity and revocation are verified inside the RPC. Never trust an
    // email, admin flag, page name or session identifier supplied by clients.
    const grants = data.filter(row => row.can_view === true &&
      typeof row.appsmith_page === 'string' && row.appsmith_page.length > 0)
    if (!grants.length) {
      return new NextResponse(null, { status: 401, headers: securityHeaders })
    }

    return NextResponse.json({ grants }, { headers: securityHeaders })
  } catch {
    return new NextResponse(null, { status: 503, headers: securityHeaders })
  }
}
