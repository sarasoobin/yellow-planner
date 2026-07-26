import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/actions/auth'
import { ItemList } from '@/components/item-list'
import type { Item } from '@/lib/types'

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

  const year = new Date().getFullYear()
  // 연간 목표는 그 해 1월 1일로 저장한다 (schema.sql 주석 참고)
  const yearDate = `${year}-01-01`

  const { data } = await supabase
    .from('items')
    .select('*')
    .eq('kind', 'year')
    .eq('date', yearDate)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  const items = (data ?? []) as Item[]
  const doneCount = items.filter((i) => i.is_done).length

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <header className="mb-10 flex items-center justify-between">
        <h1 className="text-xl font-bold">正 PLANNER</h1>
        <form action={signOut}>
          <button className="text-sm text-neutral-500 underline underline-offset-4">
            로그아웃
          </button>
        </form>
      </header>

      <p className="mb-1 text-5xl font-bold tracking-tight">{year}</p>
      <p className="mb-8 text-sm text-neutral-500">
        {user.email}
        {items.length > 0 && ` · ${items.length}개 중 ${doneCount}개 달성`}
      </p>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-500">
          올해의 목표
        </h2>
        <ItemList
          items={items}
          kind="year"
          date={yearDate}
          path="/cover"
          placeholder="올해 이루고 싶은 걸 적어보세요"
          emptyText="아직 적은 목표가 없습니다."
        />
      </section>
    </main>
  )
}
