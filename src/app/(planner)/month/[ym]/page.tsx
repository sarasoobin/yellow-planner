import Image from 'next/image'
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
  parseYearMonth,
  todayISO,
} from '@/lib/dates'
import { loadCalendarSources } from '@/lib/supabase/calendar'
import type { Item } from '@/lib/types'

type Params = { params: Promise<{ ym: string }> }

/** 월간 메모 카드 아래의 작은 장식. 적는 자리를 침범하지 않는 크기로만 둔다. */
const MONTH_CHARACTERS = [
  { src: '/mandu/tearful.jpeg', width: 736, height: 506 },
  { src: '/mandu/glasses.jpeg', width: 210, height: 210 },
  { src: '/mandu/grumpy.jpeg', width: 210, height: 210 },
  { src: '/mandu/night.jpeg', width: 210, height: 210 },
] as const

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
  const character = MONTH_CHARACTERS[(Number(ym.slice(5, 7)) - 1) % MONTH_CHARACTERS.length]

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
      className="flex flex-1 flex-col bg-paper px-3 py-3 md:px-4 md:py-4 lg:flex-row lg:px-0 lg:py-0"
    >
      {/*
        화면이 좁아져 달력 칸에 글자를 넣기 어려울 때만 월 이름·메모를 위로 올린다.
        넓은 화면에서는 원래처럼 왼쪽 세로 메모와 오른쪽 달력으로 돌아간다.
      */}
      <header className="mb-3 flex shrink-0 items-start gap-3 border-b border-rule pb-3 sm:items-center sm:gap-5 lg:order-1 lg:mb-0 lg:w-52 lg:flex-col lg:items-stretch lg:gap-2 lg:border-b-0 lg:border-r lg:px-3 lg:py-4 xl:w-56">
        <div className="flex shrink-0 flex-col gap-1">
          <h1 className="font-sans text-3xl leading-none font-bold text-ink sm:text-4xl">
            {monthLabel(ym)}
          </h1>
          <Image
            aria-hidden
            src={character.src}
            alt=""
            width={character.width}
            height={character.height}
            sizes="44px"
            className="h-9 w-auto self-center object-contain mix-blend-multiply sm:h-11 lg:hidden"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[10px] font-semibold tracking-[0.1em] text-ink-faint lg:hidden">
            이번 달 메모
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
            placeholder="이 달에 잊지 말 것"
          />
        </div>
        <Image
          aria-hidden
          src={character.src}
          alt=""
          width={character.width}
          height={character.height}
          sizes="224px"
          className="mt-auto hidden max-h-28 w-auto max-w-full self-center object-contain mix-blend-multiply lg:block"
        />
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:order-2 lg:px-5 lg:py-4">
        <MonthBoard key={ym} weeks={weeks} ym={ym} today={today} sources={sources} />

        {/* 압축 보기에서는 날짜를 눌러 아래에서 일정을 자세히 편집한다. */}
        <p className="mt-2 text-[12px] text-ink-faint lg:hidden">
          날짜를 누르면 아래에서 그 날의 일정과 체크리스트를 모두 봅니다. 왼쪽{' '}
          <span className="text-accent">›</span> 는 그 주의 주간 페이지로 갑니다.
        </p>
      </div>
    </StickerLayer>
  )
}
