'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { saveBlock } from '@/lib/actions/items'
import { PENS, useArmedSticker } from '@/components/toolbar'
import { useIsNarrow } from '@/components/use-is-narrow'
import { HIGHLIGHTS, HIGHLIGHT_COLORS, UNDERLINE_COLOR } from '@/lib/stickers'
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

/**
 * 체크한 자리에 덮어 그릴 표시.
 *
 * 체크는 글 안의 한 글자(☑)라서 그 글자만 빨갛게 하거나 키울 수가 없다.
 * CSS 로는 글자 하나를 집을 수 없기 때문이다. 그래서 글자는 그대로 두고,
 * 그 자리를 재서 위에 빨간 표시를 그린다. 네모를 넘어가도 된다 — 종이에
 * 색연필로 그으면 원래 칸을 넘어간다.
 *
 * 획을 두 번 긋는다. 하나는 진하게, 하나는 살짝 비껴서 옅게. 색연필이 종이에
 * 긁히면서 남는 결을 흉내낸 것이다.
 */
type CheckMark = { x: number; y: number; size: number }

/**
 * 글자 위나 아래에 긋는 줄.
 *
 * 취소선 — 체크한 줄의 글자를 가로지른다. "다 한 일" 이라는 뜻이다.
 * 밑줄  — 밑줄 자로 긁은 글자 아래에 그어진다.
 *
 * 둘 다 체크 표시와 같은 방식이다. 글에는 사실만 저장하고(☑ 이라는 글자,
 * text-decoration: underline) 보이는 줄은 자리를 재서 그린다.
 */
type Stroke = { x: number; y: number; w: number; kind: 'strike' | 'underline' }

/** 줄을 그릴 자리의 세로 두께. 손으로 그은 흔들림이 들어갈 만큼만 */
const STROKE_BOX = 8

/** 글자 크기 대비 표시 크기. 1보다 크면 네모를 넘어간다 */
const MARK_SCALE = 1.55

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
  | { kind: 'highlight'; hex: string }

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
    key: 'underline',
    label: '밑줄',
    alias: 'underline',
    icon: (
      <span className="flex flex-col items-center gap-[2px]">
        <span className="text-[11px] leading-none">가</span>
        <span
          className="block h-[2px] w-3 rounded-full"
          style={{ backgroundColor: UNDERLINE_COLOR }}
        />
      </span>
    ),
    command: { kind: 'exec', name: 'underline' },
  },
  ...HIGHLIGHTS.map((pen) => ({
    key: `highlight-${pen.key}`,
    label: `${pen.label} 형광펜`,
    alias: `highlight marker ${pen.key} ${pen.label}`,
    icon: (
      <span
        className="block h-[3px] w-3 rounded-full"
        style={{ backgroundColor: pen.hex }}
      />
    ),
    command: { kind: 'highlight' as const, hex: pen.hex },
  })),
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

/** '#A8DE8A' -> 'rgb(168, 222, 138)'. 브라우저가 돌려주는 형식과 맞추려고 */
function toRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

/**
 * 고른 자리에서 첫 글자를 찾는다.
 *
 * 한 줄을 통째로 긁으면 고른 자리의 기준점이 글자가 아니라 그 글자를 담은
 * 상자가 된다. 상자를 보고 색을 판단하면 안에 칠해진 글자를 못 알아본다.
 * 그래서 상자 안으로 들어가 첫 글자를 찾아 그것을 본다.
 */
function firstTextIn(range: Range): Text | null {
  if (range.startContainer.nodeType === Node.TEXT_NODE) {
    return range.startContainer as Text
  }

  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
  )
  let node: Node | null
  while ((node = walker.nextNode())) {
    if (node.textContent?.trim() && range.intersectsNode(node)) {
      return node as Text
    }
  }
  return null
}

/** 지금 고른 자리에 칠해져 있는 형광펜 색(#hex). 안 칠해졌으면 null */
function highlightAt(): string | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null

  const text = firstTextIn(selection.getRangeAt(0))
  const element = text?.parentElement
  if (!element) return null

  // 칠하지 않은 글자는 투명(rgba(0, 0, 0, 0))이 나온다
  const painted = getComputedStyle(element).backgroundColor
  return HIGHLIGHT_COLORS.find((hex) => toRgb(hex) === painted) ?? null
}

/**
 * 형광펜을 칠하거나 지운다.
 *
 * hiliteColor 는 굵게·기울임과 달리 껐다 켰다 하는 명령이 아니라 색을 넣는
 * 명령이다. 같은 색을 또 넣어봐야 그대로다. 그래서 칠해져 있는지 직접 보고,
 * 같은 색이면 투명으로 되돌려 지운다. 다른 색이면 그 색으로 바꾼다.
 */
function toggleHighlight(hex: string) {
  document.execCommand('styleWithCSS', false, 'true')
  document.execCommand(
    'hiliteColor',
    false,
    highlightAt() === hex ? 'transparent' : hex,
  )
}

/**
 * 밑줄을 긋거나 지운다.
 *
 * 글에는 "밑줄이 그어져 있다"는 사실만 저장한다 (text-decoration: underline).
 * 실제로 보이는 빨간 줄은 화면에 그린다 — 브라우저가 긋는 줄은 글자색을 따라가
 * 인쇄한 것처럼 보이기 때문이다. 브라우저 줄은 globals.css 에서 감춘다.
 */
function toggleUnderline() {
  document.execCommand('styleWithCSS', false, 'true')
  document.execCommand('underline')
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

/** 줄을 나누는 태그. 나머지(span·b·i·u·font…)는 글자를 꾸미는 것일 뿐이다 */
const LINE_TAGS = new Set(['DIV', 'P'])

/**
 * 그 글자가 속한 "줄".
 *
 * contenteditable 은 줄마다 div 를 만든다. 첫 줄만은 div 없이 편집기 바로
 * 밑에 놓이기도 해서, 그때는 편집기 자신이 줄이 된다.
 *
 * ⚠️ 꾸미기 태그를 줄로 세면 안 된다. 굵게·색·크기를 주면 그 글자가 span 안에
 * 들어가는데, span 을 새 줄로 보면 취소선이 거기서 끊긴다. 체크박스를 먼저 넣고
 * 글자를 꾸며 적었을 때 이미 적은 글에 줄이 안 그어지던 원인이 이것이었다.
 */
function lineBoxOf(root: HTMLElement, node: Node): Node {
  let element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement

  while (element && element !== root) {
    if (LINE_TAGS.has(element.tagName)) return element
    element = element.parentElement
  }
  return root
}

/**
 * 어떤 글자 바로 뒤부터 그 줄 끝까지.
 *
 * 체크한 줄에 취소선을 그으려면 "이 체크가 맡은 글자가 어디까지인가"를 알아야
 * 한다. <br> 을 만나거나 줄 상자가 바뀌면 거기서 끊는다.
 */
function lineAfter(root: HTMLElement, text: Text, index: number): Range | null {
  const line = lineBoxOf(root, text)

  let lastText = text
  let lastOffset = text.data.length

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
  )
  walker.currentNode = text

  let node: Node | null
  while ((node = walker.nextNode())) {
    if (node.nodeName === 'BR') break
    if (lineBoxOf(root, node) !== line) break
    if (node.nodeType === Node.TEXT_NODE) {
      lastText = node as Text
      lastOffset = lastText.data.length
    }
  }

  const range = document.createRange()
  range.setStart(text, index + 1)
  range.setEnd(lastText, lastOffset)
  return range.collapsed ? null : range
}

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
  const [state, formAction, pending] = useActionState(saveBlock, { error: null })
  const narrow = useIsNarrow()
  const { marker, underline } = useArmedSticker()

  const editorRef = useRef<HTMLDivElement>(null)
  const hiddenRef = useRef<HTMLInputElement>(null)
  const saved = useRef<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
   *
   * useRef 가 아니라 useState 로 붙든다. 하는 일은 같지만(처음 만든 객체를
   * 그대로 계속 돌려준다) 그리는 도중에 ref 를 읽지 않아 규칙에 걸리지 않는다.
   */
  const [initialHtml] = useState(() => ({ __html: toDisplayHtml(content) }))

  const [empty, setEmpty] = useState(() => isBlank(content))
  const [focused, setFocused] = useState(false)
  const [marks, setMarks] = useState<CheckMark[]>([])
  const [strokes, setStrokes] = useState<Stroke[]>([])

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
   * 손을 뗐을 때. 도구를 집어들었으면 방금 긁은 만큼 칠하거나 줄을 긋는다.
   *
   * 도구는 내려놓을 때까지 켜져 있다. 여러 군데를 이어서 칠하는 물건이라
   * 한 번 쓸 때마다 다시 집어들게 하면 쓸 수가 없다.
   */
  function handleMouseUp() {
    const root = editorRef.current
    const selection = window.getSelection()
    const range =
      selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

    const scribbled =
      (marker || underline) &&
      root &&
      range &&
      !range.collapsed &&
      root.contains(range.commonAncestorContainer)

    if (!scribbled) return syncPicked()

    if (marker) toggleHighlight(marker)
    else toggleUnderline()

    // 긁은 자리가 그대로 남아 있으면 다음에 그은 데가 어디인지 헷갈린다
    selection!.removeAllRanges()
    setPickedAt(null)
    scheduleMeasure()
    save()
  }

  /** 안내 문구를 띄울지 말지. 내용이 바뀔 만한 곳마다 다시 본다. */
  function syncEmpty() {
    setEmpty(isBlank(editorRef.current?.innerHTML ?? ''))
  }

  /**
   * 체크한 글자가 화면 어디에 있는지 재둔다. 그 자리에 표시를 그린다.
   *
   * 글자 하나하나의 자리는 Range 로만 알 수 있다. 줄바꿈으로 자리가 밀리므로
   * 내용이 바뀔 때마다, 그리고 창 크기가 바뀔 때마다 다시 잰다.
   */
  function measureChecks() {
    const root = editorRef.current
    if (!root) return

    const base = root.getBoundingClientRect()
    const found: CheckMark[] = []
    const drawn: Stroke[] = []

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let node: Node | null
    while ((node = walker.nextNode())) {
      const text = node as Text
      for (let i = 0; i < text.data.length; i++) {
        if (text.data[i] !== CHECKED) continue

        const range = document.createRange()
        range.setStart(text, i)
        range.setEnd(text, i + 1)
        const rect = range.getBoundingClientRect()
        if (!rect.width) continue

        const size = rect.height * MARK_SCALE
        found.push({
          // 글자 한가운데에 표시의 한가운데를 맞춘다
          x: rect.left - base.left + rect.width / 2 - size / 2,
          y: rect.top - base.top + rect.height / 2 - size / 2,
          size,
        })

        // 체크한 줄은 가로질러 긋는다. 줄바꿈된 줄마다 하나씩
        const rest = lineAfter(root, text, i)
        for (const line of rest ? Array.from(rest.getClientRects()) : []) {
          if (line.width < 2) continue
          drawn.push({
            x: line.left - base.left,
            y: line.top - base.top + line.height / 2 - STROKE_BOX / 2,
            w: line.width,
            kind: 'strike',
          })
        }
      }
    }

    /*
     * 밑줄. 글에는 사실만 저장돼 있고(text-decoration: underline) 브라우저가
     * 긋는 줄은 globals.css 에서 감춰뒀다. 여기서 자리를 재서 대신 그린다.
     * 겹쳐 감싼 경우 안쪽만 그리면 두 번 그어지지 않는다.
     */
    for (const el of root.querySelectorAll('u, [style*="underline"]')) {
      if (el.querySelector('u, [style*="underline"]')) continue
      for (const line of Array.from(el.getClientRects())) {
        if (line.width < 2) continue
        drawn.push({
          x: line.left - base.left,
          y: line.bottom - base.top - STROKE_BOX / 2 - 1,
          w: line.width,
          kind: 'underline',
        })
      }
    }

    setMarks(found)
    setStrokes(drawn)
  }

  /** 글이 바뀐 직후에는 아직 자리가 안 잡혀 있다. 한 프레임 뒤에 잰다 */
  function scheduleMeasure() {
    requestAnimationFrame(measureChecks)
  }

  useEffect(() => {
    measureChecks()

    // 창을 줄이면 줄바꿈 자리가 달라져 체크도 따라 움직인다
    const onResize = () => measureChecks()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // 이 칸은 처음 그린 내용을 붙들고 다시 안 받아온다. 한 번만 걸면 된다.
  }, [])

  function handleInput() {
    scheduleMeasure()

    // 줄 앞의 `#` 을 크기로 바꿨다면 `/` 메뉴는 볼 것도 없다
    if (applyMarkdown()) {
      syncEmpty()
      closeMenu()
      return
    }

    syncEmpty()
    setPickedAt(null)
    scheduleSave()
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
      toggleHighlight(command.hex)
    } else {
      wrapFontSize(command.px)
    }

    syncEmpty()
    scheduleMeasure()
    save()
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
      scheduleMeasure()
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

  /** 잠시 멈추면 저장한다. 포커스를 잃을 때까지 기다리면 마지막 문장이 사라질 수 있다. */
  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(save, 800)
  }

  useEffect(() => {
    // 실패한 값은 다음 입력·포커스 이탈에서 다시 보낼 수 있게 한다.
    if (state.error) saved.current = null
  }, [state])

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

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
            if (saveTimer.current) clearTimeout(saveTimer.current)
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
            scheduleMeasure()
            scheduleSave()
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

        {/*
          체크 표시. 글자 위에 덮어 그린다 (CheckMark 주석).
          누르는 것은 밑의 글자가 받아야 하므로 이 층은 클릭을 가로채지 않는다.
        */}
        {marks.map((mark, i) => (
          <svg
            key={i}
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-today)"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute"
            style={{
              left: `${mark.x}px`,
              top: `${mark.y}px`,
              width: `${mark.size}px`,
              height: `${mark.size}px`,
              // 반듯하게 그으면 인쇄한 것처럼 보인다. 살짝 기울인다
              transform: 'rotate(-7deg)',
            }}
          >
            <path d="M4.5 12.5 L10 18 L20 4.5" strokeWidth="3.4" />
            {/* 살짝 비껴 그은 옅은 획 — 색연필이 남기는 결 */}
            <path
              d="M5.2 11.6 L10.4 17.2 L19.4 4"
              strokeWidth="1.6"
              opacity="0.45"
            />
          </svg>
        ))}

        {/* 취소선과 밑줄. 손으로 그은 것처럼 살짝 흔들리게 */}
        {strokes.map((stroke, i) => (
          <svg
            key={i}
            aria-hidden
            viewBox={`0 0 100 ${STROKE_BOX}`}
            preserveAspectRatio="none"
            fill="none"
            stroke="var(--color-today)"
            strokeLinecap="round"
            className="pointer-events-none absolute"
            style={{
              left: `${stroke.x}px`,
              top: `${stroke.y}px`,
              width: `${stroke.w}px`,
              height: `${STROKE_BOX}px`,
            }}
          >
            {/*
              vectorEffect 로 굵기를 화면 기준으로 고정한다. 이 그림은 가로로만
              늘어나므로, 안 그러면 짧은 줄은 굵고 긴 줄은 가늘어진다.
            */}
            <path
              d="M0 4.4 Q 25 3.2, 50 4.2 T 100 3.8"
              strokeWidth={stroke.kind === 'strike' ? 2 : 2.2}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M0 5 Q 30 4, 55 4.9 T 100 4.4"
              strokeWidth="1"
              opacity="0.4"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ))}

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
          <button
            type="button"
            onClick={save}
            className="ml-2 cursor-pointer underline underline-offset-2"
          >
            다시 시도
          </button>
        </p>
      )}
      {pending && <p className="pt-1 text-[11px] text-ink-faint">저장 중…</p>}
    </form>
  )
}
