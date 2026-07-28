'use client'

import { useActionState, useRef, useState } from 'react'
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
}: {
  initialContent: string
  /** 주간 메모면 그 주의 월요일, Free Note면 null */
  weekStart: string | null
  path: string
  rows?: number
}) {
  const [state, formAction, pending] = useActionState(saveNote, EMPTY)
  const lastSaved = useRef(initialContent)

  /**
   * "이 결과가 나온 뒤에 또 고쳤는가"를 상태 객체의 참조로 판단한다.
   * 액션이 끝날 때마다 state는 새 객체가 되므로, effect 없이도 알 수 있다.
   */
  const [typedAt, setTypedAt] = useState<FormState | null>(null)
  const saved = state !== EMPTY && !state.error && typedAt !== state

  return (
    <form action={formAction} className="flex h-full flex-col">
      <input type="hidden" name="path" value={path} />
      {weekStart && <input type="hidden" name="week_start" value={weekStart} />}

      {/* 괘선과 글줄을 맞추려면 textarea에 padding이 없어야 한다 */}
      <textarea
        name="content"
        defaultValue={initialContent}
        rows={rows}
        maxLength={5000}
        aria-label="메모"
        onChange={() => setTypedAt(state)}
        onBlur={(e) => {
          if (e.currentTarget.value === lastSaved.current) return
          lastSaved.current = e.currentTarget.value
          e.currentTarget.form?.requestSubmit()
        }}
        // text-sm은 줄 간격까지 같이 지정해서 괘선과 어긋난다. 크기만 준다.
        className="ruled w-full flex-1 resize-none bg-transparent p-0 text-[16px] text-ink-soft outline-none"
      />

      <div className="flex h-4 items-center justify-end gap-2 text-[11px]">
        {state.error && (
          <span role="alert" className="mr-auto text-danger">
            {state.error}
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
