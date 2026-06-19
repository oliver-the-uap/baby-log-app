import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Next.js 16 "proxy" convention (formerly middleware): refreshes the Supabase
// session on every request and gates access to authenticated routes.
export async function proxy(req: NextRequest) {
  const res = NextResponse.next({ request: req })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    },
  )
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = req.nextUrl
  const isPublic =
    pathname.startsWith('/login') || pathname.startsWith('/api') || pathname.startsWith('/_next')
  if (!user && !isPublic) return NextResponse.redirect(new URL('/login', req.url))
  if (user && pathname === '/login') return NextResponse.redirect(new URL('/', req.url))
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw.js).*)'],
}
