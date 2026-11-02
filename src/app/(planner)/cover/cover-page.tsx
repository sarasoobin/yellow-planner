import { createClient } from '@/lib/supabase/server'
import { PaperBlock } from '@/components/paper-block'
import { StickerLayer } from '@/components/sticker-layer'
import { TallyMark } from '@/components/tally-mark'
import { MonthlyProgress } from '@/components/monthly-progress'
import { YearNavigation } from '@/components/year-navigation'
import { countBoxes, countChecked, toBlock } from '@/lib/blocks'
import { yearFirstDay } from '@/lib/dates'
import type { Item } from '@/lib/types'

/** 한 해의 표지. 연도별 목표·스티커·달성률은 각각 독립적으로 저장된다. */
export default async function CoverPage({
  year,
  path = `/cover/${year}`,
}: {
  year: number
  /** /cover에서도 저장 뒤 현재 장을 다시 그릴 수 있도록 실제 주소를 받는다. */
  path?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 미들웨어가 이미 막고 있지만, 서버 컴포넌트에서도 한 번 더 확인한다.
  if (!user) return null

  const yearDate = yearFirstDay(year)
  const [{ data }, { data: yearRows }] = await Promise.all([
    // 올해 목표 칸과 이 페이지에 붙인 스티커
    supabase
      .from('items')
      .select('*')
      .in('kind', ['year', 'sticker'])
      .eq('date', yearDate)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    // 월별 달성률에 쓸 해당 연도치 전부.
    // 표지의 연간 목표(year)는 1월 1일에 저장되므로 빼야 1월에 섞이지 않는다.
    supabase
      .from('items')
      .select('date, content')
      .in('kind', ['month', 'event', 'task', 'daily'])
      .gte('date', yearDate)
      .lte('date', `${year}-12-31`),
  ])

  const all = (data ?? []) as Item[]
  const block = toBlock(all.filter((i) => i.kind === 'year'))
  const stickers = all.filter((i) => i.kind === 'sticker')
  const doneCount = countChecked(block.content)

  // 1~12월 순서로 네모 개수를 센다
  const months = Array.from({ length: 12 }, () => ({ done: 0, total: 0 }))
  for (const row of yearRows ?? []) {
    const index = Number(row.date.slice(5, 7)) - 1
    if (index < 0 || index > 11) continue
    const counted = countBoxes(row.content)
    months[index].done += counted.done
    months[index].total += counted.total
  }

  return (
    // 가운데는 다른 페이지와 같은 종이색. 노란 표지는 바깥 프레임이 맡는다.
    <StickerLayer
      stickers={stickers}
      date={yearDate}
      path={path}
      className="vintage-paper flex flex-1 flex-col items-center justify-center bg-paper px-6 py-12"
    >
      <YearNavigation year={year} />

      <div className="mt-12 w-full max-w-sm">
        <h2 className="font-hand mb-2 text-xl leading-none text-ink-soft md:text-2xl">
          Yearly intentions
        </h2>

        <PaperBlock
          kind="year"
          date={yearDate}
          path={path}
          content={block.content}
          color={block.color}
          style={block.style}
          minRows={8}
          fontSize={16}
          placeholder="Write what you wish to make of this year…"
        />

        {doneCount > 0 && (
          <div className="mt-10 flex justify-center">
            <TallyMark count={doneCount} />
          </div>
        )}

        {/* 통계 페이지 대신 표지에서 한 해를 한눈에 (PRODUCT.md §5) */}
        <div className="mt-12">
          <MonthlyProgress year={year} months={months} />
        </div>
      </div>
    </StickerLayer>
  )
}
