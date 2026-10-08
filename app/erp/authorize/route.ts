import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fixedErpExchangeUrl } from '@/lib/erp/config'
import { hashOpaqueToken, isOpaqueToken, newOpaqueToken } from '@/lib/erp/token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const nonce = request.nextUrl.searchParams.get('nonce')
  if (!isOpaqueToken(nonce)) {
    return new NextResponse('Invalid ERP authorization request', { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    const login = new URL('/login', request.url)
    login.searchParams.set('redirectTo', `/erp/authorize?nonce=${encodeURIComponent(nonce)}`)
    return NextResponse.redirect(login, 302)
  }

  const code = newOpaqueToken()
  const { data, error } = await supabase.rpc('erp_issue_login_code', {
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
