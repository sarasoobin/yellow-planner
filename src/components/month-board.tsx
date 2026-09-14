'use client'

import Link from 'next/link'
import { startTransition, useState } from 'react'
import { CalendarCell } from '@/components/calendar-cell'
import { CalendarDayEditor, type CalendarTitleRename } from '@/components/calendar-day-editor'
import { CalendarRepeatDialog, type RepeatSelection } from '@/components/calendar-repeat-dialog'
import { useCalendarNotes } from '@/components/use-calendar-notes'
import { useIsNarrow } from '@/components/use-is-narrow'
import { calendarText, type CalendarSource } from '@/lib/calendar-reminders'
import { WEEKDAY_LABELS, dayLabel, dayNumber } from '@/lib/dates'

/**
 * 달력 격자.
 *
 * 넓은 화면에서는 칸 안에 바로 적는다. 폰에서는 칸이 43px 뿐이라 글자를 넣을 수
 * 없어서(calendar-cell.tsx 주석) 칸은 색 띠만 보여주고, 누른 날을 달력 바로
 * 아래에서 적는다. 고른 날을 칸과 아래 편집기가 함께 알아야 해서 여기서 쥔다.
 */
export type CalendarDay = {
  date: string
  taskCount: number
  isToday: boolean
  inMonth: boolean
}

export function MonthBoard({
  weeks,
  ym,
  today,
  sources,
}: {
  weeks: CalendarDay[][]
  ym: string
  /** 오늘 날짜. 이 달에 오늘이 있으면 처음부터 그 날을 펴둔다 */
  today: string
  sources: CalendarSource[]
}) {
  const narrow = useIsNarrow()
  const controller = useCalendarNotes(sources)
  const [details, setDetails] = useState<RepeatSelection | null>(null)
  const [rename, setRename] = useState<CalendarTitleRename | null>(null)
  // 취소한 반복 일정 이름은 아직 서버/상태에 반영하지 않는다. contentEditable에만
  // 남은 임시 글자를 원래 값으로 되돌리기 위해 편집기를 새로 만든다.
  const [editorRevision, setEditorRevision] = useState(0)
  const [picked, setPicked] = useState<string | null>(() =>
    today.startsWith(ym) ? today : null,
  )

  const pickedDay = picked
    ? weeks.flat().find((day) => day.date === picked)
    : undefined

  return (
    <>
      <div className="mb-1 flex pl-7">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={`flex-1 pb-1 text-center text-[12px] font-semibold ${
              i === 6 ? 'text-today' : 'text-ink-faint'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {/*
        넓은 화면에서는 남는 세로 공간을 주(週) 수만큼 나눠 가져 칸이 커진다.
        폰에서는 칸에 글자가 없으므로 낮게 고정한다. 달력이 화면을 다 먹으면
        정작 적는 자리가 아래로 밀려 안 보인다.
      */}
      <div className="flex flex-col border-t border-l border-rule md:flex-1">
        {weeks.map((week) => (
          <div
            key={week[0].date}
            className="flex min-h-[54px] md:min-h-[108px] md:flex-1"
          >
            {/* 주차 버튼 — 그 주의 주간 페이지로 (DESIGN.md §5-3).
                어느 달에서 눌렀는지 함께 넘긴다 (lib/dates.ts weekOwnerMonth) */}
            <Link
              href={`/week/${week[0].date}?from=${ym}`}
              aria-label={`${dayNumber(week[0].date)}일 주간 페이지로 이동`}
              className="flex w-7 shrink-0 items-center justify-center border-r border-b border-rule text-ink-faint transition-colors hover:bg-frame/50 hover:text-accent"
            >
              ›
            </Link>

            {week.map((day) => (
              <CalendarCell
                key={`${day.date}-${editorRevision}`}
                date={day.date}
                weekStart={week[0].date}
                ym={ym}
                taskCount={day.taskCount}
                isToday={day.isToday}
                inMonth={day.inMonth}
                controller={controller}
                onDetails={setDetails}
                onRenameTitle={setRename}
                narrow={narrow}
                picked={day.date === picked}
                onPick={setPicked}
              />
            ))}
          </div>
        ))}
      </div>

      {narrow && (
        <div className="mt-3 border-t-2 border-rule pt-2">
          {pickedDay ? (
            <>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <h2 className="text-[15px] font-semibold text-ink">
                  {dayLabel(pickedDay.date)}
                </h2>
                <Link
                  href={`/week/${weekStartOfDay(weeks, pickedDay.date)}?from=${ym}`}
                  className="shrink-0 text-xs text-ink-faint underline underline-offset-4"
                >
                  이 주 할 일
                </Link>
              </div>

              <CalendarDayEditor
                key={`${pickedDay.date}-${editorRevision}`}
                date={pickedDay.date}
                controller={controller}
                onDetails={setDetails}
                onRenameTitle={setRename}
                leading={<span className="grid size-6 shrink-0 place-items-center text-sm font-semibold">{dayNumber(pickedDay.date)}</span>}
                mobile
              />
            </>
          ) : (
            <p className="py-6 text-center text-[13px] text-ink-faint">
              날짜를 누르면 여기에서 적을 수 있습니다
            </p>
          )}
        </div>
      )}
      <div aria-live="polite" className="mt-1 min-h-4 text-xs text-ink-faint">
        {controller.status === 'pending' && '저장 중…'}
        {controller.status === 'error' && <span role="alert" className="text-danger">{controller.error}{' '}
          <button type="button" className="underline underline-offset-2" onClick={() => startTransition(async () => { await controller.flush() })}>다시 저장</button>
        </span>}
      </div>
      {details && <CalendarRepeatDialog selection={details} onClose={() => setDetails(null)} onSave={async (repeat, endsAt, memo) => {
        controller.change(details.sourceDate, details.id
          ? { type: 'repeat', id: details.id, repeat, endsAt }
          : { type: 'titleRepeat', repeat, endsAt })
        controller.change(details.sourceDate, details.id
          ? { type: 'memo', id: details.id, memo }
          : { type: 'titleMemo', memo })
        return controller.flush()
      }} onDelete={async (scope) => {
        if (details.id) {
          controller.change(details.sourceDate, details.repeat !== 'none' && scope === 'one'
            ? { type: 'skip', id: details.id, date: details.occurrenceDate, skip: true }
            : { type: 'remove', id: details.id })
        } else {
          controller.change(details.sourceDate, details.repeat !== 'none' && scope === 'one'
            ? { type: 'titleSkip', date: details.occurrenceDate, skip: true }
            : { type: 'titleRemove' })
        }
        return controller.flush()
      }} />}
      {rename && <TitleRenameDialog rename={rename} onClose={() => {
        setRename(null)
        setEditorRevision((revision) => revision + 1)
      }} onPick={async (scope) => {
        if (scope === 'one') {
          controller.change(rename.sourceDate, { type: 'titleOverride', date: rename.occurrenceDate, text: rename.next })
        } else {
          controller.change(rename.sourceDate, { type: 'title', text: rename.next })
          controller.change(rename.sourceDate, { type: 'titleOverride', date: rename.occurrenceDate, text: null })
        }
        const ok = await controller.flush()
        if (ok) setRename(null)
      }} />}
    </>
  )
}

function TitleRenameDialog({ rename, onClose, onPick }: {
  rename: CalendarTitleRename
  onClose: () => void
  onPick: (scope: 'one' | 'all') => Promise<void>
}) {
  const [saving, setSaving] = useState<'one' | 'all' | null>(null)
  const previous = calendarText(rename.previous)
  const next = calendarText(rename.next)
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="title-rename-heading"
      className="fixed inset-0 z-50 grid place-items-center bg-ink/25 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge bg-paper p-5 text-ink shadow-xl">
        <h2 id="title-rename-heading" className="text-lg font-bold">반복 일정 이름 변경</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {previous}을(를) {next}로 바꿀까요?
        </p>
        <div className="mt-5 grid gap-2">
          <button type="button" disabled={saving !== null}
            onClick={() => { setSaving('one'); startTransition(async () => { await onPick('one'); setSaving(null) }) }}
            className="min-h-11 rounded-lg border border-rule px-4 text-left text-sm hover:bg-frame/40 disabled:opacity-50">
            이 날짜만 변경
          </button>
          <button type="button" disabled={saving !== null}
            onClick={() => { setSaving('all'); startTransition(async () => { await onPick('all'); setSaving(null) }) }}
            className="min-h-11 rounded-lg bg-frame px-4 text-left text-sm font-semibold hover:bg-edge/60 disabled:opacity-50">
            반복 일정 전체 변경
          </button>
        </div>
        <button type="button" disabled={saving !== null} onClick={onClose}
          className="mt-4 min-h-10 rounded-lg px-3 text-sm text-ink-faint hover:bg-frame/25 disabled:opacity-50">
          취소
        </button>
      </div>
    </div>
  )
}

/** 그 날이 들어 있는 주의 첫 칸(월요일) */
function weekStartOfDay(weeks: CalendarDay[][], date: string): string {
  const week = weeks.find((w) => w.some((day) => day.date === date))
  return (week ?? weeks[0])[0].date
}
