'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import {
  createItem,
  deleteItem,
  toggleItem,
  updateItem,
} from '@/lib/actions/items'
import type { FormState, Item, ItemKind } from '@/lib/types'

const EMPTY: FormState = { error: null }

type Props = {
  items: Item[]
  kind: ItemKind
  /** 새 항목에 붙일 날짜 ('YYYY-MM-DD') */
  date: string
  /** 저장 후 새로 그릴 경로 */
  path: string
  placeholder?: string
  emptyText?: string
}

export function ItemList({
  items,
  kind,
  date,
  path,
  placeholder = '할 일을 적어보세요',
  emptyText,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && emptyText && (
        <p className="py-2 text-sm text-neutral-400">{emptyText}</p>
      )}

      <ul className="flex flex-col">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} path={path} />
        ))}
      </ul>

      <AddItemForm
        kind={kind}
        date={date}
        path={path}
        placeholder={placeholder}
      />
    </div>
  )
}

function AddItemForm({
  kind,
  date,
  path,
  placeholder,
}: Pick<Props, 'kind' | 'date' | 'path'> & { placeholder: string }) {
  const [state, formAction, pending] = useActionState(createItem, EMPTY)
  const formRef = useRef<HTMLFormElement>(null)
  const handled = useRef<FormState | null>(null)

  // 저장에 성공하면 입력칸을 비워 다음 항목을 바로 적을 수 있게 한다
  useEffect(() => {
    // EMPTY는 제출 전 초기값이다. 액션이 돌면 항상 새 객체가 오므로 참조로 구분한다.
    if (state === EMPTY) return
    // StrictMode가 effect를 두 번 실행해도 한 번만 처리한다
    if (handled.current === state) return
    handled.current = state

    if (!state.error) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="path" value={path} />

      <div className="flex items-center gap-2">
        <span aria-hidden className="text-neutral-300">
          +
        </span>
        <input
          name="content"
          required
          maxLength={200}
          placeholder={placeholder}
          aria-label={placeholder}
          disabled={pending}
          className="w-full border-b border-transparent bg-transparent py-1 text-sm outline-none placeholder:text-neutral-300 focus:border-neutral-400 disabled:opacity-50"
        />
      </div>

      {state.error && (
        <p role="alert" className="pl-5 text-xs text-red-600">
          {state.error}
        </p>
      )}
    </form>
  )
}

function ItemRow({ item, path }: { item: Item; path: string }) {
  const [editing, setEditing] = useState(false)

  return (
    <li className="group flex items-center gap-2 border-b border-neutral-100 py-1">
      {/* 완료 토글 */}
      <form action={toggleItem} className="flex">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="is_done" value={String(item.is_done)} />
        <input type="hidden" name="path" value={path} />
        <button
          type="submit"
          aria-pressed={item.is_done}
          aria-label={`${item.content} ${item.is_done ? '완료 취소' : '완료'}`}
          className="grid size-4 shrink-0 place-items-center border border-neutral-400 text-[10px] leading-none"
        >
          {item.is_done ? '✓' : ''}
        </button>
      </form>

      {editing ? (
        <EditItemForm
          item={item}
          path={path}
          onDone={() => setEditing(false)}
        />
      ) : (
        <>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={`flex-1 truncate text-left text-sm ${
              item.is_done ? 'text-neutral-400 line-through' : ''
            }`}
          >
            {item.content}
          </button>

          <form action={deleteItem} className="flex">
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="path" value={path} />
            <button
              type="submit"
              aria-label={`${item.content} 삭제`}
              className="px-1 text-xs text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 hover:text-red-600"
            >
              ✕
            </button>
          </form>
        </>
      )}
    </li>
  )
}

function EditItemForm({
  item,
  path,
  onDone,
}: {
  item: Item
  path: string
  onDone: () => void
}) {
  const [state, formAction] = useActionState(updateItem, EMPTY)
  const handled = useRef<FormState | null>(null)

  // 저장에 성공했을 때만 수정 모드를 닫는다.
  // 열자마자 닫히지 않도록 "아직 제출 전"과 "이미 처리함"을 모두 걸러낸다.
  useEffect(() => {
    if (state === EMPTY) return
    if (handled.current === state) return
    handled.current = state

    if (!state.error) onDone()
  }, [state, onDone])

  return (
    <form action={formAction} className="flex flex-1 items-center gap-2">
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="path" value={path} />
      <input
        name="content"
        defaultValue={item.content}
        required
        maxLength={200}
        autoFocus
        aria-label="내용 수정"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onDone()
        }}
        className="flex-1 border-b border-neutral-400 bg-transparent py-1 text-sm outline-none"
      />
      <button type="submit" className="text-xs text-neutral-500">
        저장
      </button>
      <button
        type="button"
        onClick={onDone}
        className="text-xs text-neutral-400"
      >
        취소
      </button>
      {state.error && (
        <span role="alert" className="text-xs text-red-600">
          {state.error}
        </span>
      )}
    </form>
  )
}
