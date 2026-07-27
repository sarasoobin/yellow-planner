'use client'

import { useActionState, useState } from 'react'
import { saveNote } from '@/lib/actions/notes'
import type { FormState } from '@/lib/types'

const EMPTY: FormState = { error: null }

export function NoteEditor({
  initialContent,
  weekStart,
  path,
  placeholder = '자유롭게 적어보세요',
  rows = 6,
  lined = false,
}: {
  initialContent: string
  /** 주간 메모면 그 주의 월요일, Free Note면 null */
  weekStart: string | null
  path: string
  placeholder?: string
  rows?: number
  lined?: boolean
}) {
  const [state, formAction, pending] = useActionState(saveNote, EMPTY)

  /**
   * "이 결과가 나온 뒤에 사용자가 또 고쳤는가"를 상태 객체의 참조로 판단한다.
   * 액션이 끝날 때마다 state는 새 객체가 되므로, 타이핑 시점에 붙잡아둔 객체와
   * 지금 state를 비교하면 effect 없이도 저장/수정 여부를 알 수 있다.
   */
  const [typedAt, setTypedAt] = useState<FormState | null>(null)
  const edited = typedAt === state

  const saved = state !== EMPTY && !state.error && !edited
  // 저장에 실패했다면 고치지 않았더라도 다시 눌러볼 수 있어야 한다
  const canSave = edited || Boolean(state.error)

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="path" value={path} />
      {weekStart && <input type="hidden" name="week_start" value={weekStart} />}

      <textarea
        name="content"
        defaultValue={initialContent}
        rows={rows}
        maxLength={5000}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={() => setTypedAt(state)}
        className={`w-full resize-y bg-transparent px-1 py-1 text-sm text-ink-soft outline-none placeholder:text-ink-faint/70 ${
          lined ? 'ruled' : ''
        }`}
      />

      <div className="flex items-center justify-end gap-3">
        {state.error && (
          <span role="alert" className="mr-auto text-xs text-danger">
            {state.error}
          </span>
        )}
        {saved && (
          <span role="status" className="text-xs text-done">
            저장됨
          </span>
        )}
        <button
          type="submit"
          disabled={pending || !canSave}
          className="cursor-pointer border border-accent px-3 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-paper disabled:cursor-default disabled:border-rule disabled:text-ink-faint disabled:hover:bg-transparent disabled:hover:text-ink-faint"
        >
          {pending ? '저장 중…' : '저장'}
        </button>
      </div>
    </form>
  )
}
