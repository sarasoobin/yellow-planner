'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import {
  createItem,
  deleteItem,
  reorderItems,
  toggleItem,
  updateItem,
} from '@/lib/actions/items'
import { usePenHex } from '@/components/pen'
import type { FormState, Item, ItemKind } from '@/lib/types'

const EMPTY: FormState = { error: null }

type Props = {
  items: Item[]
  kind: ItemKind
  /** 새 항목에 붙일 날짜 ('YYYY-MM-DD') */
  date: string
  /** 저장 후 새로 그릴 경로 */
  path: string
  /** 내용이 적든 많든 최소 이만큼은 줄을 그어둔다 (공책 느낌) */
  minRows?: number
  placeholder?: string
}

/**
 * 빈 줄이든 글이 적힌 줄이든 높이가 같아야 괘선이 일정하다.
 * items-end 로 내용을 아래로 붙여야 글자가 줄 위에 앉는다.
 */
const ROW = 'flex h-line items-end gap-2 border-b border-rule pb-[3px]'

/** 종이에 그린 네모 체크박스 */
function Box({ checked }: { checked?: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid size-[13px] shrink-0 place-items-center border text-[9px] leading-none ${
        checked ? 'border-done text-done' : 'border-rule text-transparent'
      }`}
    >
      ✓
    </span>
  )
}

export function ItemList({
  items,
  kind,
  date,
  path,
  minRows = 4,
  placeholder = '',
}: Props) {
  // + 를 눌러 늘린 줄 수. 기본 줄을 다 채웠을 때만 필요하다.
  const [extraRows, setExtraRows] = useState(0)

  // 항상 최소 한 줄은 쓸 수 있어야 한다 (그 줄이 입력칸이 된다)
  const blankRows = Math.max(minRows - items.length, 1) + extraRows

  const listRef = useRef<HTMLUListElement>(null)
  const orderRef = useRef<HTMLInputElement>(null)
  const orderFormRef = useRef<HTMLFormElement>(null)

  const [from, setFrom] = useState<number | null>(null)
  const [to, setTo] = useState<number | null>(null)

  /**
   * 드래그 중 위치 계산에 쓸 기준값.
   * 줄 높이가 모두 같아서 "시작 위치 + 줄 높이"만 알면 몇 번째 줄인지 나온다.
   * 화면에서 줄이 섞여도 이 기준은 흔들리지 않는다.
   */
  const geom = useRef<{ top: number; height: number } | null>(null)

  // 드래그하는 동안 보이는 순서. 손을 떼기 전에 결과를 미리 보여준다.
  const view = useMemo(() => {
    if (from === null || to === null || from === to) return items
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    return next
  }, [items, from, to])

  function startDrag(index: number, event: React.PointerEvent) {
    const rows = listRef.current?.children
    const first = rows?.[0] as HTMLElement | undefined
    if (!first) return

    const rect = first.getBoundingClientRect()
    geom.current = { top: rect.top, height: rect.height }

    event.currentTarget.setPointerCapture(event.pointerId)
    setFrom(index)
    setTo(index)
  }

  function moveDrag(event: React.PointerEvent) {
    if (from === null || !geom.current) return
    const { top, height } = geom.current
    const raw = Math.floor((event.clientY - top) / height)
    setTo(Math.min(Math.max(raw, 0), items.length - 1))
  }

  function endDrag() {
    if (from !== null && to !== null && from !== to && orderRef.current) {
      orderRef.current.value = view.map((item) => item.id).join(',')
      orderFormRef.current?.requestSubmit()
    }
    setFrom(null)
    setTo(null)
    geom.current = null
  }

  return (
    <div className="flex flex-col">
      {/* 순서 저장 전용 폼. 화면에는 보이지 않는다. */}
      <form ref={orderFormRef} action={reorderItems} className="hidden">
        <input type="hidden" name="path" value={path} />
        <input ref={orderRef} type="hidden" name="ids" defaultValue="" />
      </form>

      <ul
        ref={listRef}
        className={`flex flex-col ${from !== null ? 'select-none' : ''}`}
      >
        {view.map((item, index) => (
          <ItemRow
            key={item.id}
            item={item}
            path={path}
            dragging={from !== null && to === index}
            onDragStart={(event) => startDrag(index, event)}
            onDragMove={moveDrag}
            onDragEnd={endDrag}
          />
        ))}

        {/* 첫 빈 줄은 바로 쓸 수 있는 입력칸, 나머지는 그냥 그어둔 줄 */}
        <li className={ROW}>
          <AddItemForm
            kind={kind}
            date={date}
            path={path}
            placeholder={placeholder}
          />
        </li>

        {Array.from({ length: Math.max(blankRows - 1, 0) }, (_, i) => (
          <li key={`blank-${i}`} className={ROW}>
            <Box />
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setExtraRows((n) => n + 1)}
        aria-label="줄 추가"
        className="mt-1 w-fit cursor-pointer px-1 text-sm leading-none text-ink-faint/70 transition-colors hover:text-accent"
      >
        +
      </button>
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
  const penHex = usePenHex()
  const formRef = useRef<HTMLFormElement>(null)
  const handled = useRef<FormState | null>(null)

  // 저장에 성공하면 입력칸을 비워 다음 줄을 바로 적을 수 있게 한다
  useEffect(() => {
    // EMPTY는 제출 전 초기값이다. 액션이 돌면 항상 새 객체가 오므로 참조로 구분한다.
    if (state === EMPTY) return
    // StrictMode가 effect를 두 번 실행해도 한 번만 처리한다
    if (handled.current === state) return
    handled.current = state

    if (!state.error) formRef.current?.reset()
  }, [state])

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex w-full items-center gap-2"
    >
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="path" value={path} />
      {/* 지금 고른 펜 색으로 저장된다 */}
      <input type="hidden" name="color" value={penHex} />

      <Box />
      <input
        name="content"
        required
        maxLength={200}
        placeholder={placeholder}
        aria-label={placeholder || '새 항목'}
        disabled={pending}
        style={{ color: penHex }}
        className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-faint/60 disabled:opacity-50"
      />

      {state.error && (
        <span role="alert" className="shrink-0 text-[10px] text-danger">
          {state.error}
        </span>
      )}
    </form>
  )
}

function ItemRow({
  item,
  path,
  dragging,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  item: Item
  path: string
  dragging: boolean
  onDragStart: (event: React.PointerEvent) => void
  onDragMove: (event: React.PointerEvent) => void
  onDragEnd: () => void
}) {
  const [editing, setEditing] = useState(false)

  return (
    <li
      className={`group ${ROW} ${dragging ? 'bg-frame/40' : ''}`}
      data-dragging={dragging || undefined}
    >
      {/* 완료 토글 */}
      <form action={toggleItem} className="flex shrink-0">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="is_done" value={String(item.is_done)} />
        <input type="hidden" name="path" value={path} />
        <button
          type="submit"
          aria-pressed={item.is_done}
          aria-label={`${item.content} ${item.is_done ? '완료 취소' : '완료'}`}
          // 체크박스도 그때 쓴 펜으로 그린 것처럼 같은 색을 옅게 쓴다
          style={
            !item.is_done && item.color
              ? { borderColor: `${item.color}66` }
              : undefined
          }
          className="grid size-[13px] cursor-pointer place-items-center border border-rule text-[9px] leading-none text-done transition-colors hover:border-done"
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
            // 완료한 줄은 색을 버리고 흐리게 — 지운 것처럼 보여야 한다
            style={
              !item.is_done && item.color ? { color: item.color } : undefined
            }
            className={`min-w-0 flex-1 cursor-text truncate text-left text-[14px] ${
              item.is_done ? 'text-ink-faint line-through' : 'text-ink-soft'
            }`}
          >
            {item.content}
          </button>

          {/* 순서 바꾸기 손잡이. 폰에서는 hover가 없어 항상 보인다. */}
          <button
            type="button"
            aria-label={`${item.content} 순서 바꾸기`}
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
            className="shrink-0 cursor-grab touch-none px-0.5 text-[11px] leading-none text-ink-faint/60 transition-opacity active:cursor-grabbing md:opacity-0 md:group-hover:opacity-100"
          >
            ⠿
          </button>

          <form action={deleteItem} className="flex shrink-0">
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="path" value={path} />
            <button
              type="submit"
              aria-label={`${item.content} 삭제`}
              className="cursor-pointer px-0.5 text-xs text-ink-faint/60 opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus:opacity-100"
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
    <form action={formAction} className="flex min-w-0 flex-1 items-center gap-1">
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
        // 다른 곳을 눌러도 적은 내용이 날아가지 않게, 바뀌었으면 저장하고 닫는다
        onBlur={(e) => {
          if (e.currentTarget.value.trim() === item.content) onDone()
          else e.currentTarget.form?.requestSubmit()
        }}
        style={item.color ? { color: item.color } : undefined}
        className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none"
      />
      {state.error && (
        <span role="alert" className="shrink-0 text-[10px] text-danger">
          {state.error}
        </span>
      )}
    </form>
  )
}
