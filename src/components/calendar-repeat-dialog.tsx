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

export function CalendarRepeatDialog({ selection, onClose, onSave, onDelete }: {
  selection: RepeatSelection
  onClose: () => void
  onSave: (repeat: RepeatFrequency, endsAt: string | null, memo: string) => Promise<boolean>
  onDelete?: (scope: 'one' | 'all') => Promise<boolean>
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const [repeat, setRepeat] = useState(selection.repeat)
  const [hasEnd, setHasEnd] = useState(!!selection.endsAt)
  const [endDate, setEndDate] = useState(selection.endsAt?.slice(0, 10) ?? selection.sourceDate)
  const [memo, setMemo] = useState(selection.memo)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const invalidEnd = hasEnd && (!endDate || endDate < selection.sourceDate)
  const canDelete = !!onDelete
  const isRepeating = selection.repeat !== 'none'

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
        if (saving || (repeat !== 'none' && invalidEnd)) return
        setSaving(true)
        setFailed(false)
        startTransition(async () => {
          const ok = await onSave(repeat, repeat !== 'none' && hasEnd ? `${endDate}T23:59` : null, memo)
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

        <fieldset disabled={saving} className="mt-4 space-y-1">
          <legend className="mb-2 text-sm font-semibold">반복 주기</legend>
          {REPEAT_FREQUENCIES.map((frequency) => (
            <label key={frequency} className={`flex min-h-10 cursor-pointer items-center justify-between rounded-lg px-3 text-sm ${repeat === frequency ? 'bg-frame/65 font-semibold' : 'hover:bg-frame/25'}`}>
              {REPEAT_LABELS[frequency]}
              <input type="radio" name="frequency" value={frequency} checked={repeat === frequency}
                onChange={() => setRepeat(frequency)} className="size-4 accent-accent" />
            </label>
          ))}
        </fieldset>

        {repeat !== 'none' && (
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
          <button type="submit" disabled={saving || (repeat !== 'none' && invalidEnd)} className="min-h-11 rounded-lg bg-frame px-5 text-sm font-semibold text-ink disabled:opacity-50">{saving ? '저장 중…' : '저장'}</button>
        </div>
      </form>
    </dialog>
  )
}
