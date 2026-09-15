'use client'

import {
  createContext, startTransition, useCallback, useContext, useEffect, useRef, useState,
  type PointerEvent as ReactPointerEvent, type ReactNode,
} from 'react'
import {
  calendarMoveChanges, calendarText,
  type CalendarDragItem, type CalendarDropSpot,
} from '@/lib/calendar-reminders'
import type { CalendarController } from '@/components/use-calendar-notes'

/**
 * 일정 한 줄을 집어 다른 자리에 놓기.
 *
 * 달력 한 판(월간 격자·주간 일곱 칸)이 통째로 한 손잡이를 공유한다. 그래야
 * 9월 3일에서 집은 일정을 9월 18일 칸에 놓을 수 있다. 어디에 놓였는지는
 * 손끝 아래 DOM 을 직접 재서 정한다 — 칸마다 좌표를 등록해두면 화면이 바뀔
 * 때마다 어긋난다.
 *
 * HTML5 드래그 대신 포인터 이벤트를 쓴다. 손가락으로도 끌 수 있어야 하고,
 * 스티커를 옮기는 방식(sticker-layer.tsx)과도 같아진다.
 */

type DragState = { item: CalendarDragItem; spot: CalendarDropSpot | null; x: number; y: number }

type CalendarDragApi = {
  drag: DragState | null
  start: (item: CalendarDragItem, event: ReactPointerEvent<HTMLElement>) => void
  moveTo: (item: CalendarDragItem, spot: CalendarDropSpot) => void
}

const CalendarDragContext = createContext<CalendarDragApi | null>(null)

export function useCalendarDrag(): CalendarDragApi | null {
  return useContext(CalendarDragContext)
}

/** 손끝 아래 자리. 줄의 위쪽 절반이면 그 줄 앞, 아래쪽 절반이면 그 줄 뒤에 놓는다. */
function spotAt(x: number, y: number): CalendarDropSpot | null {
  const element = document.elementFromPoint(x, y)
  const row = element?.closest<HTMLElement>('[data-cal-row]')
  if (row?.dataset.calDate) {
    if (row.dataset.calTitle !== undefined) return { date: row.dataset.calDate, place: 'title' }
    const box = row.getBoundingClientRect()
    const afterId = y > box.top + box.height / 2 ? row.dataset.calAfter : row.dataset.calBefore
    return { date: row.dataset.calDate, place: 'after', afterId: afterId || null }
  }
  // 줄이 없는 빈 자리에 놓으면 그 날의 맨 아래로 간다.
  const cell = element?.closest<HTMLElement>('[data-cal-cell]')
  if (cell?.dataset.calDate) return { date: cell.dataset.calDate, place: 'after', afterId: cell.dataset.calEnd || null }
  return null
}

export function CalendarDragProvider({ controller, children }: {
  controller: CalendarController
  children: ReactNode
}) {
  const [drag, setDrag] = useState<DragState | null>(null)
  // 손을 떼는 순간의 자리. 상태 갱신을 기다리지 않고 바로 읽는다.
  const latest = useRef<DragState | null>(null)
  // 놓는 순간의 최신 저장 대기열. 손잡이를 잡고 있는 사이에도 다른 칸이 바뀐다.
  const live = useRef(controller)
  useEffect(() => { live.current = controller })

  const moveTo = useCallback((item: CalendarDragItem, spot: CalendarDropSpot) => {
    const { sources, change, flush } = live.current
    const changes = calendarMoveChanges(sources, item, spot, () => crypto.randomUUID())
    if (!changes.length) return
    for (const entry of changes) change(entry.date, entry.change)
    startTransition(async () => { await flush() })
  }, [])

  const start = useCallback((item: CalendarDragItem, event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    const pointerId = event.pointerId
    const from = { x: event.clientX, y: event.clientY }
    // 살짝 눌린 것과 끄는 것을 가른다. 누르기만 해서는 아무 일도 일어나지 않는다.
    let moved = false
    event.currentTarget.setPointerCapture?.(pointerId)

    const onMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return
      if (!moved && Math.abs(moveEvent.clientX - from.x) + Math.abs(moveEvent.clientY - from.y) < 5) return
      moved = true
      const next = { item, spot: spotAt(moveEvent.clientX, moveEvent.clientY), x: moveEvent.clientX, y: moveEvent.clientY }
      latest.current = next
      setDrag(next)
    }
    const finish = (endEvent: PointerEvent, drop: boolean) => {
      if (endEvent.pointerId !== pointerId) return
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      const dropped = latest.current
      latest.current = null
      setDrag(null)
      if (drop && moved && dropped?.spot) moveTo(item, dropped.spot)
    }
    const onUp = (endEvent: PointerEvent) => finish(endEvent, true)
    const onCancel = (endEvent: PointerEvent) => finish(endEvent, false)

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
  }, [moveTo])

  // 끄는 동안 아래 글이 파랗게 선택되면 종이 같지 않다.
  const holding = drag !== null
  useEffect(() => {
    if (!holding) return
    const previous = document.body.style.userSelect
    document.body.style.userSelect = 'none'
    return () => { document.body.style.userSelect = previous }
  }, [holding])

  return (
    <CalendarDragContext.Provider value={{ drag, start, moveTo }}>
      {children}
      {drag && (
        <div aria-hidden style={{ left: drag.x, top: drag.y }}
          className="pointer-events-none fixed z-50 max-w-[220px] translate-x-3 -translate-y-1/2 truncate rounded-md border border-edge bg-paper/95 px-2 py-0.5 text-[12px] leading-5 text-ink shadow-notebook">
          {calendarText(drag.item.text)}
        </div>
      )}
      <span aria-live="polite" className="sr-only">{drag ? `${calendarText(drag.item.text)} 옮기는 중` : ''}</span>
    </CalendarDragContext.Provider>
  )
}

/**
 * 줄 왼쪽의 작은 손잡이. 마우스를 올리면 나타난다.
 *
 * 끌지 않고도 옮길 수 있어야 해서 화살표 키도 받는다. 포인터로만 옮기게 두면
 * 키보드만 쓰는 사람은 순서를 바꿀 방법이 없다.
 */
export function CalendarGrip({ item, label, onArrow, always = false }: {
  item: CalendarDragItem
  label: string
  /** 위/아래 화살표로 갈 자리. 갈 곳이 없으면 null. */
  onArrow?: (direction: -1 | 1) => CalendarDropSpot | null
  /** 손가락으로 쓰는 화면에는 처음부터 보여준다. */
  always?: boolean
}) {
  const api = useCalendarDrag()
  if (!api) return <span aria-hidden className="w-2.5 shrink-0" />

  const held = api.drag?.item.id === item.id && api.drag?.item.occurrenceDate === item.occurrenceDate
  return (
    <button type="button" aria-label={label} title="끌어서 옮기기 (화살표 키로도 옮길 수 있습니다)"
      onPointerDown={(event) => api.start(item, event)}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
        event.preventDefault()
        const spot = onArrow?.(event.key === 'ArrowUp' ? -1 : 1)
        if (spot) api.moveTo(item, spot)
      }}
      className={`grid h-[22px] w-2.5 shrink-0 cursor-grab touch-none place-items-center rounded-sm text-ink-faint transition-opacity focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-accent active:cursor-grabbing ${
        always || held ? 'opacity-70' : 'opacity-0 group-hover/row:opacity-60'
      }`}>
      <svg aria-hidden viewBox="0 0 6 10" className="h-2.5 w-1.5 fill-current">
        <circle cx="1" cy="1" r="1" /><circle cx="5" cy="1" r="1" />
        <circle cx="1" cy="5" r="1" /><circle cx="5" cy="5" r="1" />
        <circle cx="1" cy="9" r="1" /><circle cx="5" cy="9" r="1" />
      </svg>
    </button>
  )
}
