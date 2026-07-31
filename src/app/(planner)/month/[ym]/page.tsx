import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MonthBoard, type CalendarDay } from '@/components/month-board'
import { PaperBlock } from '@/components/paper-block'
import { StickerLayer } from '@/components/sticker-layer'
import { TallyMark } from '@/components/tally-mark'
import {
  EMPTY_BLOCK,
  blocksByDate,
  countChecked,
  countLines,
  toBlock,
} from '@/lib/blocks'
import {
  isInMonth,
  monthFirstDay,
  monthGrid,
  monthLabel,
  parseYearMonth,
  todayISO,
} from '@/lib/dates'
import type { Item } from '@/lib/types'

type Params = { params: Promise<{ ym: string }> }

export async function generateMetadata({ params }: Params) {
  const { ym } = await params
  return { title: `${monthLabel(ym)} · 正 PLANNER` }
}

export default async function MonthPage({ params }: Params) {
  const { ym } = await params
  if (!parseYearMonth(ym)) notFound()

  const grid = monthGrid(ym)
  const rangeStart = grid[0][0]
  const rangeEnd = grid[grid.length - 1][6]
  const firstDay = monthFirstDay(ym)
  const today = todayISO()
  const path = `/month/${ym}`

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: calendarData }, { data: asideData }] = await Promise.all([
    supabase
      .from('items')
      .select('*')
      .in('kind', ['event', 'task'])
      .gte('date', rangeStart)
      .lte('date', rangeEnd)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('items')
      .select('*')
      .in('kind', ['month', 'sticker'])
      .eq('date', firstDay)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  const calendarItems = (calendarData ?? []) as Item[]
  const events = blocksByDate(calendarItems.filter((i) => i.kind === 'event'))
  const tasks = blocksByDate(calendarItems.filter((i) => i.kind === 'task'))

  const asideItems = (asideData ?? []) as Item[]
  const memo = toBlock(asideItems.filter((i) => i.kind === 'month'))
  const stickers = asideItems.filter((i) => i.kind === 'sticker')
  const monthDone = countChecked(memo.content)

  // 격자에 필요한 것만 추려 넘긴다. 달력은 고른 날을 기억해야 해서
  // 클라이언트 컴포넌트다 (components/month-board.tsx)
  const weeks: CalendarDay[][] = grid.map((week) =>
    week.map((date) => ({
      date,
      block: events.get(date) ?? EMPTY_BLOCK,
      taskCount: countLines(tasks.get(date)?.content ?? ''),
      isToday: date === today,
      inMonth: isInMonth(date, ym),
    })),
  )

  return (
    <StickerLayer
      stickers={stickers}
      date={firstDay}
      path={path}
      className="flex flex-1 flex-col bg-paper md:flex-row"
    >
      {/*
        왼쪽 단 — 달력에 자리를 많이 내주려고 좁게 잡는다.
        폰에서는 달력이 먼저 와야 한다 (DESIGN.md §6). 달을 열자마자
        메모부터 보이면 달력을 보려고 스크롤을 내려야 한다.
      */}
      {/*
        폭은 글자가 몇 자쯤 들어가느냐로 정한다. 160px 에 16px 글자를 넣으니
        두세 글자마다 줄이 바뀌어 읽을 수가 없었다. 화면이 넓으면 더 넓게 준다.
      */}
      <aside className="order-2 flex shrink-0 flex-col border-t border-rule bg-frame/30 px-3 py-4 md:order-1 md:w-56 md:border-t-0 md:border-r xl:w-72">
        <h1 className="font-hand mb-2 text-4xl leading-none text-ink">
          {monthLabel(ym)}
        </h1>

        {/* 그냥 메모장이다. 체크할 게 생기면 `/` 로 네모를 그린다. */}
        <PaperBlock
          kind="month"
          date={firstDay}
          path={path}
          content={memo.content}
          color={memo.color}
          style={memo.style}
          minRows={12}
          placeholder="이 달에 잊지 말 것"
        />

        {monthDone > 0 && (
          <div className="mt-auto pt-8">
            <TallyMark count={monthDone} />
          </div>
        )}
      </aside>

      {/* 오른쪽 — 달력 */}
      <div className="order-1 flex min-w-0 flex-1 flex-col px-3 py-4 md:order-2 md:px-4">
        <MonthBoard weeks={weeks} ym={ym} path={path} today={today} />

        {/* 안내는 화면에 따라 다르다. 폰에서는 칸에 직접 적을 수 없다 */}
        <p className="mt-2 hidden text-[12px] text-ink-faint md:block">
          날짜 옆부터 바로 적으면 됩니다. 길어지면 다음 줄로 이어지고, 왼쪽{' '}
          <span className="text-accent">›</span> 나 날짜를 누르면 그 주의 주간
          페이지로 갑니다.
        </p>
        <p className="mt-2 text-[12px] text-ink-faint md:hidden">
          날짜를 누르면 아래에서 그 날을 적습니다. 왼쪽{' '}
          <span className="text-accent">›</span> 는 그 주의 주간 페이지로 갑니다.
        </p>
      </div>
    </StickerLayer>
  )
}
