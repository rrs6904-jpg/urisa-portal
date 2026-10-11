import { NextResponse, type NextRequest } from 'next/server'
import { ERP_FULL_STAGE, ERP_SESSION_COOKIE, ERP_HOST } from '@/lib/erp/config'
import { serverRpc } from '@/lib/erp/server-rpc'
import { hashOpaqueToken, isOpaqueToken } from '@/lib/erp/token'

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

const headers = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Vary': 'Cookie',
}

export async function GET(request: NextRequest) {
  // Stage only. No URL bearer, no database connection exposed to Appsmith.
  if (!ERP_FULL_STAGE) {
    return new NextResponse(null, { status: 404, headers })
  }

  // Only same-origin browser use is intended. Do not enable CORS.
  const origin = request.headers.get('origin')
  if (origin && origin !== `https://${ERP_HOST}`) {
    return new NextResponse(null, { status: 403, headers })
  }
  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return new NextResponse(null, { status: 403, headers })
  }

  const sessionToken = request.cookies.get(ERP_SESSION_COOKIE)?.value
  if (!isOpaqueToken(sessionToken)) {
    return new NextResponse(null, { status: 401, headers })
  }

  try {
    const { data, error } = await serverRpc<Grant[]>(
      'erp_general_session_page_grants_v1',
      { p_session_hash: hashOpaqueToken(sessionToken) },
    )
    if (error || !Array.isArray(data)) {
      return new NextResponse(null, { status: 503, headers })
    }
    // Keep only active physical pages returned by the DB authorization function.
    const grants = data.filter((row): row is Grant =>
      row !== null &&
      typeof row === 'object' &&
      row.can_view === true &&
      typeof row.appsmith_page === 'string' &&
      row.appsmith_page.length > 0 &&
      typeof row.email === 'string'
    )
    if (!grants.length) {
      return new NextResponse(null, { status: 401, headers })
    }
    const response = NextResponse.json({
      grants,
      physical_page_count: grants.length,
      home_allowed: true,
    }, { status: 200, headers })
    return response
  } catch {
    return new NextResponse(null, { status: 503, headers })
  }
}
