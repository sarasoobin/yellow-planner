'use client'

import { startTransition, useState, type ReactNode } from 'react'
import { CalendarDragProvider } from '@/components/calendar-drag'
import type { CalendarTitleRename } from '@/components/calendar-day-editor'
import { CalendarRepeatDialog, type RepeatSelection } from '@/components/calendar-repeat-dialog'
import { useCalendarNotes, type CalendarController } from '@/components/use-calendar-notes'
import { calendarText, type CalendarSource } from '@/lib/calendar-reminders'

/**
 * 달력 한 판.
 *
 * 월간 격자든 주간 일곱 칸이든 한 판은 저장 대기열 하나, 옮기기 손잡이 하나,
 * 설정·이름 변경 창 한 벌을 나눠 쓴다. 두 페이지가 같은 것을 두 벌씩 들고
 * 있으면 한쪽만 고쳐져 어긋난다.
 */
export type CalendarBoardTools = {
  controller: CalendarController
  /** 이름 변경을 취소했을 때 편집기를 새로 만들기 위한 값. 칸의 key 에 붙인다. */
  revision: number
  onDetails: (selection: RepeatSelection) => void
  onRenameTitle: (rename: CalendarTitleRename) => void
}

export function CalendarBoard({ sources, children }: {
  sources: CalendarSource[]
  children: (tools: CalendarBoardTools) => ReactNode
}) {
  const controller = useCalendarNotes(sources)
  const [details, setDetails] = useState<RepeatSelection | null>(null)
  const [rename, setRename] = useState<CalendarTitleRename | null>(null)
  // 취소한 반복 일정 이름은 아직 서버/상태에 반영하지 않는다. contentEditable에만
  // 남은 임시 글자를 원래 값으로 되돌리기 위해 편집기를 새로 만든다.
  const [revision, setRevision] = useState(0)

  return (
    <CalendarDragProvider controller={controller}>
      {children({ controller, revision, onDetails: setDetails, onRenameTitle: setRename })}

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
        setRevision((revision) => revision + 1)
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
    </CalendarDragProvider>
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
