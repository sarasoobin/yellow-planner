'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import { HIGHLIGHTS, STICKERS, UNDERLINE_COLOR } from '@/lib/stickers'

/**
 * 필통과 스티커 통.
 *
 * 여기 있는 것은 전부 "집어드는" 도구다. 하나를 누르면 집어든 상태가 되고,
 * 그 뒤 글자를 긁거나 페이지를 누르면 그 자리에 쓰인다. 한 번 더 누르면
 * 내려놓는다. 여러 군데를 이어서 칠하는 물건이라 한 번 쓸 때마다 다시
 * 집어들게 하면 쓸 수가 없다 (스티커만은 붙이는 즉시 내려놓는다).
 *
 * 펜 색·굵게·기울임·글자 크기는 여기 없다. 적던 자리에서 `/` 를 치면 나온다.
 * 글을 적다 말고 위로 올라오지 않아도 되게 하기 위해서다.
 */
/*
 * 여기만 globals.css 의 토큰을 못 쓰고 색을 직접 적는다.
 *
 * 펜 색은 execCommand 가 글 안에 style="color:..." 로 박아 그대로 저장된다.
 * 저장 직전 sanitize.ts 가 #hex 와 rgb() 만 통과시키므로 var(--color-ink) 를
 * 넣으면 저장되는 순간 색이 통째로 날아간다.
 *
 * 검정은 --color-ink, 로즈는 --color-today 와 같은 값이다.
 * globals.css 에서 그 둘을 바꾸면 여기도 같이 바꿔야 한다.
 * 보라는 펜에만 쓰는 색이다.
 */
export const PENS = [
  { key: 'black', label: '먹색', hex: '#413342' },
  { key: 'rose', label: '로즈', hex: '#C14D7A' },
  { key: 'purple', label: '보라', hex: '#6956A6' },
] as const

type ArmedState = {
  /** 지금 집어든 스티커 이름. 없으면 null */
  armed: string | null
  setArmed: (key: string | null) => void
  /** 집어든 형광펜 색(#hex). 없으면 null */
  marker: string | null
  setMarker: (hex: string | null) => void
  /** 밑줄 자를 집어들었는가 */
  underline: boolean
  setUnderline: (on: boolean) => void
}

const ArmedContext = createContext<ArmedState>({
  armed: null,
  setArmed: () => {},
  marker: null,
  setMarker: () => {},
  underline: false,
  setUnderline: () => {},
})

export function useArmedSticker(): ArmedState {
  return useContext(ArmedContext)
}

export function ToolProvider({ children }: { children: React.ReactNode }) {
  const [armed, setArmedState] = useState<string | null>(null)
  const [marker, setMarkerState] = useState<string | null>(null)
  const [underline, setUnderlineState] = useState(false)

  /*
   * 도구는 한 번에 하나만 든다.
   * 둘을 같이 든 채로 글자를 긁으면 무엇을 하려던 건지 알 수 없다.
   */
  const value = useMemo(() => {
    function pick(next: {
      armed?: string | null
      marker?: string | null
      underline?: boolean
    }) {
      setArmedState(next.armed ?? null)
      setMarkerState(next.marker ?? null)
      setUnderlineState(next.underline ?? false)
    }

    return {
      armed,
      marker,
      underline,
      setArmed: (key: string | null) => pick({ armed: key }),
      setMarker: (hex: string | null) => pick({ marker: hex }),
      setUnderline: (on: boolean) => pick({ underline: on }),
    }
  }, [armed, marker, underline])

  return <ArmedContext.Provider value={value}>{children}</ArmedContext.Provider>
}

/** 집어든 도구를 나타내는 테두리. 모든 도구가 같은 모양을 쓴다 */
function toolClass(on: boolean): string {
  return `grid size-7 shrink-0 cursor-pointer place-items-center rounded-[3px] border transition-all ${
    on
      ? 'scale-110 border-accent bg-paper shadow-[0_1px_3px_rgba(65,51,66,.25)]'
      : 'border-transparent opacity-55 hover:opacity-100'
  }`
}

export function Toolbar() {
  const { armed, setArmed, marker, setMarker, underline, setUnderline } =
    useArmedSticker()

  const hint = marker
    ? '칠할 글자를 긁으세요'
    : underline
      ? '밑줄 그을 글자를 긁으세요'
      : armed
        ? '붙일 자리를 누르세요'
        : null

  return (
    <div className="flex min-w-0 items-center gap-1">
      {/*
        형광펜 세 자루. 집어들면 끌어서 그은 만큼 칠해진다.
        같은 색으로 이미 칠해진 곳을 그으면 지워진다 — 진짜 형광펜과 다르지만,
        지우는 방법이 따로 없으면 잘못 칠했을 때 되돌릴 길이 없다.
        다른 색으로 그으면 그 색으로 바뀐다.
      */}
      {HIGHLIGHTS.map((pen) => {
        const on = marker === pen.hex
        return (
          <button
            key={pen.key}
            type="button"
            aria-pressed={on}
            aria-label={`${pen.label} 형광펜`}
            title={on ? '내려놓기' : `${pen.label} 형광펜 — 칠할 글자를 긁으세요`}
            onClick={() => setMarker(on ? null : pen.hex)}
            className={toolClass(on)}
          >
            {/* 연한 형광펜도 도구 막대에서 또렷하게 보이도록 테두리를 둔다 */}
            <span
              aria-hidden
              className="block h-[9px] w-[15px] rounded-[1px] ring-1 ring-ink/20"
              style={{ backgroundColor: pen.hex }}
            />
          </button>
        )
      })}

      {/* 밑줄 자 — 긁은 글자 밑에 빨간 줄을 긋는다 */}
      <button
        type="button"
        aria-pressed={underline}
        aria-label="밑줄"
        title={underline ? '내려놓기' : '밑줄 — 그을 글자를 긁으세요'}
        onClick={() => setUnderline(!underline)}
        className={toolClass(underline)}
      >
        <span aria-hidden className="flex flex-col items-center gap-[3px]">
          <span className="text-[11px] leading-none font-semibold text-ink">
            가
          </span>
          <span
            className="block h-[2px] w-[15px] rounded-full"
            style={{ backgroundColor: UNDERLINE_COLOR }}
          />
        </span>
      </button>

      {/* 필통과 스티커 통 사이 칸막이 */}
      <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-ink/15" />

      {STICKERS.map((sticker) => {
        const on = armed === sticker.key
        return (
          <button
            key={sticker.key}
            type="button"
            aria-pressed={on}
            aria-label={`${sticker.label} 스티커`}
            title={
              on ? '내려놓기' : `${sticker.label} — 누른 뒤 붙일 자리를 누르세요`
            }
            onClick={() => setArmed(on ? null : sticker.key)}
            className={toolClass(on)}
          >
            {/* public/stickers 의 SVG 파일 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sticker.src} alt="" className="size-5" />
          </button>
        )
      })}

      {hint && (
        <span className="ml-1 hidden text-[12px] whitespace-nowrap text-ink-soft lg:inline">
          {hint}
        </span>
      )}
    </div>
  )
}
