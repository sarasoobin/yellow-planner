'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import {
  createItem,
  deleteItem,
  reorderItems,
  setItemCheck,
  toggleItem,
  updateItem,
} from '@/lib/actions/items'
import { DEFAULT_DRAFT, WritingInput } from '@/components/writing-input'
import { CheckMark, Sticker, writtenStyle } from '@/components/written'
import { lastLineOf, layoutLines } from '@/lib/lines'
import {
  defaultCheck,
  type FormState,
  type Item,
  type ItemKind,
} from '@/lib/types'

const EMPTY: FormState = { error: null }

/**
 * 공책의 한 면.
 *
 * 종이처럼 아무 줄이나 눌러서 바로 쓸 수 있다. 일곱째 줄을 누르면
 * 일곱째 줄에 남는다 — 줄 번호를 sort_order 에 저장하기 때문이다.
 * Enter 를 치면 아래 줄로 내려간다. 체크박스는 `/` 로 줄마다 붙인다.
 */

type Props = {
  items: Item[]
  kind: ItemKind
  /** 새 항목에 붙일 날짜 ('YYYY-MM-DD') */
  date: string
  /** 저장 후 새로 그릴 경로 */
  path: string
  /** 최소 이만큼은 줄을 그어둔다 */
  minRows?: number
  placeholder?: string
}

const ROW = 'flex h-line items-end gap-2 border-b border-rule pb-[3px]'
const SLOT = 'relative size-[13px] shrink-0'

export function ItemList({
  items,
  kind,
  date,
  path,
  minRows = 4,
  placeholder = '',
}: Props) {
  const [active, setActive] = useState<number | null>(null)
  const [extraRows, setExtraRows] = useState(0)

  const byLine = useMemo(() => layoutLines(items), [items])
  const rows =
    Math.max(minRows, lastLineOf(byLine) + 2, (active ?? -1) + 2) + extraRows

  const listRef = useRef<HTMLUListElement>(null)
  const orderRef = useRef<HTMLInputElement>(null)
  const orderFormRef = useRef<HTMLFormElement>(null)
  const geom = useRef<{ top: number; height: number } | null>(null)

  // 적힌 줄만 순서대로. 드래그는 이 순서 위에서 자리를 바꾼다.
  const occupied = useMemo(
    () => [...byLine.keys()].sort((a, b) => a - b),
    [byLine],
  )
  const [from, setFrom] = useState<number | null>(null)
  const [to, setTo] = useState<number | null>(null)

  // 끄는 동안 보여줄 순서. 어느 줄이 채워져 있는지는 그대로 두고 내용만 옮긴다.
  const preview = useMemo(() => {
    if (from === null || to === null || from === to) return byLine
    const ordered = occupied.map((line) => byLine.get(line)!)
    const next = [...ordered]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)

    const shuffled = new Map<number, Item>()
    occupied.forEach((line, i) => shuffled.set(line, next[i]))
    return shuffled
  }, [byLine, occupied, from, to])

  function orderedIndexAt(clientY: number): number {
    if (!geom.current) return 0
    const { top, height } = geom.current
    const row = Math.floor((clientY - top) / height)
    const count = occupied.filter((line) => line < row).length
    return Math.min(Math.max(count, 0), occupied.length - 1)
  }

  function startDrag(orderedIndex: number, event: React.PointerEvent) {
    const first = listRef.current?.children[0] as HTMLElement | undefined
    if (!first) return
    const rect = first.getBoundingClientRect()
    geom.current = { top: rect.top, height: rect.height }

    event.currentTarget.setPointerCapture(event.pointerId)
    setFrom(orderedIndex)
    setTo(orderedIndex)
  }

  function endDrag() {
    if (from !== null && to !== null && from !== to && orderRef.current) {
      // "줄번호:id" 로 넘긴다. 어느 줄이 채워져 있었는지를 그대로 유지한다.
      orderRef.current.value = occupied
        .map((line) => `${line}:${preview.get(line)?.id ?? ''}`)
        .filter((pair) => !pair.endsWith(':'))
        .join(',')
      orderFormRef.current?.requestSubmit()
    }
    setFrom(null)
    setTo(null)
    geom.current = null
  }

  return (
    <div className="flex flex-col">
      <form ref={orderFormRef} action={reorderItems} className="hidden">
        <input type="hidden" name="path" value={path} />
        <input ref={orderRef} type="hidden" name="lines" defaultValue="" />
      </form>

      <ul
        ref={listRef}
        className={`flex flex-col ${from !== null ? 'select-none' : ''}`}
      >
        {Array.from({ length: rows }, (_, line) => {
          const item = preview.get(line)
          const orderedIndex = occupied.indexOf(line)

          if (active === line) {
            return (
              <li key={`edit-${line}`} className={ROW}>
                <LineEditor
                  item={item}
                  line={line}
                  kind={kind}
                  date={date}
                  path={path}
                  placeholder={line === 0 ? placeholder : ''}
                  onNext={() => setActive(line + 1)}
                  onClose={() => setActive(null)}
                />
              </li>
            )
          }

          return (
            <StaticLine
              key={item?.id ?? `blank-${line}`}
              item={item}
              kind={kind}
              path={path}
              dragging={from !== null && to === orderedIndex}
              onWrite={() => setActive(line)}
              onDragStart={(e) => startDrag(orderedIndex, e)}
              onDragMove={(e) => {
                if (from !== null) setTo(orderedIndexAt(e.clientY))
              }}
              onDragEnd={endDrag}
            />
          )
        })}
      </ul>

      <button
        type="button"
        onClick={() => setExtraRows((n) => n + 3)}
        aria-label="줄 늘리기"
        className="mt-1 w-fit cursor-pointer px-1 text-sm leading-none text-ink-faint/70 transition-colors hover:text-accent"
      >
        +
      </button>
    </div>
  )
}

/** 아직 안 누른 줄. 눌러야 쓸 수 있게 되는 게 아니라, 누르는 순간 바로 써진다. */
function StaticLine({
  item,
  kind,
  path,
  dragging,
  onWrite,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  item?: Item
  kind: ItemKind
  path: string
  dragging: boolean
  onWrite: () => void
  onDragStart: (e: React.PointerEvent) => void
  onDragMove: (e: React.PointerEvent) => void
  onDragEnd: () => void
}) {
  const hasBox = item ? (item.style?.check ?? defaultCheck(kind)) : false

  return (
    <li className={`group ${ROW} ${dragging ? 'bg-frame/40' : ''}`}>
      <span className={SLOT}>
        {item && hasBox && (
          <form action={toggleItem} className="flex">
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="is_done" value={String(item.is_done)} />
            <input type="hidden" name="path" value={path} />
            <button
              type="submit"
              aria-pressed={item.is_done}
              aria-label={`${item.content} ${item.is_done ? '완료 취소' : '완료'}`}
              style={item.color ? { borderColor: `${item.color}66` } : undefined}
              className="block size-[13px] cursor-pointer border border-rule transition-colors hover:border-today"
            />
          </form>
        )}
        {item && hasBox && item.is_done && <CheckMark />}
      </span>

      <button
        type="button"
        onClick={onWrite}
        className="flex min-w-0 flex-1 cursor-text items-center gap-1 self-stretch text-left"
      >
        {item && (
          <>
            <Sticker name={item.style?.sticker} />
            <span
              className="truncate"
              style={writtenStyle(item.color, item.style, item.is_done)}
            >
              {item.content}
            </span>
          </>
        )}
      </button>

      {item && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-45 transition-opacity focus-within:opacity-100 hover:opacity-100 md:opacity-0 md:group-hover:opacity-100">
          <form action={setItemCheck} className="flex">
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="path" value={path} />
            <input type="hidden" name="check" value={String(!hasBox)} />
            <button
              type="submit"
              aria-label={hasBox ? '체크박스 떼기' : '체크박스 붙이기'}
              title={hasBox ? '체크박스 떼기' : '체크박스 붙이기'}
              className={`px-0.5 text-[11px] leading-none ${
                hasBox
                  ? 'text-accent hover:text-danger'
                  : 'text-ink-faint/60 hover:text-accent'
              }`}
            >
              ☐
            </button>
          </form>

          <button
            type="button"
            aria-label={`${item.content} 순서 바꾸기`}
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
            className="cursor-grab touch-none px-0.5 text-[11px] leading-none text-ink-faint/60 active:cursor-grabbing"
          >
            ⠿
          </button>

          <form action={deleteItem} className="flex">
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="path" value={path} />
            <button
              type="submit"
              aria-label={`${item.content} 삭제`}
              className="px-0.5 text-xs leading-none text-ink-faint/60 hover:text-danger"
            >
              ✕
            </button>
          </form>
        </div>
      )}
    </li>
  )
}

/** 지금 쓰고 있는 줄. 있으면 고치고, 없으면 새로 만든다. */
export function LineEditor({
  item,
  line,
  kind,
  date,
  path,
  placeholder = '',
  showBox = true,
  className = 'text-[14px]',
  onNext,
  onClose,
}: {
  item?: Item
  line: number
  kind: ItemKind
  date: string
  path: string
  placeholder?: string
  showBox?: boolean
  className?: string
  onNext: () => void
  onClose: () => void
}) {
  const [state, formAction] = useActionState(
    item ? updateItem : createItem,
    EMPTY,
  )
  const handled = useRef<FormState | null>(null)
  // Enter로 저장했으면 결과가 온 뒤 아래 줄로 내려간다
  const goDown = useRef(false)

  useEffect(() => {
    if (state === EMPTY) return
    if (handled.current === state) return
    handled.current = state
    if (state.error) return

    if (goDown.current) {
      goDown.current = false
      onNext()
    } else {
      onClose()
    }
  }, [state, onNext, onClose])

  return (
    <form action={formAction} className="flex w-full items-end gap-2">
      {item ? (
        <input type="hidden" name="id" value={item.id} />
      ) : (
        <>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="date" value={date} />
          {/* 누른 줄에 그대로 남게 줄 번호를 함께 보낸다 */}
          <input type="hidden" name="line" value={line} />
        </>
      )}
      <input type="hidden" name="path" value={path} />

      <WritingInput
        autoFocus
        defaultValue={item?.content ?? ''}
        placeholder={placeholder}
        required={false}
        initial={{
          color: item?.color ?? DEFAULT_DRAFT.color,
          style: item?.style ?? { check: defaultCheck(kind) },
        }}
        showBox={showBox}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onClose()
            return
          }
          if (e.key !== 'Enter') return

          // 빈 줄에서 Enter는 그냥 한 칸 내려간다. 종이에서 하듯이.
          if (!e.currentTarget.value.trim()) {
            e.preventDefault()
            onClose()
            onNext()
            return
          }
          goDown.current = true
        }}
        onBlur={(e) => {
          const value = e.currentTarget.value.trim()
          if (!value || value === item?.content) onClose()
          else e.currentTarget.form?.requestSubmit()
        }}
        className={className}
      />

      {state.error && (
        <span role="alert" className="shrink-0 text-[10px] text-danger">
          {state.error}
        </span>
      )}
    </form>
  )
}
