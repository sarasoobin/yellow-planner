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
export const HIGHLIGHT = '#A8DE8A'

/**
 * 형광펜으로 칠한 것으로 보는 색들.
 *
 * 색을 바꾸기 전에 칠해둔 글이 남아 있다. 지금 색만 보면 옛날에 칠한 자리를
 * 다시 그어도 안 지워진다. 지우는 쪽은 옛 색까지 알아본다.
 */
export const HIGHLIGHT_COLORS = [HIGHLIGHT, '#F3ED7A'] as const
