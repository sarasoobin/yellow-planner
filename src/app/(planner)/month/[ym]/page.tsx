import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CalendarCell } from '@/components/calendar-cell'
import { ItemList } from '@/components/item-list'
import { StickerLayer } from '@/components/sticker-layer'
import { TallyMark } from '@/components/tally-mark'
import {
  WEEKDAY_LABELS,
  dayNumber,
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

  // 달력에 그릴 것(일정·할일)과 왼쪽 단에 그릴 것(이 달 메모)을 한 번에 가져온다
  const [{ data: calendarData }, { data: monthData }] = await Promise.all([
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
  const asideItems = (monthData ?? []) as Item[]
  const monthItems = asideItems.filter((i) => i.kind === 'month')
  const stickers = asideItems.filter((i) => i.kind === 'sticker')

  // 날짜별로 미리 묶어둔다. 칸마다 배열을 훑으면 칸 수 × 항목 수가 된다.
  const eventsByDate = new Map<string, Item[]>()
  const taskCountByDate = new Map<string, number>()
  for (const item of calendarItems) {
    if (item.kind === 'event') {
      const list = eventsByDate.get(item.date) ?? []
      list.push(item)
      eventsByDate.set(item.date, list)
    } else {
      taskCountByDate.set(item.date, (taskCountByDate.get(item.date) ?? 0) + 1)
    }
  }

  const monthDone = monthItems.filter((i) => i.is_done).length

  return (
    <StickerLayer
      stickers={stickers}
      date={firstDay}
      path={path}
      className="flex flex-1 flex-col bg-paper md:flex-row"
    >
      {/* 왼쪽 단 — 달력에 자리를 많이 내주려고 좁게 잡는다 */}
      <aside className="flex shrink-0 flex-col border-b border-rule bg-frame/30 px-3 py-4 md:w-40 md:border-r md:border-b-0">
        <h1 className="mb-3 text-2xl font-bold text-ink">{monthLabel(ym)}</h1>

        {/* 여기는 자유롭게 적는 칸이다. 체크할 게 생기면 줄마다 네모를 붙인다. */}
        <ItemList
          items={monthItems}
          kind="month"
          date={firstDay}
          path={path}
          minRows={5}
        />

        {monthDone > 0 && (
          <div className="mt-auto pt-8">
            <TallyMark count={monthDone} />
          </div>
        )}
      </aside>

      {/* 오른쪽 — 달력 */}
      <div className="flex min-w-0 flex-1 flex-col px-3 py-4 md:px-4 md:py-4">
        <div className="mb-1 flex pl-7">
          {WEEKDAY_LABELS.map((label, i) => (
            <div
              key={label}
              className={`flex-1 pb-1 text-center text-[11px] font-semibold ${
                i === 6 ? 'text-today' : 'text-ink-faint'
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* 남는 세로 공간을 주(週) 수만큼 나눠 가져 칸이 최대한 커진다 */}
        <div className="flex flex-1 flex-col border-t border-l border-rule">
          {grid.map((week) => (
            <div key={week[0]} className="flex flex-1">
              {/* 주차 버튼 — 그 주의 주간 페이지로 (DESIGN.md §5-3) */}
              <Link
                href={`/week/${week[0]}`}
                aria-label={`${dayNumber(week[0])}일 주간 페이지로 이동`}
                className="flex w-7 shrink-0 items-center justify-center border-r border-b border-rule text-ink-faint transition-colors hover:bg-frame/50 hover:text-accent"
              >
                ›
              </Link>

              {week.map((date) => (
                <CalendarCell
                  key={date}
                  date={date}
                  weekStart={week[0]}
                  events={eventsByDate.get(date) ?? []}
                  taskCount={taskCountByDate.get(date) ?? 0}
                  isToday={date === today}
                  inMonth={isInMonth(date, ym)}
                  path={path}
                />
              ))}
            </div>
          ))}
        </div>

        <p className="mt-2 text-[11px] text-ink-faint">
          칸을 누르면 날짜 옆에 바로 적을 수 있습니다. 왼쪽{' '}
          <span className="text-accent">›</span> 나 날짜를 누르면 그 주의 주간
          페이지로 갑니다.
        </p>
      </div>
    </StickerLayer>
  )
}
