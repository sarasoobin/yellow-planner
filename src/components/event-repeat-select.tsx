'use client'

import { useState, useTransition } from 'react'
import { setEventRepeat } from '@/lib/actions/items'
import { REPEAT_LABELS } from '@/lib/repetition'
import {
  REPEAT_FREQUENCIES,
  type RepeatFrequency,
} from '@/lib/types'

/**
 * 이미 적힌 일정에만 붙는 작은 반복 선택기.
 * 내용이 없는 칸에는 event 행이 없으므로, 먼저 일정을 쓰고 자동 저장된 뒤 보인다.
 */
export function EventRepeatSelect({
  id,
  repeat,
  path,
}: {
  id: string
  repeat: RepeatFrequency
  path: string
}) {
  const [value, setValue] = useState(repeat)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <label className="flex items-center gap-1 text-[11px] text-ink-faint">
      <span aria-hidden className="text-[13px] leading-none">
        ↻
      </span>
      <span className="sr-only">반복 일정</span>
      <select
        aria-label="반복 일정"
        value={value}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value as RepeatFrequency
          const previous = value
          setValue(next)
          setError(null)
          startTransition(async () => {
            const result = await setEventRepeat({ id, repeat: next, path })
            if (result.error) {
              setValue(previous)
              setError(result.error)
            }
          })
        }}
        className="max-w-20 cursor-pointer appearance-none bg-transparent pr-1 text-[11px] text-ink-faint outline-none hover:text-accent disabled:cursor-wait"
      >
        {REPEAT_FREQUENCIES.map((frequency) => (
          <option key={frequency} value={frequency}>
            {REPEAT_LABELS[frequency]}
          </option>
        ))}
      </select>
      {error && <span role="alert" className="sr-only">{error}</span>}
    </label>
  )
}
