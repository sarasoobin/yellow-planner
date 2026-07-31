/**
 * 노트에 붙일 수 있는 스티커 목록.
 *
 * 새 스티커를 넣는 법은 public/stickers/README.md 를 보세요.
 * 요약하면: SVG를 public/stickers/ 에 넣고, 아래 목록에 한 줄 추가.
 */
export const STICKERS = [
  { key: 'circle', label: '동그라미', src: '/stickers/circle.svg' },
  { key: 'star', label: '별', src: '/stickers/star.svg' },
] as const

export type StickerKey = (typeof STICKERS)[number]['key']

export function stickerSrc(key: string | null | undefined): string | null {
  if (!key) return null
  return STICKERS.find((s) => s.key === key)?.src ?? null
}

/**
 * 형광펜 색.
 *
 * 노랑을 쓰다가 초록으로 바꿨다. 노트 표지도 노랑이라 도구 막대에 놓인 형광펜이
 * 배경에 묻혀 보이지 않았고, 크림색 종이 위에서도 칠한 자리가 잘 드러나지 않았다.
 *
 * 펜 색과 같은 이유로 토큰이 아니라 값을 직접 적는다 (toolbar.tsx 의 PENS 주석).
 * 글 안에 저장되는 색이라 var() 를 쓰면 sanitize.ts 가 걸러낸다.
 */
export const HIGHLIGHTS = [
  { key: 'pink', label: '분홍', hex: '#F7B8CE' },
  { key: 'green', label: '초록', hex: '#A8DE8A' },
  { key: 'yellow', label: '노랑', hex: '#F3ED7A' },
] as const

export type HighlightKey = (typeof HIGHLIGHTS)[number]['key']

/** 도구 막대에서 처음 집어드는 색 */
export const HIGHLIGHT = HIGHLIGHTS[1].hex

/**
 * 형광펜으로 칠한 것으로 보는 색들.
 *
 * 칠한 자리를 다시 그으면 지워지는데, 그러려면 "이미 칠해져 있다"를 알아봐야
 * 한다. 세 색 중 어느 것으로 칠했든 지워져야 하므로 전부 여기 넣는다.
 * 노랑은 색을 바꾸기 전에 쓰던 색이기도 해서 옛 글도 이걸로 알아본다.
 */
export const HIGHLIGHT_COLORS = HIGHLIGHTS.map((h) => h.hex)

/**
 * 밑줄 색. 형광펜과 달리 글 안에 색으로 저장되지 않는다.
 * 밑줄은 "밑줄이 그어져 있다"는 사실만 저장하고 (text-decoration: underline)
 * 실제로 보이는 줄은 화면에 그린다 (components/paper-block.tsx).
 */
export const UNDERLINE_COLOR = '#C1453C'
