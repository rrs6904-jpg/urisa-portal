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
  <title>URISA ERP · Iniciar sesión</title>
  <style>
    :root{color-scheme:light}
    *{box-sizing:border-box}
    html,body{margin:0;min-height:100%;font-family:Arial,Helvetica,sans-serif}
    body{
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:24px;
      background:#070779;
      color:#111827;
    }
    .shell{width:100%;max-width:430px}
    .card{
      width:100%;
      background:#fff;
      border-radius:12px;
      padding:30px 30px 24px;
      box-shadow:0 18px 55px rgba(0,0,0,.24);
    }
    .brand{
      display:flex;
      justify-content:center;
      padding-bottom:18px;
      margin-bottom:18px;
      border-bottom:1px solid #e7e9ef;
    }
    .brand img{
      display:block;
      width:min(190px,68%);
      height:auto;
      object-fit:contain;
    }
    h1{
      margin:0 0 4px;
      font-size:23px;
      line-height:1.2;
      font-weight:800;
      letter-spacing:-.02em;
    }
    .subtitle{
      margin:0 0 22px;
      color:#6b7280;
      font-size:13px;
    }
    .err{
      margin:0 0 14px;
      padding:10px 12px;
      border:1px solid #fecaca;
      border-radius:7px;
      background:#fef2f2;
      color:#991b1b;
      font-size:13px;
    }
    label{
      display:block;
      margin:13px 0 6px;
      font-size:12px;
      font-weight:700;
      color:#111827;
    }
    input{
      width:100%;
      height:40px;
      padding:0 11px;
      border:1px solid #cfd4dc;
      border-radius:5px;
      background:#fff;
      color:#111827;
      font-size:14px;
      outline:none;
    }
    input:focus{
      border-color:#1111a4;
      box-shadow:0 0 0 2px rgba(17,17,164,.10);
    }
    button{
      width:100%;
      height:42px;
      margin-top:18px;
      border:0;
      border-radius:5px;
      background:#080886;
      color:#fff;
      font-size:14px;
      font-weight:800;
      cursor:pointer;
    }
    button:hover{background:#05056d}
    .forgot{
      margin:12px 0 0;
      text-align:center;
      color:#535a68;
      font-size:11px;
    }
    .notice{
      display:flex;
      gap:8px;
      align-items:flex-start;
      margin-top:20px;
      padding-top:16px;
      border-top:1px solid #e7e9ef;
      color:#626977;
      font-size:10px;
      line-height:1.45;
    }
    .lock{
      flex:0 0 auto;
      width:13px;
      height:13px;
      margin-top:1px;
      color:#0b0b83;
    }
    footer{
      margin-top:14px;
      text-align:center;
      color:rgba(255,255,255,.78);
      font-size:10px;
      letter-spacing:.01em;
    }
    @media (max-width:520px){
      body{padding:16px}
      .card{padding:25px 22px 21px}
      h1{font-size:21px}
    }
  </style>
</head>
<body>
  <div class="shell">
    <main class="card">
      <div class="brand">
        <img src="/logo-uri.png" alt="URISA Compresores">
      </div>
      <h1>Iniciar sesión</h1>
      <p class="subtitle">ERP · Operación Monterrey</p>
      ${invalid ? '<div class="err">Correo o contraseña incorrectos.</div>' : ''}
      <form method="post" action="/erp/login" autocomplete="on">
        <input type="hidden" name="redirectTo" value="${safeRedirect}">
        <label for="email">Correo electrónico</label>
        <input id="email" name="email" type="email" autocomplete="username" placeholder="tu.nombre@urisacompresores.com" required autofocus>
        <label for="password">Contraseña</label>
        <input id="password" name="password" type="password" autocomplete="current-password" placeholder="••••••••" required>
        <button type="submit">Entrar</button>
      </form>
      <div class="forgot">¿Olvidaste tu contraseña?</div>
      <div class="notice">
        <svg class="lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="5" y="10" width="14" height="10" rx="2"></rect>
          <path d="M8 10V7a4 4 0 0 1 8 0v3"></path>
        </svg>
        <span>Acceso solo para personal autorizado de URISA. Si no tienes cuenta, pide acceso a Dirección.</span>
      </div>
    </main>
    <footer>URISA Compresores · Monterrey, N.L. · 2026</footer>
  </div>
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
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self' https://erp.urisacompresores.com; base-uri 'none'; frame-ancestors 'none'",
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
  console.log('[ERP_LOGIN]', new Date().toISOString(), 'attempt', email)

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.session) {
    console.log('[ERP_LOGIN]', new Date().toISOString(), 'denied', email)
    const retry = new URL('https://portal.urisacompresores.com/erp/login')
    retry.searchParams.set('redirectTo', redirectTo)
    retry.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(retry, 303)
  }

  console.log('[ERP_LOGIN]', new Date().toISOString(), 'success', email)
  return NextResponse.redirect(
    new URL(redirectTo, 'https://portal.urisacompresores.com'),
    303,
  )
}
