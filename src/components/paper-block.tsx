'use client'

import { useActionState, useRef, useState, useSyncExternalStore } from 'react'
import { saveBlock } from '@/lib/actions/items'
import { PENS } from '@/components/toolbar'
import { HIGHLIGHT } from '@/lib/stickers'
import { isBlank, toDisplayHtml } from '@/lib/rich-text'
import { SIZES, type ItemKind, type ItemStyle, type SizeKey } from '@/lib/types'

/**
 * 종이 한 칸.
 *
 * 이 앱은 웹이 아니라 종이다. 한 칸은 줄 목록이 아니라 그냥 글을 적는 자리다.
 * 마구잡이로 쓰고, Enter를 치면 줄이 바뀌고, 칸 끝에 닿으면 다음 줄로 넘어간다.
 *
 * textarea 가 아니라 contenteditable 을 쓴다.
 * 한 칸 안에서 "이 단어만" 굵게, "이 줄만" 빨갛게 하려면 글자마다 서식이
 * 달라야 하는데, textarea 는 통째로 한 가지 모양밖에 못 가진다.
 *
 * 서식은 브라우저 내장 편집 기능(execCommand)에 맡긴다. 오래된 API지만
 * 한글 입력(IME)과 선택 영역 처리를 직접 짜는 것보다 훨씬 안전하다.
 *
 * 체크박스는 손으로 그리는 것이라 글자로 넣는다 (☐ / ☑).
 * 줄 앞이든 문장 중간이든 커서가 있는 자리 어디에나 그릴 수 있다.
 */

const BOX = '☐'
const CHECKED = '☑'

const NARROW = '(max-width: 767px)'

function subscribeNarrow(onChange: () => void) {
  const query = window.matchMedia(NARROW)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/** 좁은 화면인가. 첫 그림부터 맞는 값이라 메뉴가 한 번 잘못 그려지지 않는다. */
function useIsNarrow(): boolean {
  return useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW).matches,
    () => false, // 서버에서는 화면 폭을 알 수 없다. 넓은 쪽으로 그린다.
  )
}

/**
 * 공책 괘선.
 * 칸마다 줄 간격이 달라서(달력 칸은 좁다) 클래스 대신 값으로 만든다.
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

type Command =
  | { kind: 'insert'; text: string }
  | { kind: 'exec'; name: string; value?: string }
  | { kind: 'size'; px: number }

type Option = {
  key: string
  label: string
  /** 영문으로 쳐도 찾아지게 */
  alias: string
  icon: React.ReactNode
  command: Command
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
    command: { kind: 'insert', text: `${BOX} ` },
  },
  {
    key: 'bold',
    label: '굵게',
    alias: 'bold',
    icon: <span className="text-[11px] font-bold">B</span>,
    command: { kind: 'exec', name: 'bold' },
  },
  {
    key: 'italic',
    label: '기울임',
    alias: 'italic',
    icon: <span className="font-serif text-[11px] italic">I</span>,
    command: { kind: 'exec', name: 'italic' },
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
    command: { kind: 'exec', name: 'hiliteColor', value: HIGHLIGHT },
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
    command: { kind: 'exec' as const, name: 'foreColor', value: pen.hex },
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
    command: { kind: 'size' as const, px: SIZES[size.key] },
  })),
]

/** 고른 글자를 span 으로 감싸 크기를 준다. execCommand 의 fontSize 는 1~7 뿐이라 직접 한다. */
function wrapFontSize(px: number) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)
  if (range.collapsed) return

  const span = document.createElement('span')
  span.style.fontSize = `${px}px`
  try {
    span.appendChild(range.extractContents())
    range.insertNode(span)
    selection.removeAllRanges()
    const after = document.createRange()
    after.selectNodeContents(span)
    selection.addRange(after)
  } catch {
    // 선택이 태그 경계를 어중간하게 걸친 경우. 크기만 안 걸리고 글은 그대로다.
  }
}

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
  /** 첫 줄만 들여쓴다 (달력 칸에서 날짜를 피하려고) */
  firstLineIndent?: number
  fontSize?: number
  className?: string
}) {
  const [state, formAction] = useActionState(saveBlock, { error: null })
  const narrow = useIsNarrow()

  const editorRef = useRef<HTMLDivElement>(null)
  const hiddenRef = useRef<HTMLInputElement>(null)
  const saved = useRef(content)

  const [empty, setEmpty] = useState(() => isBlank(content))
  const [focused, setFocused] = useState(false)

  // `/` 를 친 자리. 메뉴에서 고르면 여기부터 커서까지를 지운다.
  const slashRef = useRef<{ node: Text; from: number; to: number } | null>(null)
  const [query, setQuery] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const [menuAt, setMenuAt] = useState({ top: 0, left: 0 })

  const matches =
    query === null
      ? OPTIONS
      : OPTIONS.filter(
          (o) =>
            o.label.includes(query) || o.alias.includes(query.toLowerCase()),
        )
  const slashOpen = query !== null && matches.length > 0

  function closeMenu() {
    slashRef.current = null
    setQuery(null)
    setActive(0)
  }

  /** 커서 앞의 `/명령어` 를 살펴 메뉴를 열거나 닫는다 */
  function syncMenu() {
    const root = editorRef.current
    const selection = window.getSelection()
    if (!root || !selection || selection.rangeCount === 0) return closeMenu()

    const node = selection.anchorNode
    if (!node || !root.contains(node)) return closeMenu()

    /*
     * 커서가 글자 노드가 아니라 칸(div) 자체에 있을 때가 있다.
     * 빈 줄이거나 방금 줄을 바꾼 직후가 그렇다.
     * 그때는 커서 바로 앞 자식이 글자면 그걸 기준으로 삼는다.
     */
    let text: Text | null = null
    let offset = selection.anchorOffset
    if (node.nodeType === Node.TEXT_NODE) {
      text = node as Text
    } else {
      const previous = node.childNodes[offset - 1]
      if (previous && previous.nodeType === Node.TEXT_NODE) {
        text = previous as Text
        offset = text.data.length
      }
    }
    if (!text) return closeMenu()

    const before = text.data.slice(0, offset)
    const slash = before.lastIndexOf('/')

    // `/` 뒤에 띄어쓰기가 오면 그냥 글자로 본다 ("9/1 시험")
    if (slash === -1 || /\s/.test(before.slice(slash + 1))) return closeMenu()

    slashRef.current = { node: text, from: slash, to: offset }
    setQuery(before.slice(slash + 1))
    setActive(0)

    /*
     * 커서만 있는 자리는 크기가 0인 사각형이 나오기도 한다.
     * 그대로 쓰면 메뉴가 화면 왼쪽 위 구석에 뜬다. 그때는 그 줄을 기준으로 잡는다.
     */
    let rect = selection.getRangeAt(0).getBoundingClientRect()
    if (!rect.height) {
      rect = (text.parentElement ?? root).getBoundingClientRect()
    }
    setMenuAt({
      top: Math.min(rect.bottom + 4, window.innerHeight - 240),
      left: Math.min(rect.left, window.innerWidth - 190),
    })
  }

  function handleInput() {
    setEmpty(isBlank(editorRef.current?.innerHTML ?? ''))
    /*
     * 일부 모바일 브라우저는 입력이 끝난 시점에 커서 위치를 아직 갱신하지 않는다.
     * 그대로 읽으면 "커서 앞에 아무것도 없다"고 나와 `/` 를 쳐도 안 열렸다.
     */
    requestAnimationFrame(syncMenu)
  }

  function run(option: Option) {
    const root = editorRef.current
    if (!root) return
    root.focus()

    // `/명령어` 로 열었으면 그 글자부터 지운다
    const slash = slashRef.current
    if (slash) {
      try {
        slash.node.deleteData(slash.from, slash.to - slash.from)
        const range = document.createRange()
        range.setStart(slash.node, slash.from)
        range.collapse(true)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
      } catch {
        // 그 사이 글이 바뀌어 자리를 못 찾은 경우. 명령은 그대로 진행한다.
      }
    }
    closeMenu()

    // 서식을 태그가 아니라 style 로 남긴다. 저장할 때 걸러내기 쉽다.
    document.execCommand('styleWithCSS', false, 'true')

    const command = option.command
    if (command.kind === 'insert') {
      document.execCommand('insertText', false, command.text)
    } else if (command.kind === 'exec') {
      document.execCommand(command.name, false, command.value)
    } else {
      wrapFontSize(command.px)
    }

    setEmpty(isBlank(root.innerHTML))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
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
      run(matches[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeMenu()
    }
  }

  /** 그려둔 네모를 누르면 체크한다 */
  function handleClick() {
    const selection = window.getSelection()
    const node = selection?.anchorNode
    if (!node || node.nodeType !== Node.TEXT_NODE) return

    const text = node as Text
    const offset = selection!.anchorOffset
    for (const i of [offset, offset - 1]) {
      const ch = text.data[i]
      if (ch !== BOX && ch !== CHECKED) continue
      text.replaceData(i, 1, ch === BOX ? CHECKED : BOX)
      save()
      return
    }
  }

  function save() {
    const root = editorRef.current
    const hidden = hiddenRef.current
    if (!root || !hidden) return
    if (root.innerHTML === saved.current) return

    saved.current = root.innerHTML
    hidden.value = root.innerHTML
    hidden.form?.requestSubmit()
  }

  const rowHeight = lineHeight ?? 28
  const showMobileBar = narrow && focused

  return (
    <form action={formAction} className={`relative flex flex-col ${className}`}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="path" value={path} />
      <input type="hidden" name="color" value={color ?? ''} />
      <input type="hidden" name="style" value={JSON.stringify(style ?? {})} />
      <input ref={hiddenRef} type="hidden" name="content" defaultValue="" />

      {/*
        칸이 커지면 글 쓰는 자리도 같이 커진다.
        안 그러면 칸은 큰데 눌러서 쓸 수 있는 곳은 위쪽 몇 줄뿐이다.
      */}
      <div className="relative flex flex-1 flex-col">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={placeholder || '적는 곳'}
          spellCheck={false}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            closeMenu()
            save()
          }}
          /*
           * 붙여넣기는 글자만 받는다.
           * 웹에서 복사한 것을 그대로 두면 남의 서식과 태그가 통째로 들어온다.
           */
          onPaste={(e) => {
            e.preventDefault()
            const text = e.clipboardData.getData('text/plain')
            document.execCommand('insertText', false, text)
            setEmpty(isBlank(editorRef.current?.innerHTML ?? ''))
          }}
          dangerouslySetInnerHTML={{ __html: toDisplayHtml(content) }}
          style={{
            minHeight: `${minRows * rowHeight}px`,
            lineHeight: `${rowHeight}px`,
            textIndent: firstLineIndent ? `${firstLineIndent}px` : undefined,
            color: color ?? undefined,
            fontSize: `${fontSize}px`,
            backgroundImage: ruled ? ruledGradient(rowHeight) : undefined,
          }}
          className="w-full flex-1 break-words whitespace-pre-wrap outline-none"
        />

        {empty && placeholder && (
          <span
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 text-ink-faint/50"
            style={{
              lineHeight: `${rowHeight}px`,
              fontSize: `${fontSize}px`,
              textIndent: firstLineIndent ? `${firstLineIndent}px` : undefined,
            }}
          >
            {placeholder}
          </span>
        )}
      </div>

      {/* 폰 — 화면 맨 위 꾸미기 줄. 키보드가 올라와도 가리지 않는다 */}
      {showMobileBar && (
        <div
          role="toolbar"
          aria-label="꾸미기"
          className="fixed inset-x-0 top-0 z-50 flex gap-1 overflow-x-auto border-b border-edge bg-frame px-2 py-1.5 shadow-notebook"
        >
          {OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-label={option.label}
              /*
               * click 이 아니라 pointerdown 에서 처리한다.
               * 커서가 빠지지 않게 preventDefault 를 해야 하는데, 모바일에서
               * pointerdown 을 막으면 뒤따라오는 click 까지 같이 취소된다.
               */
              onPointerDown={(e) => {
                e.preventDefault()
                run(option)
              }}
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

      {/* 컴퓨터 — 커서 바로 아래. 칸이 좁아도 잘리지 않게 화면 기준으로 띄운다 */}
      {slashOpen && !narrow && (
        <ul
          role="listbox"
          aria-label="꾸미기"
          style={{ top: `${menuAt.top}px`, left: `${menuAt.left}px` }}
          className="fixed z-50 max-h-56 w-44 overflow-y-auto border border-rule bg-paper py-1 shadow-notebook"
        >
          {matches.map((option, i) => (
            <li key={option.key}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => run(option)}
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
