'use client'

import { useRef, useState } from 'react'
import { deleteItem, moveSticker, placeSticker } from '@/lib/actions/items'
import { useArmedSticker } from '@/components/toolbar'
import { stickerSrc } from '@/lib/stickers'
import type { Item } from '@/lib/types'

/**
 * 페이지 위에 스티커를 자유롭게 붙이는 층.
 *
 * 위에서 스티커를 집어들면 이 층이 클릭을 가로채, 누른 자리에 붙인다.
 * 붙인 스티커는 끌어서 옮기고, 위에 마우스를 올리면 나오는 ✕ 로 뗀다.
 *
 * 자리는 페이지 크기 대비 %로 저장한다. 창을 줄여도 제자리에 남는다.
 */
export function StickerLayer({
  stickers,
  date,
  path,
  className = '',
  children,
}: {
  stickers: Item[]
  /** 이 페이지의 기준일 (표지는 1월 1일, 월간은 그 달 1일 …) */
  date: string
  path: string
  className?: string
  children: React.ReactNode
}) {
  const { armed, setArmed } = useArmedSticker()
  const layerRef = useRef<HTMLDivElement>(null)

  const placeRef = useRef<HTMLFormElement>(null)
  const moveRef = useRef<HTMLFormElement>(null)
  const fields = useRef<Record<string, HTMLInputElement | null>>({})

  // 끄는 동안 보여줄 임시 자리. 손을 떼면 저장한다.
  const [dragged, setDragged] = useState<{
    id: string
    x: number
    y: number
  } | null>(null)

  function percentOf(clientX: number, clientY: number) {
    const rect = layerRef.current?.getBoundingClientRect()
    if (!rect) return null
    return {
      x: Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 0), 100),
      y: Math.min(Math.max(((clientY - rect.top) / rect.height) * 100, 0), 100),
    }
  }

  function handlePlace(event: React.MouseEvent) {
    if (!armed) return
    const at = percentOf(event.clientX, event.clientY)
    if (!at) return

    // 아래에 있는 달력 칸이나 입력칸이 같이 눌리면 안 된다
    event.preventDefault()
    event.stopPropagation()

    if (fields.current.sticker) fields.current.sticker.value = armed
    if (fields.current.px) fields.current.px.value = String(at.x)
    if (fields.current.py) fields.current.py.value = String(at.y)
    placeRef.current?.requestSubmit()
    setArmed(null)
  }

  function endMove() {
    if (!dragged) return
    if (fields.current.id) fields.current.id.value = dragged.id
    if (fields.current.mx) fields.current.mx.value = String(dragged.x)
    if (fields.current.my) fields.current.my.value = String(dragged.y)
    moveRef.current?.requestSubmit()
    setDragged(null)
  }

  return (
    <div
      ref={layerRef}
      onClickCapture={handlePlace}
      className={`relative ${armed ? 'cursor-copy' : ''} ${className}`}
    >
      {children}

      {/* 저장 전용 폼. 화면에는 보이지 않는다. */}
      <form ref={placeRef} action={placeSticker} className="hidden">
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="path" value={path} />
        <input
          ref={(el) => {
            fields.current.sticker = el
          }}
          type="hidden"
          name="sticker"
        />
        <input
          ref={(el) => {
            fields.current.px = el
          }}
          type="hidden"
          name="x"
        />
        <input
          ref={(el) => {
            fields.current.py = el
          }}
          type="hidden"
          name="y"
        />
      </form>

      <form ref={moveRef} action={moveSticker} className="hidden">
        <input type="hidden" name="path" value={path} />
        <input
          ref={(el) => {
            fields.current.id = el
          }}
          type="hidden"
          name="id"
        />
        <input
          ref={(el) => {
            fields.current.mx = el
          }}
          type="hidden"
          name="x"
        />
        <input
          ref={(el) => {
            fields.current.my = el
          }}
          type="hidden"
          name="y"
        />
      </form>

      {/* 붙인 스티커. 층 자체는 클릭을 막지 않고 스티커만 잡힌다. */}
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        {stickers.map((sticker) => {
          const src = stickerSrc(sticker.content)
          if (!src) return null

          const moving = dragged?.id === sticker.id
          const x = moving ? dragged.x : (sticker.style?.x ?? 50)
          const y = moving ? dragged.y : (sticker.style?.y ?? 50)

          return (
            <div
              key={sticker.id}
              style={{ left: `${x}%`, top: `${y}%` }}
              className="group pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
            >
              <button
                type="button"
                aria-label="스티커 옮기기"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId)
                  setDragged({ id: sticker.id, x, y })
                }}
                onPointerMove={(e) => {
                  if (!dragged) return
                  const at = percentOf(e.clientX, e.clientY)
                  if (at) setDragged({ id: sticker.id, ...at })
                }}
                onPointerUp={endMove}
                onPointerCancel={endMove}
                // 스티커를 잡을 때 아래 글이 선택되거나 화면이 스크롤되면 안 된다
                className="block cursor-grab touch-none active:cursor-grabbing"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  className={`size-8 select-none transition-transform ${
                    moving ? 'scale-110' : ''
                  }`}
                />
              </button>

              <form
                action={deleteItem}
                className="absolute -top-1 -right-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
              >
                <input type="hidden" name="id" value={sticker.id} />
                <input type="hidden" name="path" value={path} />
                <button
                  type="submit"
                  aria-label="스티커 떼기"
                  className="grid size-4 cursor-pointer place-items-center rounded-full border border-rule bg-paper text-[9px] leading-none text-ink-faint hover:text-danger"
                >
                  ✕
                </button>
              </form>
            </div>
          )
        })}
      </div>
    </div>
  )
}
