'use client'

import { useRef, useState } from 'react'
import { HIGHLIGHT, STICKERS } from '@/lib/stickers'
import { PENS, useTool } from '@/components/toolbar'
import { Sticker, writtenStyle } from '@/components/written'
import type { ItemStyle } from '@/lib/types'

/**
 * 글을 적는 칸. 노션처럼 `/` 를 치면 꾸미기 메뉴가 뜬다.
 *
 * 체크박스, 펜 색, 굵게, 기울임, 형광펜, 스티커를 전부 여기서 고른다.
 * 위쪽 도구 막대는 "기본값"이고, `/` 는 이 줄에만 적용된다.
 *
 * 색과 꾸미기는 hidden input 으로 함께 제출되므로
 * 쓰는 쪽에서는 이 컴포넌트만 넣으면 된다.
 */

type Draft = { color: string; style: ItemStyle }

type Option = {
  key: string
  label: string
  /** 검색어로도 쓰인다 (영문 입력 대응) */
  alias: string
  icon: React.ReactNode
  apply: (draft: Draft) => Draft
}

function Swatch({ hex }: { hex: string }) {
  return (
    <span
      aria-hidden
      className="size-3 rounded-full"
      style={{ backgroundColor: hex }}
    />
  )
}

function buildOptions(allowCheck: boolean): Option[] {
  const options: Option[] = []

  if (allowCheck) {
    options.push({
      key: 'check',
      label: '체크박스',
      alias: 'checkbox todo box',
      icon: <span className="block size-3 border border-ink-faint" />,
      apply: (d) => ({ ...d, style: { ...d.style, check: !d.style.check } }),
    })
  }

  options.push(
    {
      key: 'bold',
      label: '굵게',
      alias: 'bold',
      icon: <span className="text-[11px] font-bold">B</span>,
      apply: (d) => ({ ...d, style: { ...d.style, bold: !d.style.bold } }),
    },
    {
      key: 'italic',
      label: '기울임',
      alias: 'italic',
      icon: <span className="font-serif text-[11px] italic">I</span>,
      apply: (d) => ({ ...d, style: { ...d.style, italic: !d.style.italic } }),
    },
    {
      key: 'highlight',
      label: '형광펜',
      alias: 'highlight marker',
      icon: (
        <span
          className="block h-[3px] w-3 rounded-full"
          style={{ backgroundColor: HIGHLIGHT }}
        />
      ),
      apply: (d) => ({
        ...d,
        style: { ...d.style, highlight: !d.style.highlight },
      }),
    },
  )

  for (const pen of PENS) {
    options.push({
      key: `pen-${pen.key}`,
      label: `${pen.label} 펜`,
      alias: `pen color ${pen.key}`,
      icon: <Swatch hex={pen.hex} />,
      apply: (d) => ({ ...d, color: pen.hex }),
    })
  }

  for (const sticker of STICKERS) {
    options.push({
      key: `sticker-${sticker.key}`,
      label: `${sticker.label} 스티커`,
      alias: `sticker ${sticker.key}`,
      // eslint-disable-next-line @next/next/no-img-element
      icon: <img src={sticker.src} alt="" className="size-3.5" />,
      apply: (d) => ({
        ...d,
        style: {
          ...d.style,
          sticker: d.style.sticker === sticker.key ? null : sticker.key,
        },
      }),
    })
  }

  return options
}

export function WritingInput({
  name = 'content',
  defaultValue = '',
  placeholder = '',
  ariaLabel,
  initial,
  allowCheck = true,
  showBox = false,
  disabled = false,
  autoFocus = false,
  required = true,
  className = '',
  onKeyDown,
  onBlur,
}: {
  name?: string
  defaultValue?: string
  placeholder?: string
  ariaLabel?: string
  /** 시작 색·꾸미기. 없으면 도구 막대에서 고른 것 */
  initial?: Draft
  /** `/` 메뉴에 체크박스 항목을 넣을지 */
  allowCheck?: boolean
  /** 왼쪽에 체크박스 자리를 그릴지 (목록 줄에서만 쓴다) */
  showBox?: boolean
  /** 비우면 지우는 칸(그날 한 줄)은 false */
  required?: boolean
  disabled?: boolean
  autoFocus?: boolean
  className?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
}) {
  const tool = useTool()
  const [draft, setDraft] = useState<Draft>(
    initial ?? { color: tool.hex, style: tool.style },
  )

  const inputRef = useRef<HTMLInputElement>(null)
  // `/` 가 시작된 자리. 메뉴에서 고르면 여기부터 커서까지를 지운다.
  const [slashAt, setSlashAt] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const options = buildOptions(allowCheck)
  const matches = query
    ? options.filter(
        (o) =>
          o.label.includes(query) ||
          o.alias.includes(query.toLowerCase()),
      )
    : options
  const open = slashAt !== null && matches.length > 0

  function close() {
    setSlashAt(null)
    setQuery('')
    setActive(0)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.currentTarget
    const caret = el.selectionStart ?? el.value.length
    const before = el.value.slice(0, caret)
    const slash = before.lastIndexOf('/')

    // `/` 뒤에 띄어쓰기가 나오면 그냥 글자로 본다 ("9/1 시험" 같은 경우)
    if (slash === -1 || /\s/.test(before.slice(slash + 1))) {
      close()
      return
    }
    setSlashAt(slash)
    setQuery(before.slice(slash + 1))
    setActive(0)
  }

  function choose(option: Option) {
    const el = inputRef.current
    if (!el || slashAt === null) return

    // 입력한 `/명령어` 를 지운다. 폼 초기화(reset)가 계속 되게 값만 직접 손댄다.
    const caret = el.selectionStart ?? el.value.length
    el.value = el.value.slice(0, slashAt) + el.value.slice(caret)
    el.setSelectionRange(slashAt, slashAt)

    setDraft(option.apply(draft))
    close()
    el.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (open) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((i) => (i + 1) % matches.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((i) => (i - 1 + matches.length) % matches.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        choose(matches[active])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
    }
    onKeyDown?.(e)
  }

  return (
    // gap은 목록 줄(ROW)과 같아야 글머리가 위아래로 나란해진다
    <span className="relative flex min-w-0 flex-1 items-center gap-2">
      <input type="hidden" name="color" value={draft.color} />
      <input type="hidden" name="style" value={JSON.stringify(draft.style)} />

      {showBox && (
        <span aria-hidden className="size-[13px] shrink-0">
          {draft.style.check && (
            <span className="block size-[13px] border border-rule" />
          )}
        </span>
      )}

      <Sticker name={draft.style.sticker} />

      <input
        ref={inputRef}
        name={name}
        defaultValue={defaultValue}
        required={required}
        maxLength={200}
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder || '내용'}
        autoComplete="off"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={(e) => {
          close()
          onBlur?.(e)
        }}
        style={writtenStyle(draft.color, draft.style, false)}
        className={`min-w-0 flex-1 bg-transparent outline-none placeholder:bg-transparent placeholder:font-normal placeholder:text-ink-faint/60 disabled:opacity-50 ${className}`}
      />

      {open && (
        <ul
          role="listbox"
          aria-label="꾸미기"
          className="absolute top-full left-0 z-30 mt-1 max-h-56 w-44 overflow-y-auto border border-rule bg-paper py-1 shadow-notebook"
        >
          {matches.map((option, i) => (
            <li key={option.key}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                // 눌러도 입력칸에서 포커스가 빠지지 않아야 한다
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(option)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full cursor-pointer items-center gap-2 px-2 py-1 text-left text-[12px] ${
                  i === active ? 'bg-frame/60 text-ink' : 'text-ink-soft'
                }`}
              >
                <span className="grid size-4 shrink-0 place-items-center">
                  {option.icon}
                </span>
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}
