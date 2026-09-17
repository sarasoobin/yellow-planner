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
        <h2 id={titleId} className="text-lg font-bold">일정 설정</h2>
        <p id={descriptionId} className="mt-1 break-words text-sm text-ink-soft">{selection.title}</p>
        <p className="mt-1 text-xs text-ink-faint">시작일 {selection.sourceDate} · 선택일 {selection.occurrenceDate}</p>

        <fieldset disabled={saving} className="mt-5 border-t border-rule pt-3">
          <legend className="mb-2 text-sm font-semibold">메모</legend>
          <textarea aria-label="일정 메모" value={memo} maxLength={5000} onChange={(event) => setMemo(event.target.value)}
            placeholder="이 일정에 관한 메모를 적어보세요"
            className="min-h-24 w-full resize-y rounded-lg border border-rule bg-paper px-3 py-2 text-sm leading-relaxed outline-accent placeholder:text-ink-faint/70" />
        </fieldset>

        <fieldset disabled={saving} className="mt-4 space-y-1 border-t border-rule pt-3">
          <legend className="mb-2 text-sm font-semibold">일정 방식</legend>
          <label className={`flex min-h-10 cursor-pointer items-center justify-between rounded-lg px-3 text-sm ${mode === 'one' ? 'bg-frame/65 font-semibold' : 'hover:bg-frame/25'}`}>
            하루 일정
            <input type="radio" name="schedule-mode" checked={mode === 'one'} onChange={() => chooseMode('one')} className="size-4 accent-accent" />
          </label>
          <label className={`flex min-h-10 cursor-pointer items-center justify-between rounded-lg px-3 text-sm ${mode === 'period' ? 'bg-frame/65 font-semibold' : 'hover:bg-frame/25'}`}>
            기간 일정
            <input type="radio" name="schedule-mode" checked={mode === 'period'} onChange={() => chooseMode('period')} className="size-4 accent-accent" />
          </label>
          <label className={`flex min-h-10 cursor-pointer items-center justify-between rounded-lg px-3 text-sm ${mode === 'repeat' ? 'bg-frame/65 font-semibold' : 'hover:bg-frame/25'}`}>
            반복 일정
            <input type="radio" name="schedule-mode" checked={mode === 'repeat'} onChange={() => chooseMode('repeat')} className="size-4 accent-accent" />
          </label>
        </fieldset>

        {mode === 'period' && (
          <fieldset disabled={saving} className="mt-4 border-t border-rule pt-3">
            <legend className="text-sm font-semibold">일정 기간</legend>
            <p className="mt-1 text-xs leading-relaxed text-ink-faint">시작일과 종료일을 모두 포함해 매일 달력에 표시됩니다.</p>
            <label className="mt-3 block min-w-0 text-xs text-ink-soft">시작일
              <input type="date" value={selection.sourceDate} readOnly aria-label="일정 시작일"
                className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-rule bg-frame/20 px-2 text-sm text-ink-soft outline-none" />
            </label>
            <label className="mt-3 block min-w-0 text-xs text-ink-soft">종료일
              <input type="date" aria-label="일정 종료일" required min={selection.sourceDate} value={endDate} onChange={(event) => setEndDate(event.target.value)}
                className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-rule bg-paper px-2 text-sm outline-accent" />
            </label>
            {invalidEnd && <p role="alert" className="mt-2 text-xs text-danger">종료일은 시작일 이후로 선택해주세요.</p>}
          </fieldset>
        )}

        {mode === 'repeat' && (
          <>
          <fieldset disabled={saving} className="mt-4 space-y-1 border-t border-rule pt-3">
            <legend className="mb-2 text-sm font-semibold">반복 주기</legend>
            {REPEAT_FREQUENCIES.filter((frequency) => frequency !== 'none').map((frequency) => (
              <label key={frequency} className={`flex min-h-10 cursor-pointer items-center justify-between rounded-lg px-3 text-sm ${repeat === frequency ? 'bg-frame/65 font-semibold' : 'hover:bg-frame/25'}`}>
                {REPEAT_LABELS[frequency]}
                <input type="radio" name="frequency" value={frequency} checked={repeat === frequency}
                  onChange={() => setRepeat(frequency)} className="size-4 accent-accent" />
              </label>
            ))}
          </fieldset>
          <fieldset disabled={saving} className="mt-4 border-t border-rule pt-3">
            <legend className="text-sm font-semibold">반복 종료일</legend>
            <div className="flex gap-5 py-2 text-sm">
              <label className="flex items-center gap-2"><input type="radio" name="end" checked={!hasEnd} onChange={() => setHasEnd(false)} className="accent-accent" />없음</label>
              <label className="flex items-center gap-2"><input type="radio" name="end" checked={hasEnd} onChange={() => setHasEnd(true)} className="accent-accent" />날짜 지정</label>
            </div>
            {hasEnd && (
              <div className="mt-1">
                <label className="block min-w-0 text-xs text-ink-soft">종료일
                  <input type="date" aria-label="반복 종료일" required min={selection.sourceDate} value={endDate} onChange={(event) => setEndDate(event.target.value)}
                    className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-rule bg-paper px-2 text-sm outline-accent" />
                </label>
              </div>
            )}
            {invalidEnd && <p role="alert" className="mt-2 text-xs text-danger">시작일 이후의 날짜를 선택해주세요.</p>}
            <p className="mt-2 text-xs leading-relaxed text-ink-faint">종료 날짜의 할 일까지 달력에 표시됩니다.</p>
          </fieldset>
          </>
        )}
        {failed && <p role="alert" className="mt-3 text-sm text-danger">저장하지 못했어요. 연결을 확인하고 다시 저장해주세요.</p>}
        {canDelete && (
          <div className="mt-4 border-t border-rule pt-3">
            <p className="mb-2 text-sm font-semibold">{isRepeating ? '반복 일정 삭제' : '일정 삭제'}</p>
            <div className="grid gap-2">
              {isRepeating ? <>
                <button type="button" disabled={saving} onClick={() => deleteRepeat('one')}
                  className="min-h-10 rounded-lg border border-rule px-3 text-left text-sm hover:bg-frame/35 disabled:opacity-50">
                  이 날짜만 삭제
                </button>
                <button type="button" disabled={saving} onClick={() => deleteRepeat('all')}
                  className="min-h-10 rounded-lg border border-danger/35 px-3 text-left text-sm text-danger hover:bg-danger/10 disabled:opacity-50">
                  반복 전체 삭제
                </button>
              </> : <button type="button" disabled={saving} onClick={() => deleteRepeat('all')}
                className="min-h-10 rounded-lg border border-danger/35 px-3 text-left text-sm text-danger hover:bg-danger/10 disabled:opacity-50">
                이 일정 삭제
              </button>}
            </div>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={saving} onClick={onClose} className="min-h-11 rounded-lg px-4 text-sm hover:bg-frame/25 disabled:opacity-50">취소</button>
          <button type="submit" disabled={saving || invalidEnd} className="min-h-11 rounded-lg bg-frame px-5 text-sm font-semibold text-ink disabled:opacity-50">{saving ? '저장 중…' : '저장'}</button>
        </div>
      </form>
    </dialog>
  )
}
