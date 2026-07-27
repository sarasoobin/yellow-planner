import { createClient } from '@/lib/supabase/server'
import { ItemList } from '@/components/item-list'
import { TallyMark } from '@/components/tally-mark'
import { yearFirstDay } from '@/lib/dates'
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
  const yearDate = yearFirstDay(year)

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
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-14 md:py-20">
      <p className="text-6xl leading-none font-bold tracking-tight text-ink md:text-7xl">
        {year}
      </p>

      <div className="mt-10 w-full max-w-md">
        <div className="mb-3 flex items-baseline justify-between border-b border-rule pb-2">
          <h1 className="text-sm font-semibold tracking-[0.08em] text-ink">
            올해의 목표
          </h1>
          {items.length > 0 && (
            <span className="text-xs text-ink-faint">
              {items.length}개 중 {doneCount}개 달성
            </span>
          )}
        </div>

        <ItemList
          items={items}
          kind="year"
          date={yearDate}
          path="/cover"
          placeholder="올해 이루고 싶은 걸 적어보세요"
          emptyText="아직 적은 목표가 없습니다."
        />

        {doneCount > 0 && (
          <div className="mt-8 flex justify-center">
            <TallyMark count={doneCount} />
          </div>
        )}
      </div>
    </div>
  )
}
