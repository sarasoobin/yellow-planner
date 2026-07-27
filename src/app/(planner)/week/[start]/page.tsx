import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NoteEditor } from '@/components/note-editor'
import { PaperBlock } from '@/components/paper-block'
import { StickerLayer } from '@/components/sticker-layer'
import { EMPTY_BLOCK, blocksByDate, firstLine } from '@/lib/blocks'
import {
  dayNumber,
  fromISODate,
  todayISO,
  weekDays,
  weekRangeLabel,
  weekStartOf,
} from '@/lib/dates'
import type { Item } from '@/lib/types'

/** 디자인 시안(JE_바름이5.pdf)을 따라 요일은 영문 소문자로 적는다 */
const WEEKDAY_EN = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

type Params = { params: Promise<{ start: string }> }

export async function generateMetadata({ params }: Params) {
  const { start } = await params
  return { title: `${weekRangeLabel(start)} · 正 PLANNER` }
}

export default async function WeekPage({ params }: Params) {
  const { start } = await params
  if (!fromISODate(start)) notFound()

  // 주 시작은 항상 월요일이다. 주중 날짜로 들어오면 그 주의 월요일로 보낸다.
  const monday = weekStartOf(start)
  if (monday !== start) redirect(`/week/${monday}`)

  const days = weekDays(monday)
  const today = todayISO()
  const ym = monday.slice(0, 7)
  const path = `/week/${monday}`

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: itemData }, { data: noteData }] = await Promise.all([
    supabase
      .from('items')
      .select('*')
      .in('kind', ['event', 'task', 'daily', 'sticker'])
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

  const events = blocksByDate(items.filter((i) => i.kind === 'event'))
  const tasks = blocksByDate(items.filter((i) => i.kind === 'task'))
  const dailies = blocksByDate(items.filter((i) => i.kind === 'daily'))

  return (
    <StickerLayer
      stickers={stickers}
      date={monday}
      path={path}
      className="flex flex-1 flex-col bg-paper px-3 py-3 md:px-4 md:py-4"
    >
      <header className="mb-2 flex items-baseline justify-between gap-3">
        <h1 className="text-base font-bold text-ink">
          {weekRangeLabel(monday)}
        </h1>
        <Link
          href={`/month/${ym}`}
          className="shrink-0 text-xs text-ink-faint underline underline-offset-4 hover:text-accent"
        >
          달력으로
        </Link>
      </header>

      {/*
        요일 칸의 세로줄이 아래 메모칸의 가로줄과 직교로 만나야 한다.
        그래서 둘을 같은 테두리 안에 넣고 사이에 여백을 두지 않는다.
      */}
      <div className="flex flex-1 flex-col border border-rule">
        <div className="grid flex-1 grid-cols-1 md:grid-cols-7">
          {days.map((date, i) => {
            const isToday = date === today
            const daily = dailies.get(date) ?? EMPTY_BLOCK
            const task = tasks.get(date) ?? EMPTY_BLOCK
            // 달력에 적은 그 날 가장 중요한 일정 — 여기선 보여주기만 한다
            const headline = firstLine(events.get(date)?.content ?? '')

            return (
              <section
                key={date}
                className={`flex min-w-0 flex-col border-b border-rule last:border-b-0 md:border-r md:border-b-0 md:last:border-r-0 ${
                  isToday ? 'bg-frame/25' : ''
                }`}
              >
                {/* 요일 · 날짜 · 그 날 한 줄 — 시안의 머리 띠 */}
                <div className="flex items-center gap-1.5 border-b border-rule px-1.5 py-1.5">
                  <span
                    className={`shrink-0 text-[11px] tracking-wide ${
                      i === 6 ? 'text-today' : 'text-ink-faint'
                    }`}
                  >
                    {WEEKDAY_EN[i]}
                  </span>
                  <span
                    className={`grid size-[19px] shrink-0 place-items-center rounded-full text-[13px] leading-none font-bold ${
                      isToday ? 'bg-today text-paper' : 'text-ink'
                    }`}
                  >
                    {dayNumber(date)}
                  </span>
                  <PaperBlock
                    kind="daily"
                    date={date}
                    path={path}
                    content={daily.content}
                    color={daily.color}
                    style={daily.style}
                    minRows={1}
                    lineHeight={16}
                    fontSize={11}
                    ruled={false}
                    className="min-w-0 flex-1"
                  />
                </div>

                <div className="flex flex-1 flex-col px-1.5 pt-1 pb-2">
                  {headline && (
                    <div className="mb-1 flex items-center gap-1.5 text-[12px] leading-tight font-semibold text-ink">
                      <span
                        aria-hidden
                        className="h-3 w-[3px] shrink-0"
                        style={{
                          backgroundColor: events.get(date)?.color ?? '#C1453C',
                        }}
                      />
                      <span className="truncate" title={headline}>
                        {headline}
                      </span>
                    </div>
                  )}

                  <PaperBlock
                    kind="task"
                    date={date}
                    path={path}
                    content={task.content}
                    color={task.color}
                    style={task.style}
                    minRows={10}
                    className="flex-1"
                  />
                </div>
              </section>
            )
          })}
        </div>

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
          />
        </div>
      </div>
    </StickerLayer>
  )
}
