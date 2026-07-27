import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DailyLine } from '@/components/daily-line'
import { ItemList } from '@/components/item-list'
import { NoteEditor } from '@/components/note-editor'
import { Sticker, writtenStyle } from '@/components/written'
import {
  WEEKDAY_LABELS,
  dayNumber,
  fromISODate,
  todayISO,
  weekDays,
  weekRangeLabel,
  weekStartOf,
} from '@/lib/dates'
import type { Item } from '@/lib/types'

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
      .in('kind', ['event', 'task', 'daily'])
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

  const eventsByDate = new Map<string, Item[]>()
  const tasksByDate = new Map<string, Item[]>()
  const dailyByDate = new Map<string, Item>()
  for (const item of items) {
    if (item.kind === 'daily') {
      dailyByDate.set(item.date, item)
    } else {
      const bucket = item.kind === 'event' ? eventsByDate : tasksByDate
      const list = bucket.get(item.date) ?? []
      list.push(item)
      bucket.set(item.date, list)
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-paper px-3 py-3 md:px-4 md:py-4">
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
            const events = eventsByDate.get(date) ?? []
            const tasks = tasksByDate.get(date) ?? []

            return (
              <section
                key={date}
                className={`flex min-w-0 flex-col gap-1 border-b border-rule p-1.5 last:border-b-0 md:border-r md:border-b-0 md:last:border-r-0 ${
                  isToday ? 'bg-frame/25' : ''
                }`}
              >
                {/* 요일 · 날짜 · 그 날 한 줄 */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={`shrink-0 text-[11px] font-semibold ${
                      i === 6 ? 'text-today' : 'text-ink-faint'
                    }`}
                  >
                    {WEEKDAY_LABELS[i]}
                  </span>
                  <span
                    className={`grid size-[19px] shrink-0 place-items-center rounded-full text-[12px] leading-none font-bold ${
                      isToday ? 'bg-today text-paper' : 'text-ink'
                    }`}
                  >
                    {dayNumber(date)}
                  </span>
                  <DailyLine item={dailyByDate.get(date)} date={date} path={path} />
                </div>

                {/* 중요 일정 — 달력에서 적은 것이 올라온다. 여기선 고치지 않는다 */}
                {events.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-1 text-[12px] leading-tight"
                        title={event.content}
                      >
                        <span
                          aria-hidden
                          className="h-3 w-[3px] shrink-0"
                          style={{ backgroundColor: event.color ?? '#C1453C' }}
                        />
                        <Sticker name={event.style?.sticker} />
                        <span
                          className="truncate"
                          style={writtenStyle(
                            event.color,
                            event.style,
                            event.is_done,
                          )}
                        >
                          {event.content}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <ItemList
                  items={tasks}
                  kind="task"
                  date={date}
                  path={path}
                  minRows={4}
                />
              </section>
            )
          })}
        </div>

        {/* 주간 메모 — 제목 없이 줄만. 공책 아래칸이라는 게 보이면 충분하다 */}
        <div className="shrink-0 border-t border-rule px-2 pt-1.5 pb-2 md:px-2.5">
          <NoteEditor
            initialContent={noteData?.content ?? ''}
            weekStart={monday}
            path={path}
            rows={7}
          />
        </div>
      </div>
    </div>
  )
}
