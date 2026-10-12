import { NextResponse, type NextRequest } from 'next/server'
import { ERP_FULL_STAGE, ERP_HOST, ERP_SESSION_COOKIE } from '@/lib/erp/config'
import { hashOpaqueToken, isOpaqueToken } from '@/lib/erp/token'
import { serverRpc } from '@/lib/erp/server-rpc'
import { evaluateStageCandidate, type Candidate, type VerifiedGrant } from '@/lib/erp/stage-isolation-policy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'Vary': 'Cookie',
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }

// Diagnostic endpoint ONLY: never use with nginx auth_request; never proxies to Appsmith.
// HTTP 200 means the diagnostic completed, NOT permission to execute an operation.
export async function POST(request: NextRequest) {
  if (!ERP_FULL_STAGE || process.env.URISA_STAGE_ISOLATION_PROBE !== '1') {
    return new NextResponse(null, { status: 404, headers })
  }
  const origin = request.headers.get('origin')
  const site = request.headers.get('sec-fetch-site')
  if ((origin && origin !== `https://${ERP_HOST}`) ||
      (site && site !== 'same-origin' && site !== 'none')) {
    return new NextResponse(null, { status: 403, headers })
  }
  const token = request.cookies.get(ERP_SESSION_COOKIE)?.value
  if (!isOpaqueToken(token)) return new NextResponse(null, { status: 401, headers })
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    return new NextResponse(null, { status: 415, headers })
  }
  // Bound actual bytes even when Content-Length is absent or forged.
  const reader = request.body?.getReader()
  if (!reader) return new NextResponse(null, { status: 400, headers })
  let candidate: Candidate
  try {
    let length = 0
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > 4096) {
        await reader.cancel()
        return new NextResponse(null, { status: 413, headers })
      }
      chunks.push(value)
    }
    candidate = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) ||
        Object.keys(candidate).some(k => !['method', 'target', 'actionId', 'viewMode'].includes(k))) {
      return new NextResponse(null, { status: 400, headers })
    }
  } catch { return new NextResponse(null, { status: 400, headers }) }
  try {
    const { data, error } = await serverRpc<VerifiedGrant[]>('erp_general_session_page_grants_v1', {
      p_session_hash: hashOpaqueToken(token),
    })
    if (error || !Array.isArray(data)) return new NextResponse(null, { status: 503, headers })
    const grants = data.filter(g => g && typeof g.appsmith_page === 'string' && g.can_view === true)
    if (!grants.length) return new NextResponse(null, { status: 401, headers })
    return NextResponse.json(evaluateStageCandidate(candidate, grants), { status: 200, headers })
  } catch { return new NextResponse(null, { status: 503, headers }) }
}
