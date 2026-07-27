'use client'

import { useActionState } from 'react'
import { saveDaily } from '@/lib/actions/items'
import { usePenHex } from '@/components/pen'
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
  const penHex = usePenHex()
  const saved = item?.content ?? ''
  // 이미 적힌 줄은 그때 쓴 펜 색을 지키고, 새로 적을 때는 지금 든 펜을 쓴다
  const hex = item?.color ?? penHex

  return (
    <form action={formAction} className="flex min-w-0 flex-1">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="path" value={path} />
      <input type="hidden" name="color" value={hex} />
      {item && <input type="hidden" name="id" value={item.id} />}

      <input
        name="content"
        defaultValue={saved}
        maxLength={200}
        aria-label={`${date} 한 줄`}
        title={state.error ?? undefined}
        onBlur={(e) => {
          if (e.currentTarget.value.trim() !== saved) {
            e.currentTarget.form?.requestSubmit()
          }
        }}
        style={state.error ? undefined : { color: hex }}
        className={`min-w-0 flex-1 border-b border-dotted bg-transparent pb-px text-[11px] outline-none transition-colors ${
          state.error ? 'border-danger text-danger' : 'border-rule focus:border-accent'
        }`}
      />
    </form>
  )
}
