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

/** 형광펜 색. 노란 종이 위에서도 보이도록 살짝 초록빛이 도는 노랑을 쓴다. */
export const HIGHLIGHT = '#F3ED7A'
