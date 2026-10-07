import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_ROUTES = ['/admin']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Siempre llamar getUser() para refrescar tokens de sesión
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Copia cookies de sesión a cualquier respuesta de redirección
  function withAuthCookies(response: NextResponse): NextResponse {
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie)
    })
    return response
  }

  // Usuario autenticado en /login → redirigir al dashboard
  if (user && pathname === '/login') {
    return withAuthCookies(
      NextResponse.redirect(new URL('/dashboard', request.url))
    )
  }

  // Rutas públicas — validación exacta, sin startsWith
  if (pathname === '/login' || pathname === '/unauthorized') {
    return supabaseResponse
  }

  // Pilot API responds as JSON; never redirect fetch requests to the login HTML.
  if (!user && pathname === '/api/pilot/operations/me') {
    return withAuthCookies(NextResponse.json(
      { error: 'unauthenticated' },
      { status: 401, headers: { 'Cache-Control': 'no-store, private' } }
    ))
  }

  // Sin sesión → redirigir a login preservando destino
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return withAuthCookies(NextResponse.redirect(loginUrl))
  }

  // Rutas solo admin → verificar rol en DB
  if (ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return withAuthCookies(
        NextResponse.redirect(
          new URL('/unauthorized?reason=unauthorized', request.url)
        )
      )
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
