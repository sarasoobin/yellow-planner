'use client'

import { useActionState, useRef, useState } from 'react'
import { deleteItem, moveSticker, placeSticker } from '@/lib/actions/items'
import { useArmedSticker } from '@/components/toolbar'
import { stickerSrc } from '@/lib/stickers'
import { STICKER_SCALE, STICKER_SIZE, type FormState, type Item } from '@/lib/types'

const EMPTY: FormState = { error: null }

/**
 * 페이지 위에 스티커를 자유롭게 붙이는 층.
 *
 * 위에서 스티커를 집어들면 이 층이 클릭을 가로채, 누른 자리에 붙인다.
 * 붙인 스티커는 끌어서 옮기고, 오른쪽 아래 모서리를 끌면 크기가 바뀌고,
 * 위에 마우스를 올리면 나오는 ✕ 로 뗀다. 사진을 붙이고 만지는 것과 같다.
 *
 * 자리는 페이지 크기 대비 %로 저장한다. 창을 줄여도 제자리에 남는다.
 * 크기는 배율로 저장한다. 화면 폭이 달라도 글자와의 비율이 유지된다.
 */

/**
 * 크기를 바꾸는 동안 그림을 몇 px 짜리로 그려둘지.
 *
 * width/height 를 프레임마다 바꾸면 브라우저가 그때마다 SVG 를 그 크기로 다시
 * 그린다. 별 스티커는 색연필 결을 내려고 feTurbulence 를 쓰는데 이게 비싸서,
 * 끄는 내내 다시 그리면 손이 뚝뚝 끊긴다.
 *
 * 그래서 끄는 동안에는 그림 크기를 이 값으로 붙들어두고 transform 으로만
 * 늘린다. transform 은 이미 그려둔 것을 늘리는 것이라 다시 그리지 않는다.
 * 손을 떼면 진짜 크기로 되돌려 또렷하게 만든다.
 */
const RASTER = 128

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
  const [placeState, placeAction, placing] = useActionState(placeSticker, EMPTY)
  const [moveState, moveAction, moving] = useActionState(moveSticker, EMPTY)

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

  /** 옮기거나 키운 것을 저장한다. 자리와 크기를 함께 보낸다 */
  function saveSpot(id: string, x: number, y: number, scale: number) {
    if (fields.current.id) fields.current.id.value = id
    if (fields.current.mx) fields.current.mx.value = String(x)
    if (fields.current.my) fields.current.my.value = String(y)
    if (fields.current.ms) fields.current.ms.value = String(scale)
    moveRef.current?.requestSubmit()
  }

  return (
    <div
      ref={layerRef}
      onClickCapture={handlePlace}
      className={`relative ${armed ? 'cursor-copy' : ''} ${className}`}
    >
      {children}

      {/* 저장 전용 폼. 화면에는 보이지 않는다. */}
      <form ref={placeRef} action={placeAction} className="hidden">
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

      <form ref={moveRef} action={moveAction} className="hidden">
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
        <input
          ref={(el) => {
            fields.current.ms = el
          }}
          type="hidden"
          name="scale"
        />
      </form>

      {/* 붙인 스티커. 층 자체는 클릭을 막지 않고 스티커만 잡힌다. */}
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        {stickers.map((sticker) => {
          const src = stickerSrc(sticker.content)
          if (!src) return null

          return (
            <PlacedSticker
              key={sticker.id}
              sticker={sticker}
              src={src}
              path={path}
              layerRect={() => layerRef.current?.getBoundingClientRect() ?? null}
              onCommit={saveSpot}
            />
          )
        })}
      </div>

      {(placeState.error || moveState.error) && (
        <p
          role="alert"
          className="pointer-events-none absolute right-2 bottom-2 z-30 max-w-xs bg-paper/95 px-2 py-1 text-[11px] text-danger shadow-notebook"
        >
          {placeState.error || moveState.error}
        </p>
      )}
      {(placing || moving) && (
        <p className="pointer-events-none absolute right-2 bottom-2 z-30 bg-paper/95 px-2 py-1 text-[11px] text-ink-faint shadow-notebook">
          저장 중…
        </p>
      )}
    </div>
  )
}

/**
 * 붙어 있는 스티커 하나.
 *
 * 끄는 동안의 상태를 이 안에서만 쥔다. 층에서 쥐면 손을 움직일 때마다 층
 * 전체가 다시 그려져 스티커가 여러 개일수록 뚝뚝 끊긴다.
 *
 * 옮기는 동안에는 left/top 을 건드리지 않고 transform 으로만 민다.
 * left/top 을 바꾸면 브라우저가 자리를 다시 계산하지만 transform 은 아니다.
 * 손을 떼는 순간에만 % 로 바꿔 저장한다.
 */
function PlacedSticker({
  sticker,
  src,
  path,
  layerRect,
  onCommit,
}: {
  sticker: Item
  src: string
  path: string
  layerRect: () => DOMRect | null
  onCommit: (id: string, x: number, y: number, scale: number) => void
}) {
  const [deleteState, deleteAction, deleting] = useActionState(deleteItem, EMPTY)
  /*
   * 방금 놓은 자리.
   *
   * 손을 떼면 서버에 저장하는데, 그 답이 올 때까지 화면이 이 값을 붙들고
   * 있어야 한다. 안 그러면 놓는 순간 원래 자리로 되돌아갔다가 답이 온 뒤
   * 새 자리로 튄다. 내 컴퓨터에서는 왕복이 50ms 라 안 보였지만 배포된
   * 서버에서는 눈에 띄게 튀었다.
   */
  const [placed, setPlaced] = useState<{
    x: number
    y: number
    scale: number
  } | null>(null)

  const savedX = placed?.x ?? sticker.style?.x ?? 50
  const savedY = placed?.y ?? sticker.style?.y ?? 50
  const savedScale = placed?.scale ?? sticker.style?.scale ?? 1

  // 끄는 동안 얼마나 밀렸는지(px). 손을 떼면 % 로 바꿔 저장한다
  const [shift, setShift] = useState<{ dx: number; dy: number } | null>(null)
  // 끄는 동안의 배율. 손을 떼면 저장한다
  const [sizing, setSizing] = useState<number | null>(null)

  const from = useRef({ x: 0, y: 0 })
  const boxRef = useRef<HTMLDivElement>(null)
  // 잡는 순간의 종이 크기. 끄는 내내 안 변하므로 한 번만 재둔다
  const paper = useRef<DOMRect | null>(null)

  const scale = sizing ?? savedScale
  const size = STICKER_SIZE * scale
  const moving = shift !== null
  const resizing = sizing !== null

  /**
   * 손끝이 움직인 만큼을 종이 안으로 가둔다.
   *
   * 끄는 동안에는 아무 데나 따라가게 두고 저장할 때만 가두면, 종이 밖까지
   * 끌었다가 손을 뗀 순간 스티커가 안쪽으로 튀어 들어온다. 게다가 종이 밖은
   * 잘려서 보이지도 않는다. 보이는 그대로가 저장되도록 끄는 동안 가둔다.
   */
  function clamp(dx: number, dy: number) {
    const rect = paper.current
    if (!rect) return { dx, dy, x: savedX, y: savedY }

    const x = Math.min(Math.max(savedX + (dx / rect.width) * 100, 0), 100)
    const y = Math.min(Math.max(savedY + (dy / rect.height) * 100, 0), 100)
    return {
      dx: ((x - savedX) / 100) * rect.width,
      dy: ((y - savedY) / 100) * rect.height,
      x,
      y,
    }
  }

  function endMove() {
    if (!shift) return
    const at = clamp(shift.dx, shift.dy)
    // 화면이 먼저 그 자리를 붙들고, 저장은 뒤따른다
    setPlaced({ x: at.x, y: at.y, scale })
    setShift(null)
    onCommit(sticker.id, at.x, at.y, scale)
  }

  function endResize() {
    if (sizing === null) return
    setPlaced({ x: savedX, y: savedY, scale: sizing })
    setSizing(null)
    onCommit(sticker.id, savedX, savedY, sizing)
  }

  return (
    <div
      ref={boxRef}
      style={{
        left: `${savedX}%`,
        top: `${savedY}%`,
        width: `${size}px`,
        height: `${size}px`,
        transform: `translate(-50%, -50%) translate(${shift?.dx ?? 0}px, ${shift?.dy ?? 0}px)`,
      }}
      className="group pointer-events-auto absolute"
    >
      <button
        type="button"
        aria-label="스티커 옮기기"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          from.current = { x: e.clientX, y: e.clientY }
          paper.current = layerRect()
          setShift({ dx: 0, dy: 0 })
        }}
        onPointerMove={(e) => {
          if (!moving) return
          const at = clamp(e.clientX - from.current.x, e.clientY - from.current.y)
          setShift({ dx: at.dx, dy: at.dy })
        }}
        onPointerUp={endMove}
        onPointerCancel={endMove}
        // 스티커를 잡을 때 아래 글이 선택되거나 화면이 스크롤되면 안 된다
        className="block size-full cursor-grab touch-none active:cursor-grabbing"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          style={
            resizing
              ? {
                  // 끄는 동안에는 다시 그리지 않는다 (RASTER 주석)
                  width: `${RASTER}px`,
                  height: `${RASTER}px`,
                  transform: `scale(${size / RASTER})`,
                  transformOrigin: '0 0',
                }
              : { width: `${size}px`, height: `${size}px` }
          }
          /*
           * 집어들면 살짝 커지고 그림자가 진다. 사진을 종이에서 떼어
           * 든 것처럼 보이게 하는 것이다. 흐려지게 하면 사진 같지 않다.
           */
          className={`block origin-center select-none ${
            moving
              ? 'scale-[1.06] drop-shadow-[0_3px_5px_rgba(58,50,38,.35)]'
              : ''
          }`}
        />
      </button>

      <form
        action={deleteAction}
        className="absolute -top-1 -right-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
      >
        <input type="hidden" name="id" value={sticker.id} />
        <input type="hidden" name="path" value={path} />
        <button
          type="submit"
          disabled={deleting}
          aria-label="스티커 떼기"
          className="grid size-4 cursor-pointer place-items-center rounded-full border border-rule bg-paper text-[9px] leading-none text-ink-faint hover:text-danger"
        >
          ✕
        </button>
      </form>

      {deleteState.error && (
        <span
          role="alert"
          className="absolute top-5 right-0 w-28 bg-paper px-1 py-0.5 text-[10px] text-danger shadow-notebook"
        >
          {deleteState.error}
        </span>
      )}

      {/* 오른쪽 아래 모서리를 끌어 크기를 바꾼다 — 사진 다루듯 */}
      <button
        type="button"
        aria-label="스티커 크기 바꾸기"
        onPointerDown={(e) => {
          e.stopPropagation()
          e.currentTarget.setPointerCapture(e.pointerId)

          // 한가운데는 크기가 바뀌어도 그대로다. 누를 때 한 번만 재둔다.
          // 끄는 내내 재면 그때마다 자리를 다시 계산하느라 손이 끊긴다.
          const box = boxRef.current?.getBoundingClientRect()
          if (box) {
            from.current = {
              x: box.left + box.width / 2,
              y: box.top + box.height / 2,
            }
          }
          setSizing(scale)
        }}
        onPointerMove={(e) => {
          if (!resizing) return

          /*
           * 모서리를 잡고 끄는 것이라 스티커 한가운데에서 손끝까지의 거리가
           * 곧 반지름이다. 기본 크기일 때 한가운데에서 모서리까지가
           * √2 × 16px 이므로 그것으로 나눠 배율을 낸다.
           */
          const away = Math.hypot(
            e.clientX - from.current.x,
            e.clientY - from.current.y,
          )
          const next = away / ((STICKER_SIZE / 2) * Math.SQRT2)
          setSizing(
            Math.min(Math.max(next, STICKER_SCALE.min), STICKER_SCALE.max),
          )
        }}
        onPointerUp={endResize}
        onPointerCancel={endResize}
        className={`absolute -right-1 -bottom-1 grid size-4 cursor-nwse-resize touch-none place-items-center rounded-full border border-rule bg-paper text-[8px] leading-none text-ink-faint transition-opacity hover:text-accent ${
          resizing
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
        }`}
      >
        ⤡
      </button>
    </div>
  )
}
