import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * 서버(서버 컴포넌트 / Server Action)에서 쓰는 Supabase 클라이언트.
 *
 * Next.js 16에서 cookies()는 async 이므로 반드시 await 해야 한다.
 * 그래서 이 함수도 async 이고, 쓸 때 `const supabase = await createClient()` 형태가 된다.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // 서버 컴포넌트에서는 쿠키를 쓸 수 없어 여기서 예외가 난다.
            // 세션 갱신은 middleware가 담당하므로 무시해도 안전하다.
          }
        },
      },
    },
  )
}
