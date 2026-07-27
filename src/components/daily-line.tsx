'use client'

import { useActionState } from 'react'
import { saveDaily } from '@/lib/actions/items'
import { DEFAULT_DRAFT, WritingInput } from '@/components/writing-input'
import type { FormState, Item } from '@/lib/types'

const EMPTY: FormState = { error: null }

/**
 * 주간 페이지에서 요일·날짜 옆 남는 칸에 적는 한 줄.
 * 격언이나 그 날 꼭 해야 하는 것. 하루에 하나만 있다.
 *
 * 별도 저장 버튼 없이 Enter 또는 포커스가 빠질 때 저장한다.
 * 종이에 적는 느낌이라 버튼이 끼어들면 어색하다.
 */
export function DailyLine({
  item,
  date,
  path,
}: {
  item?: Item
  date: string
  path: string
}) {
  const [state, formAction] = useActionState(saveDaily, EMPTY)
  const saved = item?.content ?? ''
  // 이미 적힌 줄은 그때 쓴 도구를 지킨다. 새로 적을 때는 기본값에서 시작한다.
  const hex = item?.color ?? DEFAULT_DRAFT.color
  const style = item?.style ?? DEFAULT_DRAFT.style

  return (
    <form action={formAction} className="flex min-w-0 flex-1">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="path" value={path} />
      {item && <input type="hidden" name="id" value={item.id} />}

      <WritingInput
        key={item?.id ?? `${hex}-${JSON.stringify(style)}`}
        defaultValue={saved}
        initial={{ color: hex, style }}
        ariaLabel={`${date} 한 줄`}
        // 비우면 지운다. 빈 줄을 남겨두는 게 종이 노트에 가깝다.
        required={false}
        allowCheck={false}
        onBlur={(e) => e.currentTarget.form?.requestSubmit()}
        className={`border-b border-dotted pb-px text-[11px] ${
          state.error ? 'border-danger' : 'border-rule focus:border-accent'
        }`}
      />
    </form>
  )
}
