import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isOpaqueToken } from '@/lib/erp/token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeAuthorizeTarget(value: string | null): string | null {
  if (!value) return null

  let parsed: URL
  try {
    parsed = new URL(value, 'https://portal.urisacompresores.com')
  } catch {
    return null
  }

  if (
    parsed.origin !== 'https://portal.urisacompresores.com' ||
    parsed.pathname !== '/erp/authorize'
  ) {
    return null
  }

  const nonce = parsed.searchParams.get('nonce')
  if (!isOpaqueToken(nonce)) return null

  return `/erp/authorize?nonce=${encodeURIComponent(nonce)}`
}

function htmlPage(redirectTo: string, invalid: boolean): string {
  const safeRedirect = redirectTo
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>URISA ERP</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f7f9;font-family:Arial,sans-serif;color:#111827}
    .card{width:min(420px,calc(100% - 32px));background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:34px;box-shadow:0 8px 28px rgba(0,0,0,.07)}
    h1{margin:0 0 8px;font-size:26px;text-align:center}
    p{margin:0 0 24px;color:#6b7280;text-align:center}
    label{display:block;margin:14px 0 6px;font-size:14px;font-weight:600}
    input{width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:16px}
    button{width:100%;margin-top:20px;padding:12px;border:0;border-radius:8px;background:#111827;color:#fff;font-size:16px;font-weight:700;cursor:pointer}
    .err{margin:0 0 16px;padding:10px 12px;border-radius:8px;background:#fef2f2;color:#991b1b;text-align:left;font-size:14px}
  </style>
</head>
<body>
  <main class="card">
    <h1>URISA ERP</h1>
    <p>Usa tu misma cuenta del portal</p>
    ${invalid ? '<div class="err">Correo o contraseña incorrectos.</div>' : ''}
    <form method="post" action="/erp/login" autocomplete="on">
      <input type="hidden" name="redirectTo" value="${safeRedirect}">
      <label for="email">Correo</label>
      <input id="email" name="email" type="email" autocomplete="username" required>
      <label for="password">Contraseña</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required>
      <button type="submit">Entrar al ERP</button>
    </form>
  </main>
</body>
</html>`
}

export async function GET(request: NextRequest) {
  const redirectTo = safeAuthorizeTarget(request.nextUrl.searchParams.get('redirectTo'))

  if (!redirectTo) {
    return new NextResponse('Invalid ERP login request', { status: 400 })
  }

  return new NextResponse(
    htmlPage(redirectTo, request.nextUrl.searchParams.get('error') === 'unauthorized'),
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  )
}

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const email = String(form.get('email') ?? '').trim().toLowerCase()
  const password = String(form.get('password') ?? '')
  const redirectTo = safeAuthorizeTarget(String(form.get('redirectTo') ?? ''))

  if (!email || !password || !redirectTo) {
    return new NextResponse('ERP login denied', { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.session) {
    const retry = new URL('https://portal.urisacompresores.com/erp/login')
    retry.searchParams.set('redirectTo', redirectTo)
    retry.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(retry, 303)
  }

  return NextResponse.redirect(
    new URL(redirectTo, 'https://portal.urisacompresores.com'),
    303,
  )
}
