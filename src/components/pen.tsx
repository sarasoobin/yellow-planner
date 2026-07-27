'use client'

import { createContext, useContext, useMemo, useState } from 'react'

/**
 * 지금 손에 쥔 펜.
 *
 * 노트 위쪽에서 펜을 고르면, 그 뒤로 적는 것이 그 색으로 저장된다.
 * 이미 적어둔 것의 색은 바뀌지 않는다 — 종이에 쓴 글씨와 같다.
 *
 * 색은 items.color 컬럼에 '#RRGGBB' 로 들어간다.
 */
export const PENS = [
  { key: 'black', label: '검정', hex: '#3A3226' },
  { key: 'red', label: '빨강', hex: '#C1453C' },
  { key: 'blue', label: '파랑', hex: '#33618F' },
] as const

// PENS가 as const라 그냥 두면 '#3A3226' 리터럴 타입이 되어 다른 색을 못 넣는다
const DEFAULT_HEX: string = PENS[0].hex

type PenState = { hex: string; setHex: (hex: string) => void }

const PenContext = createContext<PenState>({
  hex: DEFAULT_HEX,
  setHex: () => {},
})

/** 지금 고른 펜 색. 새로 적는 폼에 hidden input으로 실어 보낸다. */
export function usePenHex(): string {
  return useContext(PenContext).hex
}

export function PenProvider({ children }: { children: React.ReactNode }) {
  const [hex, setHex] = useState(DEFAULT_HEX)
  // children이 매번 새로 그려지지 않도록 값 객체를 고정한다
  const value = useMemo(() => ({ hex, setHex }), [hex])

  return <PenContext.Provider value={value}>{children}</PenContext.Provider>
}

export function PenPicker() {
  const { hex, setHex } = useContext(PenContext)

  return (
    <div
      role="radiogroup"
      aria-label="펜 색"
      className="flex items-center gap-1.5"
    >
      {PENS.map((pen) => {
        const on = pen.hex === hex
        return (
          <button
            key={pen.key}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`${pen.label} 펜`}
            title={pen.label}
            onClick={() => setHex(pen.hex)}
            style={{ backgroundColor: pen.hex }}
            className={`size-4 cursor-pointer rounded-full transition-all ${
              on
                ? 'ring-2 ring-ink/45 ring-offset-2 ring-offset-frame'
                : 'opacity-45 hover:opacity-80'
            }`}
          />
        )
      })}
    </div>
  )
}
