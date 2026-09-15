import Link from 'next/link'
import { addDays } from 'date-fns'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NoteEditor } from '@/components/note-editor'
import { StickerLayer } from '@/components/sticker-layer'
import { WeekBoard } from '@/components/week-board'
import { EMPTY_BLOCK, blocksByDate, countLines } from '@/lib/blocks'
import { loadCalendarSources } from '@/lib/supabase/calendar'
import {
  fromISODate,
  parseYearMonth,
  todayISO,
  toISODate,
  weekDays,
  weekOwnerMonth,
  weekRangeLabel,
  weekStartOf,
} from '@/lib/dates'
import type { Item } from '@/lib/types'

type Params = {
  params: Promise<{ start: string }>
  // Next.js 16에서 searchParams는 Promise다. 반드시 await 해야 한다.
  searchParams: Promise<{ from?: string }>
}

export async function generateMetadata({ params }: Params) {
  const { start } = await params
  return { title: `${weekRangeLabel(start)} · 正 PLANNER` }
}

export default async function WeekPage({ params, searchParams }: Params) {
  const { start } = await params
  const { from } = await searchParams
  if (!fromISODate(start)) notFound()

  /*
   * 어느 달력에서 왔는지. 달력에서 누르고 들어오면 그 달이 함께 넘어온다.
   * 주소창에 직접 쳐서 들어온 경우처럼 없을 때는 이 주가 걸쳐 있는 달로 정한다.
   *
   * 이게 없으면 "달력으로" 가 그 주 월요일이 속한 달로 가버린다. 7월 1일에
   * 적고 주간에 갔다가 돌아오면 6월 달력이 열려서 적은 게 사라진 것처럼 보였다.
   */
  const cameFrom = from && parseYearMonth(from) ? from : null

  // 주 시작은 항상 월요일이다. 주중 날짜로 들어오면 그 주의 월요일로 보낸다.
  const monday = weekStartOf(start)
  const query = cameFrom ? `?from=${cameFrom}` : ''
  if (monday !== start) redirect(`/week/${monday}${query}`)

  const days = weekDays(monday)
  const today = todayISO()
  const ym = cameFrom ?? weekOwnerMonth(monday)
  const prevWeek = toISODate(addDays(fromISODate(monday)!, -7))
  const nextWeek = toISODate(addDays(fromISODate(monday)!, 7))
  const prevQuery = `?from=${cameFrom ?? weekOwnerMonth(prevWeek)}`
  const nextQuery = `?from=${cameFrom ?? weekOwnerMonth(nextWeek)}`
  // 저장 뒤 화면을 새로 그릴 경로. 쿼리를 붙이면 revalidatePath 가 못 알아본다
  const path = `/week/${monday}`

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [sources, { data: itemData }, { data: noteData }] = await Promise.all([
    loadCalendarSources(supabase, days[6]),
    supabase
      .from('items')
      .select('*')
      .in('kind', ['task', 'daily', 'sticker'])
      .gte('date', days[0])
      .lte('date', days[6])
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('notes')
      .select('content')
      .eq('kind', 'week')
      .eq('week_start', monday)
      .maybeSingle(),
  ])

  const items = (itemData ?? []) as Item[]

  // 스티커는 주 시작일에 붙는다. 페이지 하나에 한 묶음이다.
  const stickers = items.filter((i) => i.kind === 'sticker' && i.date === monday)

  const tasks = blocksByDate(items.filter((i) => i.kind === 'task'))
  const dailies = blocksByDate(items.filter((i) => i.kind === 'daily'))

  /*
   * 안내 문구를 일곱 칸에 전부 깔면 화면이 회색 글씨로 뒤덮인다.
   * 아직 비어 있는 첫 칸에만 한 번 보여준다. 그 칸을 채우면 안내는
   * 다음 빈 칸으로 옮겨 가고, 한 주를 다 채우면 사라진다.
   */
  const hintDate = days.find(
    (date) => countLines(tasks.get(date)?.content ?? '') === 0
  )

  const weekDayBlocks = days.map((date) => ({
    date,
    isToday: date === today,
    daily: dailies.get(date) ?? EMPTY_BLOCK,
    task: tasks.get(date) ?? EMPTY_BLOCK,
    hint: date === hintDate,
  }))

  return (
    <StickerLayer
      stickers={stickers}
      date={monday}
      path={path}
      className="flex flex-1 flex-col bg-paper px-3 py-3 md:px-4 md:py-4"
    >
      <header className="mb-2 flex items-baseline justify-between gap-3">
        <h1 className="font-hand text-2xl leading-none text-ink">
          {weekRangeLabel(monday)}
        </h1>
        <nav aria-label="주간 이동" className="flex shrink-0 items-center gap-2 text-xs text-ink-faint">
          <Link href={`/week/${prevWeek}${prevQuery}`} className="grid size-7 place-items-center rounded-full hover:bg-frame/60 hover:text-accent" aria-label="이전 주">
            ‹
          </Link>
          <Link href={`/month/${ym}`} className="underline underline-offset-4 hover:text-accent">
            달력으로
          </Link>
          <Link href={`/week/${nextWeek}${nextQuery}`} className="grid size-7 place-items-center rounded-full hover:bg-frame/60 hover:text-accent" aria-label="다음 주">
            ›
          </Link>
        </nav>
      </header>

      <WeekBoard days={weekDayBlocks} path={path} sources={sources}>
        {/*
          주간 메모 — 제목 없이 줄만. 공책 아래칸이라는 게 보이면 충분하다.
          요일 칸과 나뉘는 자리라 다른 선들보다 굵게 그어 경계를 분명히 한다.
        */}
        <div className="shrink-0 border-t-2 border-rule px-2 pt-1.5 pb-2 md:px-2.5">
          <NoteEditor
            initialContent={noteData?.content ?? ''}
            weekStart={monday}
            path={path}
            rows={8}
            placeholder="이번 주 메모"
          />
        </div>
      </WeekBoard>
    </StickerLayer>
  )
}
