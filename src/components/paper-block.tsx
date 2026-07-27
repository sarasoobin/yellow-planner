'use client'

import { useActionState, useRef, useState, useSyncExternalStore } from 'react'
import { saveBlock } from '@/lib/actions/items'
import { PENS } from '@/components/toolbar'
import { HIGHLIGHT } from '@/lib/stickers'
import { SIZES, type ItemKind, type ItemStyle, type SizeKey } from '@/lib/types'

/**
 * 종이 한 칸.
 *
 * 이 앱은 웹이 아니라 종이다. 그래서 한 칸은 줄 목록이 아니라
 * 그냥 글을 적는 자리다. 마구잡이로 쓰고, Enter를 치면 줄이 바뀌고,
 * 칸 끝에 닿으면 알아서 다음 줄로 넘어간다.
 *
 * 체크박스는 손으로 그리는 것이라 글자로 넣는다 (☐ / ☑).
 * 그래서 줄 앞이든 문장 중간이든 커서가 있는 자리 어디에나 그릴 수 있다.
 * 그려둔 네모를 누르면 체크되고, 다시 누르면 풀린다.
 *
 * 꾸미기는 두 갈래로 연다.
 *   컴퓨터 — 적던 자리에서 `/`
 *   폰     — 칸을 누르면 화면 위에 뜨는 꾸미기 줄
 * 폰에서 `/` 를 치려면 기호 키보드로 넘어가야 해서 그것만으로는 불편하다.
 */

const BOX = '☐'
const CHECKED = '☑'

/**
 * 좁은 화면인가.
 *
 * useEffect + setState 대신 useSyncExternalStore 를 쓴다.
 * 첫 그림에서 이미 맞는 값이라 화면이 한 번 깜빡이지 않는다.
 */
const NARROW = '(max-width: 767px)'

function subscribeNarrow(onChange: () => void) {
  const query = window.matchMedia(NARROW)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function useIsNarrow(): boolean {
  return useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW).matches,
    () => false, // 서버에서는 화면 폭을 알 수 없다. 넓은 쪽으로 그린다.
  )
}

/**
 * 공책 괘선.
 *
 * 칸마다 줄 간격이 달라서(달력 칸은 좁다) 클래스 대신 값으로 만든다.
 * CSS 변수를 인라인 style 의 "키"로 넘기면 React가 처리하지 못한다.
 */
function ruledGradient(lineHeight: number): string {
  const rule = lineHeight - 6
  return [
    'repeating-linear-gradient(to bottom,',
    `transparent 0, transparent ${rule}px,`,
    `var(--color-rule) ${rule}px, var(--color-rule) ${rule + 1}px,`,
    `transparent ${rule + 1}px, transparent ${lineHeight}px)`,
  ].join(' ')
}

type Draft = { color: string; style: ItemStyle }

const DEFAULT_DRAFT: Draft = { color: PENS[0].hex, style: {} }

type Option = {
  key: string
  label: string
  /** 영문으로 쳐도 찾아지게 */
  alias: string
  icon: React.ReactNode
  /** 글자를 끼워 넣는 항목이면 이 값을 커서 자리에 넣는다 */
  insert?: string
  apply?: (draft: Draft) => Draft
}

const SIZE_LABELS: { key: SizeKey; label: string }[] = [
  { key: 'sm', label: '작게' },
  { key: 'md', label: '보통' },
  { key: 'lg', label: '크게' },
  { key: 'xl', label: '아주 크게' },
]

const OPTIONS: Option[] = [
  {
    key: 'check',
    label: '체크박스',
    alias: 'checkbox todo box',
    icon: <span className="text-[13px] leading-none">{BOX}</span>,
    insert: `${BOX} `,
  },
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
  ...PENS.map((pen) => ({
    key: `pen-${pen.key}`,
    label: `${pen.label} 펜`,
    alias: `pen color ${pen.key}`,
    icon: (
      <span
        aria-hidden
        className="size-3 rounded-full"
        style={{ backgroundColor: pen.hex }}
      />
    ),
    apply: (d: Draft) => ({ ...d, color: pen.hex }),
  })),
  ...SIZE_LABELS.map((size) => ({
    key: `size-${size.key}`,
    label: size.label,
    alias: `size ${size.key} ${size.label}`,
    icon: (
      <span
        className="leading-none"
        style={{ fontSize: `${Math.min(SIZES[size.key], 15)}px` }}
      >
        가
      </span>
    ),
    apply: (d: Draft) => ({ ...d, style: { ...d.style, size: size.key } }),
  })),
]

export function PaperBlock({
  kind,
  date,
  path,
  content = '',
  color,
  style,
  minRows = 4,
  placeholder = '',
  lineHeight,
  ruled = true,
  firstLineIndent,
  fontSize = 14,
  className = '',
}: {
  kind: ItemKind
  /** 이 칸을 가리키는 날짜 */
  date: string
  path: string
  content?: string
  color?: string | null
  style?: ItemStyle | null
  /** 최소 몇 줄만큼 자리를 잡아둘지 */
  minRows?: number
  placeholder?: string
  /** 줄 간격. 달력 칸처럼 좁은 곳은 작게 준다 */
  lineHeight?: number
  /** 줄을 그을지. 한 줄짜리 칸은 긋지 않는다 */
  ruled?: boolean
  /**
   * 첫 줄만 들여쓴다. 달력 칸에서 날짜 옆부터 쓰기 시작하고,
   * 길어지면 다음 줄은 칸 왼쪽 끝부터 이어지게 하는 데 쓴다.
   */
  firstLineIndent?: number
  fontSize?: number
  className?: string
}) {
  const [state, formAction] = useActionState(saveBlock, { error: null })
  const [draft, setDraft] = useState<Draft>({
    color: color ?? DEFAULT_DRAFT.color,
    style: style ?? {},
  })

  const areaRef = useRef<HTMLTextAreaElement>(null)
  const saved = useRef(content)
  const narrow = useIsNarrow()

  const [focused, setFocused] = useState(false)

  // `/` 가 시작된 자리. 메뉴에서 고르면 여기부터 커서까지를 지운다.
  const [slashAt, setSlashAt] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [menuLine, setMenuLine] = useState(0)

  const matches = query
    ? OPTIONS.filter(
        (o) => o.label.includes(query) || o.alias.includes(query.toLowerCase()),
      )
    : OPTIONS
  const slashOpen = slashAt !== null && matches.length > 0

  function closeMenu() {
    setSlashAt(null)
    setQuery('')
    setActive(0)
  }

  /** 글이 길어지면 칸도 같이 늘어난다. 종이에 칸을 더 쓰는 것과 같다. */
  function grow(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  /** 커서 앞의 `/명령어` 를 살펴 메뉴를 열거나 닫는다 */
  function syncMenu(el: HTMLTextAreaElement) {
    const caret = el.selectionStart
    const before = el.value.slice(0, caret)
    const slash = before.lastIndexOf('/')

    // `/` 뒤에 띄어쓰기나 줄바꿈이 오면 그냥 글자로 본다 ("9/1 시험")
    if (slash === -1 || /\s/.test(before.slice(slash + 1))) {
      closeMenu()
      return
    }
    setSlashAt(slash)
    setQuery(before.slice(slash + 1))
    setActive(0)
    setMenuLine(before.split('\n').length - 1)
  }

  function handleInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget
    grow(el)

    /*
     * 일부 모바일 브라우저는 input 이벤트가 난 시점에 커서 위치(selectionStart)를
     * 아직 갱신하지 않는다. 그대로 읽으면 "커서 앞에 아무것도 없다"고 나와서
     * `/` 를 쳐도 메뉴가 열리지 않았다. 한 프레임 뒤에 읽는다.
     */
    requestAnimationFrame(() => {
      if (areaRef.current === el) syncMenu(el)
    })
  }

  /** 고른 꾸미기를 지금 커서 자리에 적용한다 */
  function apply(option: Option, slashRange?: { from: number; to: number }) {
    const el = areaRef.current
    if (!el) return

    if (slashRange) {
      // 입력한 `/명령어` 를 지운다. 폼 초기화(reset)가 계속 되게 값만 직접 손댄다.
      const insert = option.insert ?? ''
      el.value =
        el.value.slice(0, slashRange.from) + insert + el.value.slice(slashRange.to)
      const at = slashRange.from + insert.length
      el.setSelectionRange(at, at)
    } else if (option.insert) {
      const from = el.selectionStart
      const to = el.selectionEnd
      el.value = el.value.slice(0, from) + option.insert + el.value.slice(to)
      const at = from + option.insert.length
      el.setSelectionRange(at, at)
    }

    if (option.apply) setDraft(option.apply(draft))
    closeMenu()
    grow(el)
    el.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!slashOpen) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % matches.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + matches.length) % matches.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      // 메뉴가 열려 있을 때의 Enter는 줄바꿈이 아니라 "이걸로 고름"이다
      e.preventDefault()
      const el = areaRef.current
      if (el && slashAt !== null) {
        apply(matches[active], { from: slashAt, to: el.selectionStart })
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeMenu()
    }
  }

  /** 그려둔 네모를 누르면 체크한다. 클릭하면 커서가 그 글자 옆에 선다. */
  function handleClick(e: React.MouseEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget
    const caret = el.selectionStart
    if (caret !== el.selectionEnd) return

    for (const i of [caret, caret - 1]) {
      const ch = el.value[i]
      if (ch !== BOX && ch !== CHECKED) continue

      el.value =
        el.value.slice(0, i) +
        (ch === BOX ? CHECKED : BOX) +
        el.value.slice(i + 1)
      el.setSelectionRange(i + 1, i + 1)
      saved.current = el.value
      el.form?.requestSubmit()
      return
    }
  }

  function save(el: HTMLTextAreaElement) {
    if (el.value === saved.current) return
    saved.current = el.value
    el.form?.requestSubmit()
  }

  const rowHeight = lineHeight ?? 28
  // 폰에서는 칸을 누르면 화면 위에 꾸미기 줄이 뜬다
  const showMobileBar = narrow && focused

  return (
    <form action={formAction} className={`relative flex flex-col ${className}`}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="path" value={path} />
      <input type="hidden" name="color" value={draft.color} />
      <input type="hidden" name="style" value={JSON.stringify(draft.style)} />

      <textarea
        ref={(el) => {
          areaRef.current = el
          if (el) grow(el)
        }}
        name="content"
        defaultValue={content}
        placeholder={placeholder}
        aria-label={placeholder || '적는 곳'}
        spellCheck={false}
        maxLength={5000}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false)
          closeMenu()
          save(e.currentTarget)
        }}
        style={{
          minHeight: `${minRows * rowHeight}px`,
          lineHeight: `${rowHeight}px`,
          textIndent: firstLineIndent ? `${firstLineIndent}px` : undefined,
          color: draft.color,
          fontWeight: draft.style.bold ? 700 : undefined,
          fontStyle: draft.style.italic ? 'italic' : undefined,
          fontSize: draft.style.size
            ? `${SIZES[draft.style.size]}px`
            : `${fontSize}px`,
          backgroundColor: draft.style.highlight ? HIGHLIGHT : undefined,
          // 줄 간격이 칸마다 달라서 괘선을 여기서 직접 그린다.
          // 글자가 앉는 자리 바로 밑(줄 아래에서 6px 위)에 긋는다.
          backgroundImage: ruled ? ruledGradient(rowHeight) : undefined,
        }}
        className="w-full resize-none overflow-hidden bg-transparent p-0 outline-none placeholder:text-ink-faint/50"
      />

      {/* 폰 — 화면 맨 위 꾸미기 줄. 키보드가 올라와도 가리지 않는다 */}
      {showMobileBar && (
        <div
          role="toolbar"
          aria-label="꾸미기"
          // 눌러도 적던 자리에서 커서가 빠지지 않아야 한다
          onPointerDown={(e) => e.preventDefault()}
          className="fixed inset-x-0 top-0 z-50 flex gap-1 overflow-x-auto border-b border-edge bg-frame px-2 py-1.5 shadow-notebook"
        >
          {OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-label={option.label}
              title={option.label}
              onClick={() => apply(option)}
              className="flex shrink-0 items-center gap-1 rounded-[3px] border border-ink/15 bg-paper px-2 py-1.5 text-[11px] whitespace-nowrap text-ink-soft active:bg-frame"
            >
              <span className="grid size-4 place-items-center">
                {option.icon}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* 컴퓨터 — 적던 줄 바로 아래 */}
      {slashOpen && !narrow && (
        <ul
          role="listbox"
          aria-label="꾸미기"
          style={{ top: `${(menuLine + 1) * rowHeight}px` }}
          className="absolute left-0 z-30 max-h-56 w-44 overflow-y-auto border border-rule bg-paper py-1 shadow-notebook"
        >
          {matches.map((option, i) => (
            <li key={option.key}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const el = areaRef.current
                  if (el && slashAt !== null) {
                    apply(option, { from: slashAt, to: el.selectionStart })
                  }
                }}
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

      {state.error && (
        <p role="alert" className="pt-1 text-[10px] text-danger">
          {state.error}
        </p>
      )}
    </form>
  )
}
