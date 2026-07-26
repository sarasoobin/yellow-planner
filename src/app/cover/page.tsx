import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/actions/auth'

export const metadata = {
  title: '표지 · 正 PLANNER',
}

export default async function CoverPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 미들웨어가 이미 막고 있지만, 서버 컴포넌트에서도 한 번 더 확인한다.
  if (!user) return null

  return (
    <main className="mx-auto max-w-2xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">正 PLANNER</h1>
        <form action={signOut}>
          <button className="text-sm text-neutral-500 underline underline-offset-4">
            로그아웃
          </button>
        </form>
      </header>

      <p className="mb-2 text-sm text-neutral-500">로그인 계정</p>
      <p className="mb-8 font-mono text-sm">{user.email}</p>

      <div className="rounded border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-400">
        여기에 올해의 목표가 들어갑니다
      </div>
    </main>
  )
}
