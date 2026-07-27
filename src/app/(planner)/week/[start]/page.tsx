import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ItemList } from '@/components/item-list'
import { NoteEditor } from '@/components/note-editor'
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

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: itemData }, { data: noteData }] = await Promise.all([
    supabase
      .from('items')
      .select('*')
      .in('kind', ['event', 'task'])
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
  for (const item of items) {
    const bucket = item.kind === 'event' ? eventsByDate : tasksByDate
    const list = bucket.get(item.date) ?? []
    list.push(item)
    bucket.set(item.date, list)
  }

  return (
    <div className="flex flex-col px-3 py-4 md:px-5 md:py-5">
      <header className="mb-4 flex items-baseline justify-between gap-3 border-b border-rule pb-2">
        <h1 className="text-lg font-bold text-ink">
          {weekRangeLabel(monday)}
        </h1>
        <Link
          href={`/month/${ym}`}
          className="shrink-0 text-xs text-ink-faint underline underline-offset-4 hover:text-accent"
        >
          달력으로
        </Link>
      </header>

      {/* 데스크톱 7열 / 모바일 세로 쌓기 (DESIGN.md §6) */}
      <div className="grid grid-cols-1 gap-px bg-rule md:grid-cols-7">
        {days.map((date, i) => {
          const isToday = date === today
          const events = eventsByDate.get(date) ?? []
          const tasks = tasksByDate.get(date) ?? []

          return (
            <section
              key={date}
              className={`flex min-h-[150px] flex-col gap-2 p-2 ${
                isToday ? 'bg-frame/30' : 'bg-paper'
              }`}
            >
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-xs font-semibold ${
                    i === 6 ? 'text-today' : 'text-ink-faint'
                  }`}
                >
                  {WEEKDAY_LABELS[i]}
                </span>
                <span
                  className={`grid size-[20px] place-items-center rounded-full text-[13px] leading-none font-bold ${
                    isToday ? 'bg-today text-paper' : 'text-ink'
                  }`}
                >
                  {dayNumber(date)}
                </span>
              </div>

              {/* 그 날의 중요 일정 — 달력에서 적은 것이 올라온다. 여기선 수정하지 않는다 */}
              {events.length > 0 && (
                <div className="flex flex-col gap-1">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-1.5 text-[12px] leading-tight font-semibold text-ink"
                    >
                      <span
                        className="h-3 w-[3px] shrink-0"
                        style={{ backgroundColor: event.color ?? '#C1453C' }}
                      />
                      <span className="truncate" title={event.content}>
                        {event.content}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-dashed border-rule" />

              <ItemList
                items={tasks}
                kind="task"
                date={date}
                path={`/week/${monday}`}
                placeholder="할 일"
              />
            </section>
          )
        })}
      </div>

      <section className="mt-5">
        <h2 className="mb-2 border-b border-rule pb-1 text-xs font-semibold tracking-[0.08em] text-ink-soft">
          이번 주 메모
        </h2>
        <NoteEditor
          initialContent={noteData?.content ?? ''}
          weekStart={monday}
          path={`/week/${monday}`}
          placeholder="이번 주에 기억할 것"
          rows={4}
        />
      </section>
    </div>
  )
}
