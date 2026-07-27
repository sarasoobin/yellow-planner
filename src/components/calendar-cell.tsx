'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { deleteItem } from '@/lib/actions/items'
import { LineEditor } from '@/components/item-list'
import { Sticker, writtenStyle } from '@/components/written'
import { dayNumber } from '@/lib/dates'
import { lastLineOf, layoutLines } from '@/lib/lines'
import type { Item } from '@/lib/types'

/**
 * 달력의 한 칸.
 *
 * 날짜 바로 옆 줄이 그 날 가장 중요한 일정이고, 그 아래 줄들이 나머지다.
 * 줄을 누르면 그 자리에서 바로 적힌다. 시험이나 마감은 체크하는 것이
 * 아니라 그냥 적는 것이라 네모를 두지 않는다 (`/` 로 붙일 수는 있다).
 *
 * 날짜 숫자는 그 주의 주간 페이지로 가는 지름길이다.
 */

const CELL_ROW = 'flex h-5 items-center gap-1'

export function CalendarCell({
  date,
  weekStart,
  events,
  taskCount,
  isToday,
  inMonth,
  path,
}: {
  date: string
  weekStart: string
  events: Item[]
  taskCount: number
  isToday: boolean
  inMonth: boolean
  path: string
}) {
  const [active, setActive] = useState<number | null>(null)

  const byLine = useMemo(() => layoutLines(events), [events])
  const rows = Math.max(3, lastLineOf(byLine) + 2, (active ?? -1) + 2)

  return (
    <div
      className={`group min-w-0 flex-1 border-r border-b border-rule px-1 py-0.5 ${
        inMonth ? '' : 'bg-desk/50'
      }`}
    >
      {Array.from({ length: rows }, (_, line) => {
        const item = byLine.get(line)
        const first = line === 0

        return (
          <div key={item?.id ?? `line-${line}`} className={CELL_ROW}>
            {first ? (
              <Link
                href={`/week/${weekStart}`}
                aria-label={`${dayNumber(date)}일 주간 페이지로 이동`}
                className={`grid size-[19px] shrink-0 place-items-center rounded-full text-[12px] leading-none transition-colors ${
                  isToday
                    ? 'bg-today font-bold text-paper'
                    : inMonth
                      ? 'text-ink-soft hover:bg-frame/60'
                      : 'text-ink-faint/60'
                }`}
              >
                {dayNumber(date)}
              </Link>
            ) : (
              <span aria-hidden className="size-[19px] shrink-0" />
            )}

            {active === line ? (
              <LineEditor
                item={item}
                line={line}
                kind="event"
                date={date}
                path={path}
                showBox={false}
                className="text-[11px] leading-tight"
                onNext={() => setActive(line + 1)}
                onClose={() => setActive(null)}
              />
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setActive(line)}
                  aria-label={
                    item
                      ? item.content
                      : first
                        ? `${date} 가장 중요한 일정 적기`
                        : `${date} 일정 적기`
                  }
                  className="flex min-w-0 flex-1 cursor-text items-center gap-1 self-stretch text-left"
                >
                  {item ? (
                    <>
                      <Sticker name={item.style?.sticker} />
                      <span
                        className="truncate text-[11px] leading-tight"
                        // 첫 줄이 그 날의 대표라서 조금 더 진하게 둔다
                        style={{
                          ...writtenStyle(item.color, item.style, item.is_done),
                          fontWeight:
                            item.style?.bold || first ? 700 : undefined,
                        }}
                        title={item.content}
                      >
                        {item.content}
                      </span>
                    </>
                  ) : (
                    first &&
                    taskCount === 0 && (
                      <span
                        aria-hidden
                        className="text-[11px] leading-none text-transparent transition-colors group-hover:text-ink-faint/40"
                      >
                        +
                      </span>
                    )
                  )}
                </button>

                {item ? (
                  <form action={deleteItem} className="shrink-0">
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="path" value={path} />
                    <button
                      type="submit"
                      aria-label={`${item.content} 삭제`}
                      className="px-0.5 text-[10px] leading-none text-ink-faint/60 opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger"
                    >
                      ✕
                    </button>
                  </form>
                ) : (
                  first &&
                  taskCount > 0 && (
                    // 그 날 주간 페이지에 적어둔 자잘한 할 일 개수
                    <span
                      className="flex shrink-0 gap-[2px] pr-0.5"
                      aria-label={`할 일 ${taskCount}개`}
                    >
                      {Array.from({ length: Math.min(taskCount, 3) }, (_, i) => (
                        <span
                          key={i}
                          className="size-[3px] rounded-full bg-ink-faint"
                        />
                      ))}
                    </span>
                  )
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
