'use client'

import Link from 'next/link'
import { CalendarDayEditor, type CalendarTitleRename } from '@/components/calendar-day-editor'
import type { CalendarController } from '@/components/use-calendar-notes'
import type { RepeatSelection } from '@/components/calendar-repeat-dialog'
import { calendarOccurrences, calendarTaskKind, calendarTitles, hasCalendarText } from '@/lib/calendar-reminders'
import { dayNumber } from '@/lib/dates'

/** 작은 화면은 날짜를 고르고 아래에서 편집한다. 넓은 화면은 칸 안에서 편집한다. */
export function CalendarCell({ date, weekStart, ym, taskCount, isToday, inMonth,
  narrow, picked, onPick, controller, onDetails, onRenameTitle,
}: {
  date: string
  weekStart: string
  ym: string
  taskCount: number
  isToday: boolean
  inMonth: boolean
  narrow: boolean
  picked: boolean
  onPick: (date: string) => void
  controller: CalendarController
  onDetails: (selection: RepeatSelection) => void
  onRenameTitle: (rename: CalendarTitleRename) => void
}) {
  const titles = calendarTitles(controller.sources, date)
  const count = titles.length +
    calendarOccurrences(controller.sources, date).filter((row) =>
      calendarTaskKind(row.task) === 'todo' && hasCalendarText(row.task.text)).length
  const source = controller.sources.find((source) => source.date === date)
  const dateClass = `grid size-[23px] shrink-0 place-items-center rounded-full text-[13px] leading-none ${
    isToday ? 'bg-today font-bold text-paper' : inMonth ? 'text-ink-soft' : 'text-ink-faint/60'
  }`

  if (narrow) return (
    <button type="button" aria-pressed={picked}
      aria-label={`${dayNumber(date)}일${count ? `, 일정과 할 일 ${count}개` : ''}`}
      onClick={() => onPick(date)}
      className={`flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-[3px] border-r border-b border-rule px-[3px] pt-1 pb-1.5 ${picked ? 'bg-frame/70' : inMonth ? '' : 'bg-desk/50'}`}>
      <span className={dateClass}>{dayNumber(date)}</span>
      <span aria-hidden className="flex w-full flex-col gap-[2px]">
        {Array.from({ length: Math.min(count, 3) }, (_, index) => <span key={index} className="h-[3px] w-full" style={{ backgroundColor: source?.color ?? 'var(--color-today)' }} />)}
      </span>
      {taskCount > 0 && <span className="mt-auto text-[9px] text-ink-faint" aria-label={`주간 할 일 ${taskCount}개`}>{taskCount}</span>}
    </button>
  )

  // 편집기가 칸 높이를 다 차지해야 빈 자리에도 일정을 끌어다 놓을 수 있다.
  return <div data-calendar-date={date} className={`min-w-0 flex-1 border-r border-b border-rule px-1 pt-0.5 pb-1 ${inMonth ? '' : 'bg-desk/50'}`}>
    <CalendarDayEditor date={date} controller={controller} onDetails={onDetails} onRenameTitle={onRenameTitle} className="h-full"
      leading={<Link href={`/week/${weekStart}?from=${ym}`} aria-label={`${dayNumber(date)}일 주간 페이지로 이동`}
        className={`${dateClass} transition-colors hover:bg-frame/60`}>{dayNumber(date)}</Link>} />
  </div>
}
