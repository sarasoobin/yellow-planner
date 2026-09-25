'use client'

import Link from 'next/link'
import { CalendarDayEditor, type CalendarTitleRename } from '@/components/calendar-day-editor'
import type { CalendarController } from '@/components/use-calendar-notes'
import type { RepeatSelection } from '@/components/calendar-repeat-dialog'
import { calendarOccurrences, calendarTaskKind, calendarText, calendarTitles, hasCalendarText } from '@/lib/calendar-reminders'
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
  const todos = calendarOccurrences(controller.sources, date)
    .filter((row) => calendarTaskKind(row.task) === 'todo' && hasCalendarText(row.task.text))
    .map((row) => ({
      key: `${row.sourceDate}:${row.task.id}`,
      text: calendarText(row.task.text),
      done: row.task.completedDates.includes(date),
    }))
  const entries = [
    ...titles.map((text, index) => ({ key: `title:${index}`, text, done: null as boolean | null })),
    ...todos,
  ]
  const count = entries.length
  // 압축 달력에서도 일정과 체크리스트를 글자로 남긴다. 칸이 좁아지면 일부만
  // 보여주고, 나머지는 `…`와 날짜를 눌렀을 때 열리는 상세 편집기로 이어진다.
  const firstTitle = entries[0]?.text
  const dateClass = `grid size-[23px] shrink-0 place-items-center rounded-full text-[13px] leading-none ${
    isToday ? 'bg-today font-bold text-paper' : inMonth ? 'text-ink-soft' : 'text-ink-faint/60'
  }`

  if (narrow) return (
    <button type="button" aria-pressed={picked}
      aria-label={`${dayNumber(date)}일${firstTitle ? `, ${firstTitle}` : ''}${count ? `, 일정과 할 일 ${count}개` : ''}`}
      onClick={() => onPick(date)}
      className={`flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-[3px] border-r border-b border-rule px-[3px] pt-1 pb-1.5 sm:min-h-[74px] sm:gap-1 sm:px-1 sm:pt-1.5 ${picked ? 'bg-frame/70' : inMonth ? '' : 'bg-desk/50'}`}>
      <span className={dateClass}>{dayNumber(date)}</span>
      <span className="flex w-full min-w-0 flex-col gap-px text-left">
        {entries.slice(0, 3).map((entry, index) => (
          <span
            key={entry.key}
            title={entry.text}
            className={`truncate px-px text-[8px] leading-[11px] text-ink-soft sm:text-[10px] sm:leading-[13px] ${
              index === 2 ? 'hidden sm:block' : ''
            } ${entry.done === null ? 'font-semibold' : entry.done ? 'text-ink-faint line-through' : ''}`}
          >
            {entry.done === null ? '• ' : entry.done ? '☑ ' : '☐ '}
            {entry.text}
          </span>
        ))}
        {entries.length > 2 && <span aria-hidden className="px-px text-[9px] leading-3 text-ink-faint sm:hidden">…</span>}
        {entries.length > 3 && <span aria-hidden className="hidden px-px text-[10px] leading-3 text-ink-faint sm:block">…</span>}
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
