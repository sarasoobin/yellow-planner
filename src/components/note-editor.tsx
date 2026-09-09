'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { saveNote } from '@/lib/actions/notes'
import type { FormState } from '@/lib/types'

const EMPTY: FormState = { error: null }

/**
 * 괘선 메모. 주간 페이지 아래칸과 Free Note가 같이 쓴다.
 *
 * 저장 버튼을 두지 않고 포커스가 빠질 때 저장한다.
 * 공책에 적다가 손을 떼는 동작에 가깝고, 버튼이 종이 느낌을 깬다.
 */
export function NoteEditor({
  initialContent,
  weekStart,
  path,
  rows = 4,
  placeholder,
}: {
  initialContent: string
  /** 주간 메모면 그 주의 월요일, Free Note면 null */
  weekStart: string | null
  path: string
  rows?: number
  /** 비어 있을 때 옅게 깔아둘 안내. 처음 온 사람에게 여기가 적는 곳임을 알린다 */
  placeholder?: string
}) {
  const [state, formAction, pending] = useActionState(saveNote, EMPTY)
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const lastSubmitted = useRef<string | null>(initialContent)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * "이 결과가 나온 뒤에 또 고쳤는가"를 상태 객체의 참조로 판단한다.
   * 액션이 끝날 때마다 state는 새 객체가 되므로, effect 없이도 알 수 있다.
   */
  const [typedAt, setTypedAt] = useState<FormState | null>(null)
  const saved = state !== EMPTY && !state.error && typedAt !== state

  function save() {
    const input = inputRef.current
    if (!input || input.value === lastSubmitted.current) return
    lastSubmitted.current = input.value
    formRef.current?.requestSubmit()
  }

  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(save, 800)
  }

  useEffect(() => {
    // 실패한 내용은 다음 자동 저장 또는 "다시 시도"에서 다시 보낼 수 있다.
    if (state.error) lastSubmitted.current = null
  }, [state])

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  return (
    <form ref={formRef} action={formAction} className="flex h-full flex-col">
      <input type="hidden" name="path" value={path} />
      {weekStart && <input type="hidden" name="week_start" value={weekStart} />}

      {/* 괘선과 글줄을 맞추려면 textarea에 padding이 없어야 한다 */}
      <textarea
        ref={inputRef}
        name="content"
        defaultValue={initialContent}
        rows={rows}
        maxLength={5000}
        placeholder={placeholder}
        aria-label={placeholder || '메모'}
        onChange={() => {
          setTypedAt(state)
          scheduleSave()
        }}
        onBlur={() => {
          if (saveTimer.current) clearTimeout(saveTimer.current)
          save()
        }}
        // text-sm은 줄 간격까지 같이 지정해서 괘선과 어긋난다. 크기만 준다.
        // 안내 글씨는 PaperBlock 의 것과 같은 농도로 맞춘다. 진하면 적어둔 글로 보인다
        className="ruled w-full flex-1 resize-none bg-transparent p-0 text-[16px] text-ink-soft outline-none placeholder:text-ink-faint/50"
      />

      <div className="flex h-4 items-center justify-end gap-2 text-[11px]">
        {state.error && (
          <span role="alert" className="mr-auto text-danger">
            {state.error}{' '}
            <button
              type="button"
              onClick={save}
              className="cursor-pointer underline underline-offset-2"
            >
              다시 시도
            </button>
          </span>
        )}
        {pending && <span className="text-ink-faint">저장 중…</span>}
        {saved && !pending && (
          <span role="status" className="text-done">
            저장됨
          </span>
        )}
      </div>
    </form>
  )
}
