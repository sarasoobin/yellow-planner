import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MonthBoard, type CalendarDay } from '@/components/month-board'
import { PaperBlock } from '@/components/paper-block'
import { StickerLayer } from '@/components/sticker-layer'
import {
  blocksByDate,
  countLines,
  toBlock,
} from '@/lib/blocks'
import {
  isInMonth,
  monthFirstDay,
  monthGrid,
  monthLabel,
  monthName,
  parseYearMonth,
  shiftYearMonth,
  todayISO,
} from '@/lib/dates'
import { loadCalendarSources } from '@/lib/supabase/calendar'
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
  const previousMonth = shiftYearMonth(ym, -1)
  const nextMonth = shiftYearMonth(ym, 1)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [sources, { data: taskData }, { data: asideData }] = await Promise.all([
    loadCalendarSources(supabase, rangeEnd),
    supabase
      .from('items')
      .select('*')
      .eq('kind', 'task')
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

  const taskItems = (taskData ?? []) as Item[]
  const tasks = blocksByDate(taskItems)

  const asideItems = (asideData ?? []) as Item[]
  const memo = toBlock(asideItems.filter((i) => i.kind === 'month'))
  const stickers = asideItems.filter((i) => i.kind === 'sticker')

  // 격자에 필요한 것만 추려 넘긴다. 달력은 고른 날을 기억해야 해서
  // 클라이언트 컴포넌트다 (components/month-board.tsx)
  const weeks: CalendarDay[][] = grid.map((week) =>
    week.map((date) => ({
      date,
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
      className="vintage-paper flex flex-1 flex-col bg-paper px-3 py-3 md:px-4 md:py-4 lg:flex-row lg:px-0 lg:py-0"
    >
      {/*
        화면이 좁아져 달력 칸에 글자를 넣기 어려울 때만 월 이름·메모를 위로 올린다.
        넓은 화면에서는 원래처럼 왼쪽 세로 메모와 오른쪽 달력으로 돌아간다.
      */}
      <header className="mb-3 flex shrink-0 items-start gap-3 border-b border-rule pb-3 sm:items-center sm:gap-5 lg:order-1 lg:mb-0 lg:w-52 lg:flex-col lg:items-stretch lg:gap-2 lg:border-b-0 lg:border-r lg:px-3 lg:py-4 xl:w-56">
        <div className="flex shrink-0 flex-col gap-1">
          <div className="grid w-full grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center">
            {previousMonth && (
              <Link
                href={`/month/${previousMonth}`}
                aria-label={`Previous month, ${monthLabel(previousMonth)}`}
                className="grid size-9 place-items-center justify-self-start rounded-full border border-edge/80 bg-paper/70 text-2xl leading-none text-ink shadow-[0_1px_3px_rgba(95,83,96,.16)] transition-colors hover:bg-frame hover:text-accent"
              >
                ‹
              </Link>
            )}
            <h1 className="min-w-0 flex-1 text-center text-ink">
              <span className="font-hand block text-3xl leading-[0.9] sm:text-4xl">
                {monthName(ym)}
              </span>
              <span className="mt-2 block text-[15px] font-semibold tracking-[0.16em] text-ink-soft sm:text-base">
                {ym.slice(0, 4)}
              </span>
            </h1>
            {nextMonth && (
              <Link
                href={`/month/${nextMonth}`}
                aria-label={`Next month, ${monthLabel(nextMonth)}`}
                className="grid size-9 place-items-center justify-self-end rounded-full border border-edge/80 bg-paper/70 text-2xl leading-none text-ink shadow-[0_1px_3px_rgba(95,83,96,.16)] transition-colors hover:bg-frame hover:text-accent"
              >
                ›
              </Link>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[10px] font-semibold tracking-[0.1em] text-ink-faint lg:hidden">
            Monthly notes
          </p>
          {/* 작은 화면은 세 줄 가로 메모, 큰 화면은 원래의 12줄 세로 메모. */}
          <PaperBlock
            kind="month"
            date={firstDay}
            path={path}
            content={memo.content}
            color={memo.color}
            style={memo.style}
            minRows={3}
            desktopMinRows={12}
            placeholder="A note for this month…"
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:order-2 lg:px-5 lg:py-4">
        <MonthBoard key={ym} weeks={weeks} ym={ym} today={today} sources={sources} />

        {/* 압축 보기에서는 날짜를 눌러 아래에서 일정을 자세히 편집한다. */}
        <p className="mt-2 text-[12px] text-ink-faint lg:hidden">
          Select a day to see its plans and checklist below. The left{' '}
          <span className="text-accent">›</span> opens that week.
        </p>
      </div>
    </StickerLayer>
  )
}
