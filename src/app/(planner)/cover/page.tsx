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
    // 표지는 책의 시작이라 종이 대신 표지색으로 꽉 채운다.
    // 노란 바탕에서는 기본 괘선이 묻혀서 줄 색만 한 톤 진하게 바꾼다.
    <div
      className="flex flex-1 flex-col items-center justify-center bg-frame px-6 py-12"
      style={{ '--color-rule': '#E0C35F' } as React.CSSProperties}
    >
      <p className="text-6xl leading-none font-bold tracking-tight text-ink md:text-7xl">
        {year}
      </p>

      <div className="mt-12 w-full max-w-sm">
        <div className="mb-2 flex items-baseline justify-between">
          <h1 className="text-sm font-semibold tracking-[0.1em] text-ink">
            올해의 목표
          </h1>
          {items.length > 0 && (
            <span className="text-xs text-ink/55">
              {items.length}개 중 {doneCount}개
            </span>
          )}
        </div>

        <ItemList
          items={items}
          kind="year"
          date={yearDate}
          path="/cover"
          minRows={6}
        />

        {doneCount > 0 && (
          <div className="mt-10 flex justify-center">
            <TallyMark count={doneCount} />
          </div>
        )}
      </div>
    </div>
  )
}
