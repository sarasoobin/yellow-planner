'use client'

import { useActionState, useRef, useState } from 'react'
import { saveBlock } from '@/lib/actions/items'
import { PENS, useArmedSticker } from '@/components/toolbar'
import { useIsNarrow } from '@/components/use-is-narrow'
import { HIGHLIGHT } from '@/lib/stickers'
import { isBlank, toDisplayHtml } from '@/lib/rich-text'
import { SIZES, type ItemKind, type ItemStyle, type SizeKey } from '@/lib/types'

/**
 * 종이 한 칸.
 *
 * 이 앱은 웹이 아니라 종이다. 한 칸은 줄 목록이 아니라 그냥 글을 적는 자리다.
 * 마구잡이로 쓰고, Enter를 치면 줄이 바뀌고, 칸 끝에 닿으면 다음 줄로 넘어간다.
 *
 * 꾸미기는 두 갈래다. 둘이 하는 일이 다르다.
 *   글자를 고르면 → 뜨는 막대로 그 부분만 바꾼다
 *   그냥 `/`      → 그 뒤로 쓸 글자를 정한다 (펜을 바꿔 드는 것)
 * `/` 로 고른 글자를 바꿀 수는 없다. `/` 를 치는 순간 고른 글자가 지워지고
 * 그 자리에 `/` 가 들어가기 때문이다.
 */

const BOX = '☐'
const CHECKED = '☑'

/** 공책 괘선. 칸마다 줄 간격이 달라서 클래스 대신 값으로 만든다. */
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
  /** 형광펜만 따로 둔다. 켜고 끄는 것을 직접 챙겨야 해서 (toggleHighlight) */
  | { kind: 'highlight' }

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

const CHECK_OPTION: Option = {
  key: 'check',
  label: '체크박스',
  alias: 'checkbox todo box',
  icon: <span className="text-[14px] leading-none">{BOX}</span>,
  command: { kind: 'insert', text: `${BOX} ` },
}

/** 글자를 고른 뒤에도, 그냥 커서만 두고도 쓸 수 있는 것들 */
const STYLE_OPTIONS: Option[] = [
  {
    key: 'bold',
    label: '굵게',
    alias: 'bold',
    icon: <span className="text-[12px] font-bold">B</span>,
    command: { kind: 'exec', name: 'bold' },
  },
  {
    key: 'italic',
    label: '기울임',
    alias: 'italic',
    icon: <span className="font-serif text-[12px] italic">I</span>,
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
    command: { kind: 'highlight' },
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
        // 메뉴 아이콘은 실제 크기를 줄여서 보여준다. 그대로 쓰면 메뉴가 들쭉날쭉해진다.
        style={{ fontSize: `${Math.min(Math.round(SIZES[size.key] * 0.72), 18)}px` }}
      >
        가
      </span>
    ),
    command: { kind: 'size' as const, px: SIZES[size.key] },
  })),
]

const OPTIONS: Option[] = [CHECK_OPTION, ...STYLE_OPTIONS]

/** '#F3ED7A' -> 'rgb(243, 237, 122)'. 브라우저가 돌려주는 형식과 맞추려고 */
function toRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

const HIGHLIGHT_RGB = toRgb(HIGHLIGHT)

/**
 * 지금 커서 자리가 이미 형광펜으로 칠해져 있는가.
 *
 * hiliteColor 는 굵게·기울임과 달리 껐다 켰다 하는 명령이 아니라 색을 넣는
 * 명령이다. 같은 색을 또 넣어봐야 그대로다. 그래서 칠해져 있는지 직접 보고,
 * 칠해져 있으면 투명으로 되돌려 지운다.
 */
function isHighlighted(): boolean {
  const selection = window.getSelection()
  const node = selection?.anchorNode
  if (!node) return false

  const element = node.nodeType === 1 ? (node as Element) : node.parentElement
  if (!element) return false

  // 칠하지 않은 글자는 투명(rgba(0, 0, 0, 0))이 나온다
  return getComputedStyle(element).backgroundColor === HIGHLIGHT_RGB
}

/** 형광펜을 칠하거나 지운다 */
function toggleHighlight() {
  document.execCommand('styleWithCSS', false, 'true')
  document.execCommand(
    'hiliteColor',
    false,
    isHighlighted() ? 'transparent' : HIGHLIGHT,
  )
}

/**
 * 커서만 있을 때(고른 글자가 없을 때) 크기를 정하는 데 쓰는 빈 자리표.
 *
 * 빈 span 은 브라우저가 곧바로 지워버려서 크기를 붙들어둘 수가 없다.
 * 눈에 안 보이는 글자 하나를 넣어 span 을 살려두고, 그 안에 커서를 놓는다.
 * 이후 치는 글자가 그 안에 들어가 그 크기로 적힌다.
 * 저장할 때 이 글자는 걷어낸다 (lib/actions/items.ts).
 */
const ZERO_WIDTH = '​'

/** 고른 글자를 span 으로 감싸 크기를 준다. execCommand 의 fontSize 는 1~7 뿐이라 직접 한다. */
function wrapFontSize(px: number) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)

  // 고른 글자가 없으면 자리표를 놓고 그 안에서 이어 쓰게 한다
  if (range.collapsed) {
    const holder = document.createElement('span')
    holder.style.fontSize = `${px}px`
    holder.textContent = ZERO_WIDTH
    range.insertNode(holder)

    const after = document.createRange()
    after.setStart(holder.firstChild!, 1)
    after.collapse(true)
    selection.removeAllRanges()
    selection.addRange(after)
    return
  }

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

/** 막대를 글자 바로 아래에 놓되 화면 밖으로 나가지 않게 한다 */
function positionBelow(rect: DOMRect, width: number) {
  return {
    top: Math.max(Math.min(rect.bottom + 6, window.innerHeight - 60), 8),
    left: Math.max(Math.min(rect.left, window.innerWidth - width - 8), 8),
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
  fontSize = 16,
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
  const { marker } = useArmedSticker()

  const editorRef = useRef<HTMLDivElement>(null)
  const hiddenRef = useRef<HTMLInputElement>(null)
  const saved = useRef<string | null>(null)

  /*
   * 처음 그릴 때의 내용을 객체째로 붙들어두고 다시는 바꾸지 않는다.
   *
   * ⚠️ 객체를 통째로 붙드는 게 핵심이다. 값만 같은 새 객체를 넘기면 안 된다.
   * React 19는 prop 이 바뀌었는지 값이 아니라 참조로 판단한다.
   *
   *     if (nextProp !== lastProp) setProp(...)   // updateProperties
   *
   * dangerouslySetInnerHTML={{ __html: 같은문자열 }} 처럼 매번 새 객체를
   * 만들면 내용이 같아도 참조가 달라 매 렌더마다 innerHTML 을 다시 써넣는다.
   * 그러면 적고 있던 글이 통째로 초기값으로 되돌아가고 커서도 사라진다.
   * `/` 를 칠 때마다 메뉴 상태가 바뀌며 다시 그려지므로, 방금 친 `/명령어`가
   * 그 순간 지워지고 뒤이은 서식 명령은 허공에 적용됐다.
   *
   * 실제 크롬에서 확인한 증상: 편집기 노드는 그대로인데 자식 11개가
   * 통째로 교체(added 11 / removed 11)되고 내용이 원래대로 돌아갔다.
   *
   * 대가: 이 칸은 한 번 열리면 서버 내용을 다시 받아오지 않는다.
   * router.refresh() 같은 부드러운 갱신으로는 안 바뀐다. 그건 props 만
   * 새로 넘길 뿐 컴포넌트를 다시 만들지 않는데, 여기서 그 props 를 안 보기
   * 때문이다. 브라우저 새로고침이나 다른 페이지에 갔다 돌아와야 바뀐다.
   *
   * 그래서 두 기기에서 같은 칸을 열어두면 나중에 저장한 쪽이 앞의 것을
   * 조용히 덮어쓴다. 혼자 쓰는 다이어리라 감수하지만, 여럿이 쓰게 되면
   * 저장할 때 updated_at 을 비교해 충돌을 알려주는 장치가 필요하다.
   */
  const initialHtml = useRef({ __html: toDisplayHtml(content) }).current

  const [empty, setEmpty] = useState(() => isBlank(content))
  const [focused, setFocused] = useState(false)

  // `/` 를 친 자리. 메뉴에서 고르면 여기부터 커서까지를 지운다.
  const slashRef = useRef<{ node: Text; from: number; to: number } | null>(null)
  const [query, setQuery] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const [menuAt, setMenuAt] = useState({ top: 0, left: 0 })

  // 글자를 골랐을 때 뜨는 막대
  const [pickedAt, setPickedAt] = useState<{ top: number; left: number } | null>(
    null,
  )

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

    // 커서만 있는 자리는 크기가 0인 사각형이 나오기도 한다. 그때는 그 줄을 기준으로.
    let rect = selection.getRangeAt(0).getBoundingClientRect()
    if (!rect.height) rect = (text.parentElement ?? root).getBoundingClientRect()
    setMenuAt(positionBelow(rect, 176))
  }

  /**
   * 줄 맨 앞에 적은 `# ` `## ` `### ` 를 글자 크기로 바꾼다.
   *
   * 이 앱에는 '제목' 이라는 것이 따로 없고 글자 크기 네 단계만 있다.
   * 그래서 마크다운의 제목 단계를 크기로 옮긴다.
   *   `# `   아주 크게        `## `  크게        `### ` 보통 + 굵게
   *
   * 줄 맨 앞에서만 본다. 문장 중간의 `#` 은 그냥 글자다 ("#3 과제").
   * 그 판단은 "커서 앞의 글자가 `#` 들과 띄어쓰기뿐인가" 하나로 충분하다.
   * 앞에 다른 글자가 있으면 같은 글자 노드에 들어 있어 걸러진다.
   *
   * 바뀐 게 있으면 true.
   */
  function applyMarkdown(): boolean {
    const root = editorRef.current
    const selection = window.getSelection()
    if (!root || !selection || selection.rangeCount === 0) return false

    const node = selection.anchorNode
    if (!node || node.nodeType !== Node.TEXT_NODE || !root.contains(node)) {
      return false
    }

    const text = node as Text
    const offset = selection.anchorOffset
    const marks = /^(#{1,3}) $/.exec(text.data.slice(0, offset))
    if (!marks) return false

    // 적어둔 `#` 을 지운다. 직접 지우면 빈 글자 노드가 남아 뒤이은 명령이
    // 먹지 않는다 (run() 의 `/명령어` 지우기와 같은 이유). 브라우저에 맡긴다.
    const range = document.createRange()
    range.setStart(text, 0)
    range.setEnd(text, offset)
    selection.removeAllRanges()
    selection.addRange(range)
    document.execCommand('delete')

    document.execCommand('styleWithCSS', false, 'true')
    const level = marks[1].length
    wrapFontSize(level === 1 ? SIZES.xl : level === 2 ? SIZES.lg : SIZES.md)
    if (level === 3) document.execCommand('bold')

    return true
  }

  /** 글자를 골랐는지 살펴 막대를 띄우거나 감춘다 */
  function syncPicked() {
    const root = editorRef.current
    const selection = window.getSelection()
    if (!root || !selection || selection.rangeCount === 0) {
      return setPickedAt(null)
    }
    const range = selection.getRangeAt(0)
    if (range.collapsed || !root.contains(range.commonAncestorContainer)) {
      return setPickedAt(null)
    }
    setPickedAt(positionBelow(range.getBoundingClientRect(), 300))
  }

  /**
   * 손을 뗐을 때. 형광펜을 집어들었으면 방금 긁은 만큼 칠한다.
   *
   * 형광펜은 내려놓을 때까지 켜져 있다. 여러 군데를 이어서 칠하는 물건이라
   * 한 번 칠할 때마다 다시 집어들게 하면 쓸 수가 없다.
   */
  function handleMouseUp() {
    const root = editorRef.current
    const selection = window.getSelection()
    const range =
      selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

    const scribbled =
      marker &&
      root &&
      range &&
      !range.collapsed &&
      root.contains(range.commonAncestorContainer)

    if (!scribbled) return syncPicked()

    toggleHighlight()
    // 칠한 자리가 그대로 남아 있으면 다음에 그은 데가 어디인지 헷갈린다
    selection!.removeAllRanges()
    setPickedAt(null)
    save()
  }

  /** 안내 문구를 띄울지 말지. 내용이 바뀔 만한 곳마다 다시 본다. */
  function syncEmpty() {
    setEmpty(isBlank(editorRef.current?.innerHTML ?? ''))
  }

  function handleInput() {
    // 줄 앞의 `#` 을 크기로 바꿨다면 `/` 메뉴는 볼 것도 없다
    if (applyMarkdown()) {
      syncEmpty()
      closeMenu()
      return
    }

    syncEmpty()
    setPickedAt(null)
    /*
     * 일부 브라우저는 입력이 끝난 시점에 커서 위치를 아직 갱신하지 않는다.
     * 그대로 읽으면 "커서 앞에 아무것도 없다"고 나와 `/` 를 쳐도 안 열렸다.
     */
    requestAnimationFrame(syncMenu)
  }

  function run(option: Option) {
    const root = editorRef.current
    if (!root) return

    const slash = slashRef.current
    if (slash) {
      /*
       * 입력한 `/명령어` 를 지운다.
       * 글자를 직접 지우면(deleteData) 빈 글자 노드가 남아 브라우저가 정리해버리고,
       * 그러면 곧바로 이어지는 서식 명령이 먹지 않았다. 지우는 것도 브라우저에 맡긴다.
       */
      try {
        const range = document.createRange()
        range.setStart(slash.node, slash.from)
        range.setEnd(slash.node, slash.to)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
        document.execCommand('delete')
      } catch {
        // 그 사이 글이 바뀌어 자리를 못 찾은 경우. 명령은 그대로 진행한다.
      }
    }
    closeMenu()
    setPickedAt(null)

    // 서식을 태그가 아니라 style 로 남긴다. 저장할 때 걸러내기 쉽다.
    document.execCommand('styleWithCSS', false, 'true')

    const command = option.command
    if (command.kind === 'insert') {
      document.execCommand('insertText', false, command.text)
    } else if (command.kind === 'exec') {
      document.execCommand(command.name, false, command.value)
    } else if (command.kind === 'highlight') {
      toggleHighlight()
    } else {
      wrapFontSize(command.px)
    }

    syncEmpty()
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

  /** 그려둔 네모를 누르면 체크한다 (고른 글자 확인은 onMouseUp 이 이미 했다) */
  function handleClick() {
    const selection = window.getSelection()
    const node = selection?.anchorNode
    if (!node || node.nodeType !== Node.TEXT_NODE) return
    if (!selection!.getRangeAt(0).collapsed) return

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
  // 폰에서는 칸을 누르면 이미 막대가 떠 있다. 두 개가 겹치면 어지럽다.
  // 형광펜을 든 동안에도 띄우지 않는다. 긁는 족족 칠해지므로 고를 일이 없다.
  const showPickedBar = pickedAt !== null && !narrow && !marker

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
          ref={(el) => {
            editorRef.current = el
            // 처음 붙을 때의 내용을 기준으로 잡는다. 안 바뀌었으면 저장하지 않는다.
            if (el && saved.current === null) saved.current = el.innerHTML
          }}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={placeholder || '적는 곳'}
          spellCheck={false}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onKeyUp={syncPicked}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            closeMenu()
            setPickedAt(null)
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
            syncEmpty()
          }}
          dangerouslySetInnerHTML={initialHtml}
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

      {/* 글자를 고르면 뜨는 막대 — 고른 부분만 바뀐다 */}
      {showPickedBar && (
        <div
          role="toolbar"
          aria-label="고른 글자 꾸미기"
          style={{ top: `${pickedAt.top}px`, left: `${pickedAt.left}px` }}
          className="fixed z-50 flex items-center gap-0.5 border border-rule bg-paper px-1 py-1 shadow-notebook"
        >
          {STYLE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-label={option.label}
              title={option.label}
              // 누르는 순간 고른 글자가 풀리면 안 된다
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run(option)}
              className="grid size-7 cursor-pointer place-items-center rounded-[2px] text-ink-soft hover:bg-frame/70"
            >
              {option.icon}
            </button>
          ))}
        </div>
      )}

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
              className="flex shrink-0 items-center gap-1 rounded-[3px] border border-ink/15 bg-paper px-2.5 py-2 text-[12px] whitespace-nowrap text-ink-soft active:bg-frame"
            >
              <span className="grid size-4 place-items-center">
                {option.icon}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* 컴퓨터 — `/` 로 여는 메뉴. 그 뒤로 쓸 글자를 정한다 */}
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
                className={`flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left text-[13px] ${
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
        <p role="alert" className="pt-1 text-[11px] text-danger">
          {state.error}
        </p>
      )}
    </form>
  )
}
