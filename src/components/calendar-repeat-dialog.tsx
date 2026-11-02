'use client'

import { startTransition, useEffect, useId, useRef, useState } from 'react'
import { REPEAT_LABELS } from '@/lib/repetition'
import { REPEAT_FREQUENCIES, type RepeatFrequency } from '@/lib/types'

export type RepeatSelection = {
  sourceDate: string
  occurrenceDate: string
  id?: string
  title: string
  memo: string
  repeat: RepeatFrequency
  endsAt: string | null
}

type ScheduleMode = 'one' | 'period' | 'repeat'

function initialScheduleMode(selection: RepeatSelection): ScheduleMode {
  if (selection.repeat === 'none') return 'one'
  // 매일 반복에 종료일을 정한 기존 일정은 기간 일정으로 자연스럽게 이어진다.
  if (selection.repeat === 'daily' && selection.endsAt) return 'period'
  return 'repeat'
}

export function CalendarRepeatDialog({ selection, onClose, onSave, onDelete }: {
  selection: RepeatSelection
  onClose: () => void
  onSave: (repeat: RepeatFrequency, endsAt: string | null, memo: string) => Promise<boolean>
  onDelete?: (scope: 'one' | 'all') => Promise<boolean>
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const [mode, setMode] = useState<ScheduleMode>(() => initialScheduleMode(selection))
  const [repeat, setRepeat] = useState(selection.repeat)
  const [hasEnd, setHasEnd] = useState(!!selection.endsAt)
  const [endDate, setEndDate] = useState(selection.endsAt?.slice(0, 10) ?? selection.sourceDate)
  const [memo, setMemo] = useState(selection.memo)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const needsEndDate = mode === 'period' || (mode === 'repeat' && hasEnd)
  const invalidEnd = needsEndDate && (!endDate || endDate < selection.sourceDate)
  const canDelete = !!onDelete
  const isRepeating = selection.repeat !== 'none'

  function chooseMode(next: ScheduleMode) {
    setMode(next)
    if (next === 'repeat' && repeat === 'none') setRepeat('weekly')
  }

  function deleteRepeat(scope: 'one' | 'all') {
    if (saving || !onDelete) return
    setSaving(true)
    setFailed(false)
    startTransition(async () => {
      const ok = await onDelete(scope)
      setSaving(false)
      if (ok) onClose()
      else setFailed(true)
    })
  }

  useEffect(() => {
    const node = dialog.current
    const previous = document.activeElement as HTMLElement | null
    node?.showModal()
    return () => { node?.close(); previous?.focus() }
  }, [])

  return (
    <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); if (!saving) onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}
      className="fixed inset-0 m-auto max-h-[85dvh] w-[min(380px,calc(100%-32px))] overflow-y-auto rounded-2xl border border-edge bg-paper p-0 text-ink shadow-xl backdrop:bg-ink/25">
      <form className="p-5" onSubmit={(event) => {
        event.preventDefault()
        if (saving || invalidEnd) return
        setSaving(true)
        setFailed(false)
        startTransition(async () => {
          const nextRepeat = mode === 'one' ? 'none' : mode === 'period' ? 'daily' : repeat
          const nextEndsAt = mode === 'period' || (mode === 'repeat' && hasEnd) ? `${endDate}T23:59` : null
          const ok = await onSave(nextRepeat, nextEndsAt, memo)
          setSaving(false)
          if (ok) onClose()
          else setFailed(true)
        })
      }}>
        <h2 id={titleId} className="text-lg font-bold">Plan settings</h2>
        <p id={descriptionId} className="mt-1 break-words text-sm text-ink-soft">{selection.title}</p>
        <p className="mt-1 text-xs text-ink-faint">Starts {selection.sourceDate} · selected {selection.occurrenceDate}</p>

        <fieldset disabled={saving} className="mt-5 border-t border-rule pt-3">
          <legend className="mb-2 text-sm font-semibold">Notes</legend>
          <textarea aria-label="Plan notes" value={memo} maxLength={5000} onChange={(event) => setMemo(event.target.value)}
            placeholder="Add a note about this plan…"
            className="min-h-24 w-full resize-y rounded-lg border border-rule bg-paper px-3 py-2 text-sm leading-relaxed outline-accent placeholder:text-ink-faint/70" />
        </fieldset>

        <fieldset disabled={saving} className="mt-4 space-y-1 border-t border-rule pt-3">
          <legend className="mb-2 text-sm font-semibold">Schedule</legend>
          <label className={`flex min-h-10 cursor-pointer items-center justify-between rounded-lg px-3 text-sm ${mode === 'one' ? 'bg-frame/65 font-semibold' : 'hover:bg-frame/25'}`}>
            One day
            <input type="radio" name="schedule-mode" checked={mode === 'one'} onChange={() => chooseMode('one')} className="size-4 accent-accent" />
          </label>
          <label className={`flex min-h-10 cursor-pointer items-center justify-between rounded-lg px-3 text-sm ${mode === 'period' ? 'bg-frame/65 font-semibold' : 'hover:bg-frame/25'}`}>
            Date range
            <input type="radio" name="schedule-mode" checked={mode === 'period'} onChange={() => chooseMode('period')} className="size-4 accent-accent" />
          </label>
          <label className={`flex min-h-10 cursor-pointer items-center justify-between rounded-lg px-3 text-sm ${mode === 'repeat' ? 'bg-frame/65 font-semibold' : 'hover:bg-frame/25'}`}>
            Repeating
            <input type="radio" name="schedule-mode" checked={mode === 'repeat'} onChange={() => chooseMode('repeat')} className="size-4 accent-accent" />
          </label>
        </fieldset>

        {mode === 'period' && (
          <fieldset disabled={saving} className="mt-4 border-t border-rule pt-3">
          <legend className="text-sm font-semibold">Date range</legend>
          <p className="mt-1 text-xs leading-relaxed text-ink-faint">This plan appears on every day from start through end.</p>
          <label className="mt-3 block min-w-0 text-xs text-ink-soft">Start date
              <input type="date" value={selection.sourceDate} readOnly aria-label="Start date"
                className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-rule bg-frame/20 px-2 text-sm text-ink-soft outline-none" />
            </label>
            <label className="mt-3 block min-w-0 text-xs text-ink-soft">End date
              <input type="date" aria-label="End date" required min={selection.sourceDate} value={endDate} onChange={(event) => setEndDate(event.target.value)}
                className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-rule bg-paper px-2 text-sm outline-accent" />
            </label>
            {invalidEnd && <p role="alert" className="mt-2 text-xs text-danger">Choose an end date after the start date.</p>}
          </fieldset>
        )}

        {mode === 'repeat' && (
          <>
          <fieldset disabled={saving} className="mt-4 space-y-1 border-t border-rule pt-3">
            <legend className="mb-2 text-sm font-semibold">Repeat</legend>
            {REPEAT_FREQUENCIES.filter((frequency) => frequency !== 'none').map((frequency) => (
              <label key={frequency} className={`flex min-h-10 cursor-pointer items-center justify-between rounded-lg px-3 text-sm ${repeat === frequency ? 'bg-frame/65 font-semibold' : 'hover:bg-frame/25'}`}>
                {REPEAT_LABELS[frequency]}
                <input type="radio" name="frequency" value={frequency} checked={repeat === frequency}
                  onChange={() => setRepeat(frequency)} className="size-4 accent-accent" />
              </label>
            ))}
          </fieldset>
          <fieldset disabled={saving} className="mt-4 border-t border-rule pt-3">
            <legend className="text-sm font-semibold">Repeat ends</legend>
            <div className="flex gap-5 py-2 text-sm">
              <label className="flex items-center gap-2"><input type="radio" name="end" checked={!hasEnd} onChange={() => setHasEnd(false)} className="accent-accent" />Never</label>
              <label className="flex items-center gap-2"><input type="radio" name="end" checked={hasEnd} onChange={() => setHasEnd(true)} className="accent-accent" />On a date</label>
            </div>
            {hasEnd && (
              <div className="mt-1">
                <label className="block min-w-0 text-xs text-ink-soft">End date
                  <input type="date" aria-label="Repeat end date" required min={selection.sourceDate} value={endDate} onChange={(event) => setEndDate(event.target.value)}
                    className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-rule bg-paper px-2 text-sm outline-accent" />
                </label>
              </div>
            )}
            {invalidEnd && <p role="alert" className="mt-2 text-xs text-danger">Choose an end date after the start date.</p>}
            <p className="mt-2 text-xs leading-relaxed text-ink-faint">The plan stays on the calendar through this date.</p>
          </fieldset>
          </>
        )}
        {failed && <p role="alert" className="mt-3 text-sm text-danger">Could not save. Check your connection and try again.</p>}
        {canDelete && (
          <div className="mt-4 border-t border-rule pt-3">
            <p className="mb-2 text-sm font-semibold">{isRepeating ? 'Delete repeating plan' : 'Delete plan'}</p>
            <div className="grid gap-2">
              {isRepeating ? <>
                <button type="button" disabled={saving} onClick={() => deleteRepeat('one')}
                  className="min-h-10 rounded-lg border border-rule px-3 text-left text-sm hover:bg-frame/35 disabled:opacity-50">
                  Delete this date only
                </button>
                <button type="button" disabled={saving} onClick={() => deleteRepeat('all')}
                  className="min-h-10 rounded-lg border border-danger/35 px-3 text-left text-sm text-danger hover:bg-danger/10 disabled:opacity-50">
                  Delete every occurrence
                </button>
              </> : <button type="button" disabled={saving} onClick={() => deleteRepeat('all')}
                className="min-h-10 rounded-lg border border-danger/35 px-3 text-left text-sm text-danger hover:bg-danger/10 disabled:opacity-50">
                Delete this plan
              </button>}
            </div>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={saving} onClick={onClose} className="min-h-11 rounded-lg px-4 text-sm hover:bg-frame/25 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={saving || invalidEnd} className="min-h-11 rounded-lg bg-frame px-5 text-sm font-semibold text-ink disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </dialog>
  )
}
