'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import { HIGHLIGHT, STICKERS } from '@/lib/stickers'
import type { ItemStyle } from '@/lib/types'

/**
 * 지금 손에 쥔 도구 — 펜 색, 굵게/기울임, 형광펜, 스티커.
 *
 * 여기서 고른 것은 "앞으로 적을 것"에 적용된다.
 * 이미 적어둔 줄은 바뀌지 않는다. 종이에 쓴 글씨와 같다.
 */
export const PENS = [
  { key: 'black', label: '검정', hex: '#3A3226' },
  { key: 'red', label: '빨강', hex: '#C1453C' },
  { key: 'blue', label: '파랑', hex: '#33618F' },
] as const

const DEFAULT_HEX: string = PENS[0].hex

type Tool = {
  hex: string
  bold: boolean
  italic: boolean
  highlight: boolean
  sticker: string | null
}

const INITIAL: Tool = {
  hex: DEFAULT_HEX,
  bold: false,
  italic: false,
  highlight: false,
  sticker: null,
}

type ToolContextValue = {
  tool: Tool
  update: (patch: Partial<Tool>) => void
}

const ToolContext = createContext<ToolContextValue>({
  tool: INITIAL,
  update: () => {},
})

/** 새로 적는 폼에 실어 보낼 값. hex와 style을 따로 저장한다. */
export function useTool(): { hex: string; style: ItemStyle } {
  const { tool } = useContext(ToolContext)
  return useMemo(
    () => ({
      hex: tool.hex,
      style: {
        bold: tool.bold,
        italic: tool.italic,
        highlight: tool.highlight,
        sticker: tool.sticker,
      },
    }),
    [tool],
  )
}

export function ToolProvider({ children }: { children: React.ReactNode }) {
  const [tool, setTool] = useState<Tool>(INITIAL)

  const value = useMemo(
    () => ({
      tool,
      update: (patch: Partial<Tool>) =>
        setTool((prev) => ({ ...prev, ...patch })),
    }),
    [tool],
  )

  return <ToolContext.Provider value={value}>{children}</ToolContext.Provider>
}

const BTN =
  'grid size-6 shrink-0 cursor-pointer place-items-center rounded-[3px] border text-[12px] leading-none transition-colors'

function Divider() {
  return <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-ink/15" />
}

export function Toolbar() {
  const { tool, update } = useContext(ToolContext)

  return (
    <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
      {/* 펜 색 */}
      <div role="radiogroup" aria-label="펜 색" className="flex gap-1.5">
        {PENS.map((pen) => {
          const on = pen.hex === tool.hex
          return (
            <button
              key={pen.key}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${pen.label} 펜`}
              title={pen.label}
              onClick={() => update({ hex: pen.hex })}
              style={{ backgroundColor: pen.hex }}
              className={`size-4 shrink-0 cursor-pointer rounded-full transition-all ${
                on
                  ? 'ring-2 ring-ink/45 ring-offset-2 ring-offset-frame'
                  : 'opacity-45 hover:opacity-80'
              }`}
            />
          )
        })}
      </div>

      <Divider />

      <button
        type="button"
        aria-pressed={tool.bold}
        aria-label="굵게"
        title="굵게"
        onClick={() => update({ bold: !tool.bold })}
        className={`${BTN} font-bold ${
          tool.bold
            ? 'border-accent bg-accent text-paper'
            : 'border-ink/20 text-ink-soft hover:border-accent'
        }`}
      >
        B
      </button>

      <button
        type="button"
        aria-pressed={tool.italic}
        aria-label="기울임"
        title="기울임"
        onClick={() => update({ italic: !tool.italic })}
        className={`${BTN} font-serif italic ${
          tool.italic
            ? 'border-accent bg-accent text-paper'
            : 'border-ink/20 text-ink-soft hover:border-accent'
        }`}
      >
        I
      </button>

      <button
        type="button"
        aria-pressed={tool.highlight}
        aria-label="형광펜"
        title="형광펜"
        onClick={() => update({ highlight: !tool.highlight })}
        style={tool.highlight ? { backgroundColor: HIGHLIGHT } : undefined}
        className={`${BTN} ${
          tool.highlight
            ? 'border-accent text-ink'
            : 'border-ink/20 text-ink-soft hover:border-accent'
        }`}
      >
        <span
          className="block h-[3px] w-3.5 rounded-full"
          style={{ backgroundColor: HIGHLIGHT }}
        />
      </button>

      <Divider />

      {/* 스티커 — 한 번 더 누르면 해제된다 */}
      {STICKERS.map((sticker) => {
        const on = tool.sticker === sticker.key
        return (
          <button
            key={sticker.key}
            type="button"
            aria-pressed={on}
            aria-label={`${sticker.label} 스티커`}
            title={sticker.label}
            onClick={() => update({ sticker: on ? null : sticker.key })}
            className={`${BTN} ${
              on
                ? 'border-accent bg-accent/12'
                : 'border-ink/20 opacity-60 hover:border-accent hover:opacity-100'
            }`}
          >
            {/* 스티커는 public/stickers 의 SVG 파일이다 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sticker.src} alt="" className="size-3.5" />
          </button>
        )
      })}
    </div>
  )
}
