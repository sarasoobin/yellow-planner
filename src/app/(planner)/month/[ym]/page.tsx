import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ItemList } from '@/components/item-list'
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

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // 달력에 그릴 것(일정·할일)과 왼쪽 단에 그릴 것(이 달 할 일)을 한 번에 가져온다
  const [{ data: calendarData }, { data: monthData }] = await Promise.all([
    supabase
      .from('items')
      .select('*')
      .in('kind', ['event', 'task'])
      .gte('date', rangeStart)
      .lte('date', rangeEnd)
      .order('created_at', { ascending: true }),
    supabase
      .from('items')
      .select('*')
      .eq('kind', 'month')
      .eq('date', firstDay)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  const calendarItems = (calendarData ?? []) as Item[]
  const monthItems = (monthData ?? []) as Item[]

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
    <div className="flex flex-1 flex-col bg-paper md:flex-row">
      {/* 왼쪽 단 — 달력에 자리를 많이 내주려고 좁게 잡는다 */}
      <aside className="flex shrink-0 flex-col border-b border-rule bg-frame/30 px-3 py-4 md:w-40 md:border-r md:border-b-0">
        <h1 className="mb-3 text-2xl font-bold text-ink">{monthLabel(ym)}</h1>

        <ItemList
          items={monthItems}
          kind="month"
          date={firstDay}
          path={`/month/${ym}`}
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

              {week.map((date) => {
                const inMonth = isInMonth(date, ym)
                const isToday = date === today
                const events = eventsByDate.get(date) ?? []
                const taskCount = taskCountByDate.get(date) ?? 0

                return (
                  <div
                    key={date}
                    className={`min-h-[76px] min-w-0 flex-1 border-r border-b border-rule p-1 ${
                      inMonth ? '' : 'bg-desk/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <Link
                        href={`/week/${week[0]}`}
                        className={`grid size-[22px] place-items-center rounded-full text-[12px] leading-none transition-colors ${
                          isToday
                            ? 'bg-today font-bold text-paper'
                            : inMonth
                              ? 'text-ink-soft hover:bg-frame/60'
                              : 'text-ink-faint/60'
                        }`}
                      >
                        {dayNumber(date)}
                      </Link>

                      {/* 자잘한 할 일 개수를 점으로 (DESIGN.md §5-3) */}
                      {taskCount > 0 && (
                        <span
                          className="flex gap-[2px] pt-1.5"
                          aria-label={`할 일 ${taskCount}개`}
                        >
                          {Array.from(
                            { length: Math.min(taskCount, 3) },
                            (_, i) => (
                              <span
                                key={i}
                                className="size-[3px] rounded-full bg-ink-faint"
                              />
                            ),
                          )}
                        </span>
                      )}
                    </div>

                    {/* 중요 일정 — 색 띠 + 제목. 최대 2개까지만 보이고 나머지는 접는다 */}
                    <div className="mt-0.5 flex flex-col gap-[2px]">
                      {events.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center gap-1 truncate text-[11px] leading-tight font-semibold text-ink"
                          title={event.content}
                        >
                          <span
                            className="h-[9px] w-[3px] shrink-0"
                            style={{
                              backgroundColor: event.color ?? '#C1453C',
                            }}
                          />
                          <span className="truncate">{event.content}</span>
                        </div>
                      ))}
                      {events.length > 2 && (
                        <span className="text-[10px] text-ink-faint">
                          +{events.length - 2}개
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <p className="mt-2 text-[11px] text-ink-faint">
          왼쪽 <span className="text-accent">›</span> 또는 날짜를 누르면 그 주의
          주간 페이지로 갑니다.
        </p>
      </div>
    </div>
  )
}
