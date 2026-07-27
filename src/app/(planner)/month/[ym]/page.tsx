import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CalendarCell } from '@/components/calendar-cell'
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
      <aside className="order-2 flex shrink-0 flex-col border-t border-rule bg-frame/30 px-3 py-4 md:order-1 md:w-40 md:border-t-0 md:border-r">
        <h1 className="mb-3 text-2xl font-bold text-ink">{monthLabel(ym)}</h1>

        {/* 그냥 메모장이다. 체크할 게 생기면 `/` 로 네모를 그린다. */}
        <PaperBlock
          kind="month"
          date={firstDay}
          path={path}
          content={memo.content}
          color={memo.color}
          style={memo.style}
          minRows={12}
        />

        {monthDone > 0 && (
          <div className="mt-auto pt-8">
            <TallyMark count={monthDone} />
          </div>
        )}
      </aside>

      {/* 오른쪽 — 달력 */}
      <div className="order-1 flex min-w-0 flex-1 flex-col px-3 py-4 md:order-2 md:px-4">
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
            <div key={week[0]} className="flex min-h-[88px] flex-1">
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
                  block={events.get(date) ?? EMPTY_BLOCK}
                  taskCount={countLines(tasks.get(date)?.content ?? '')}
                  isToday={date === today}
                  inMonth={isInMonth(date, ym)}
                  path={path}
                />
              ))}
            </div>
          ))}
        </div>

        <p className="mt-2 text-[11px] text-ink-faint">
          날짜 옆부터 바로 적으면 됩니다. 길어지면 다음 줄로 이어지고, 왼쪽{' '}
          <span className="text-accent">›</span> 나 날짜를 누르면 그 주의 주간
          페이지로 갑니다.
        </p>
      </div>
    </StickerLayer>
  )
}
