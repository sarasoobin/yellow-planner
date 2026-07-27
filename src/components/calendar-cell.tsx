'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createItem, deleteItem } from '@/lib/actions/items'
import { DEFAULT_DRAFT, WritingInput } from '@/components/writing-input'
import { Sticker, writtenStyle } from '@/components/written'
import { dayNumber } from '@/lib/dates'
import type { FormState, Item } from '@/lib/types'

const EMPTY: FormState = { error: null }

/**
 * 달력의 한 칸.
 *
 * 칸 아무 데나 누르면 날짜 옆에 바로 입력칸이 열린다.
 * 시험이나 마감 같은 건 체크리스트가 아니라 그냥 적는 것이라 네모를 두지 않는다.
 * 날짜 숫자는 그 주의 주간 페이지로 가는 지름길이다.
 */
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
  const [writing, setWriting] = useState(false)
  const [state, formAction] = useActionState(createItem, EMPTY)
  const formRef = useRef<HTMLFormElement>(null)
  const handled = useRef<FormState | null>(null)

  // 저장되면 입력칸을 비우고 열어둔다. 한 날에 여러 개 적는 일이 흔하다.
  useEffect(() => {
    if (state === EMPTY) return
    if (handled.current === state) return
    handled.current = state

    if (!state.error) formRef.current?.reset()
  }, [state])

  return (
    <div
      onClick={() => {
        if (!writing) setWriting(true)
      }}
      className={`group relative min-h-[76px] min-w-0 flex-1 cursor-text border-r border-b border-rule p-1 ${
        inMonth ? '' : 'bg-desk/50'
      }`}
    >
      <div className="flex items-start gap-1">
        <Link
          href={`/week/${weekStart}`}
          onClick={(e) => e.stopPropagation()}
          aria-label={`${dayNumber(date)}일 주간 페이지로 이동`}
          className={`grid size-[22px] shrink-0 place-items-center rounded-full text-[12px] leading-none transition-colors ${
            isToday
              ? 'bg-today font-bold text-paper'
              : inMonth
                ? 'text-ink-soft hover:bg-frame/60'
                : 'text-ink-faint/60'
          }`}
        >
          {dayNumber(date)}
        </Link>

        {writing ? (
          <form
            ref={formRef}
            action={formAction}
            onClick={(e) => e.stopPropagation()}
            className="flex min-w-0 flex-1 pt-[3px]"
          >
            <input type="hidden" name="kind" value="event" />
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="path" value={path} />

            <WritingInput
              // 달력 일정은 기본이 체크리스트가 아니다. `/` 로 붙일 수는 있다.
              initial={{ color: DEFAULT_DRAFT.color, style: { check: false } }}
              ariaLabel={`${date} 일정`}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') setWriting(false)
              }}
              onBlur={(e) => {
                if (!e.currentTarget.value.trim()) setWriting(false)
              }}
              className="border-b border-accent text-[11px] leading-tight"
            />
          </form>
        ) : (
          <span className="flex flex-1 items-center justify-end gap-1 pt-1.5">
            {/* 자잘한 할 일 개수를 점으로 (DESIGN.md §5-3) */}
            {taskCount > 0 && (
              <span
                className="flex gap-[2px]"
                aria-label={`할 일 ${taskCount}개`}
              >
                {Array.from({ length: Math.min(taskCount, 3) }, (_, i) => (
                  <span
                    key={i}
                    className="size-[3px] rounded-full bg-ink-faint"
                  />
                ))}
              </span>
            )}
            {events.length === 0 && (
              <span
                aria-hidden
                className="text-[11px] leading-none text-ink-faint/0 transition-colors group-hover:text-ink-faint/50"
              >
                +
              </span>
            )}
          </span>
        )}
      </div>

      {state.error && (
        <p role="alert" className="text-[10px] text-danger">
          {state.error}
        </p>
      )}

      {/* 적어둔 일정 */}
      <div className="mt-0.5 flex flex-col gap-[2px]">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-center gap-1 text-[11px] leading-tight"
          >
            <Sticker name={event.style?.sticker} />
            <span
              className="min-w-0 flex-1 truncate"
              style={writtenStyle(event.color, event.style, event.is_done)}
              title={event.content}
            >
              {event.content}
            </span>
            <form action={deleteItem} onClick={(e) => e.stopPropagation()}>
              <input type="hidden" name="id" value={event.id} />
              <input type="hidden" name="path" value={path} />
              <button
                type="submit"
                aria-label={`${event.content} 삭제`}
                className="px-0.5 text-[10px] leading-none text-ink-faint/60 opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger"
              >
                ✕
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  )
}
