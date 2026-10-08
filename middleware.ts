import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_ROUTES = ['/admin']
const ERP_AUTH_PREFIX = '/urisa-auth/'

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

  const { pathname } = request.nextUrl

  // ERP perimeter endpoints authenticate with ERP-specific cookies/server RPCs.
  // Nginx exposes these only on erp.urisacompresores.com.
  if (pathname.startsWith(ERP_AUTH_PREFIX)) {
    supabaseResponse.headers.set('Cache-Control', 'private, no-store')
    return supabaseResponse
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  function withAuthCookies(response: NextResponse): NextResponse {
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie)
    })
    return response
  }

  if (user && pathname === '/login') {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo')
    if (!redirectTo) {
      return withAuthCookies(
        NextResponse.redirect(new URL('/dashboard', request.url))
      )
    }
  }

  if (pathname === '/login' || pathname === '/unauthorized') {
    return supabaseResponse
  }

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set(
      'redirectTo',
      `${pathname}${request.nextUrl.search}`
    )
    return withAuthCookies(NextResponse.redirect(loginUrl))
  }

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
