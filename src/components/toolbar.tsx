'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import { STICKERS } from '@/lib/stickers'

/**
 * 스티커 통.
 *
 * 스티커를 하나 누르면 "집어든" 상태가 되고, 그 뒤 페이지 아무 데나 누르면
 * 그 자리에 붙는다. 한 번 더 누르면 내려놓는다.
 *
 * 펜 색·굵게·기울임·형광펜은 여기 없다. 적던 자리에서 `/` 를 치면 나온다.
 * 글을 적다 말고 위로 올라오지 않아도 되게 하기 위해서다.
 */
export const PENS = [
  { key: 'black', label: '검정', hex: '#3A3226' },
  { key: 'red', label: '빨강', hex: '#C1453C' },
  { key: 'blue', label: '파랑', hex: '#33618F' },
] as const

type ArmedState = {
  /** 지금 집어든 스티커 이름. 없으면 null */
  armed: string | null
  setArmed: (key: string | null) => void
}

const ArmedContext = createContext<ArmedState>({
  armed: null,
  setArmed: () => {},
})

export function useArmedSticker(): ArmedState {
  return useContext(ArmedContext)
}

export function ToolProvider({ children }: { children: React.ReactNode }) {
  const [armed, setArmed] = useState<string | null>(null)
  const value = useMemo(() => ({ armed, setArmed }), [armed])

  return <ArmedContext.Provider value={value}>{children}</ArmedContext.Provider>
}

export function Toolbar() {
  const { armed, setArmed } = useArmedSticker()

  return (
    <div className="flex min-w-0 items-center gap-1.5">
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
            className={`grid size-7 shrink-0 cursor-pointer place-items-center rounded-[3px] border transition-all ${
              on
                ? 'scale-110 border-accent bg-paper shadow-[0_1px_3px_rgba(58,50,38,.25)]'
                : 'border-transparent opacity-55 hover:opacity-100'
            }`}
          >
            {/* public/stickers 의 SVG 파일 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sticker.src} alt="" className="size-5" />
          </button>
        )
      })}

      {armed && (
        <span className="ml-1 hidden text-[11px] whitespace-nowrap text-ink-soft sm:inline">
          붙일 자리를 누르세요
        </span>
      )}
    </div>
  )
}
