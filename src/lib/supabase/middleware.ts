import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** 로그인해야만 들어갈 수 있는 경로 */
const PROTECTED_PREFIXES = ['/cover', '/month', '/week', '/note']

/**
 * 모든 요청마다 실행되어 두 가지를 한다.
 *  1. 만료가 임박한 로그인 세션을 갱신한다 (안 하면 사용자가 갑자기 로그아웃된다)
 *  2. 로그인 없이 보호 경로에 접근하면 /login 으로 돌려보낸다
 */
export async function updateSession(request: NextRequest) {
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
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // getUser()는 매번 Supabase 서버에 토큰을 검증받는다.
  // getSession()은 쿠키만 믿기 때문에 위조가 가능하다 — 보호 판정에는 반드시 getUser()를 쓴다.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))

  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    // 로그인 후 원래 가려던 곳으로 되돌려보내기 위해 기억해둔다
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 이미 로그인한 사람이 /login 에 오면 표지로 보낸다
  if (user && pathname === '/login') {
    const coverUrl = request.nextUrl.clone()
    coverUrl.pathname = '/cover'
    coverUrl.search = ''
    return NextResponse.redirect(coverUrl)
  }

  return supabaseResponse
}
