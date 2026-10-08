import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fixedErpExchangeUrl } from '@/lib/erp/config'
import { serverRpc } from '@/lib/erp/server-rpc'
import { hashOpaqueToken, isOpaqueToken, newOpaqueToken } from '@/lib/erp/token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function sessionIdFromAccessToken(accessToken: string | undefined): string | null {
  if (!accessToken) return null

  const parts = accessToken.split('.')
  if (parts.length !== 3) return null

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    const sessionId = typeof payload?.session_id === 'string' ? payload.session_id : ''
    return UUID_RE.test(sessionId) ? sessionId : null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const nonce = request.nextUrl.searchParams.get('nonce')
  if (!isOpaqueToken(nonce)) {
    return new NextResponse('Invalid ERP authorization request', { status: 400 })
  }

  const supabase = await createClient()

  // getUser() asks Supabase Auth to verify the live session.
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    const login = new URL('/erp/login', request.url)
    login.searchParams.set('redirectTo', `/erp/authorize?nonce=${encodeURIComponent(nonce)}`)
    return NextResponse.redirect(login, 302)
  }

  // After getUser() has validated the session, getSession() is used only to
  // recover the session_id claim from the same server-side cookie state.
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  const sourceSessionId = sessionIdFromAccessToken(session?.access_token)

  if (sessionError || !sourceSessionId) {
    return NextResponse.redirect(new URL('/login?error=unauthorized', request.url), 302)
  }

  const code = newOpaqueToken()
  const { data, error } = await serverRpc<boolean>('erp_issue_login_code', {
    p_user_id: user.id,
    p_source_session_id: sourceSessionId,
    p_code_hash: hashOpaqueToken(code),
    p_browser_nonce_hash: hashOpaqueToken(nonce),
  })

  if (error || data !== true) {
    return NextResponse.redirect(new URL('/unauthorized?reason=erp', request.url), 302)
  }

  const response = NextResponse.redirect(fixedErpExchangeUrl(code), 302)
  response.headers.set('Cache-Control', 'private, no-store')
  response.headers.set('Referrer-Policy', 'no-referrer')
  return response
}
