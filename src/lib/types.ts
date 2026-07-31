/** items.kind — 어디에 적은 것인지 구분한다. DB의 check 제약과 값이 일치해야 한다. */
export const ITEM_KINDS = [
  'year',
  'month',
  'event',
  'task',
  'daily',
  'sticker',
] as const
export type ItemKind = (typeof ITEM_KINDS)[number]

/**
 * 한 줄의 꾸미기. DB에는 items.style (jsonb) 한 칸에 통째로 들어간다.
 * 값이 없으면 기본값으로 본다 — 예전에 적은 항목도 그대로 잘 보인다.
 */
/**
 * 글자 크기. 종이에 크게 쓰기도 하고 작게 쓰기도 한다.
 * md 가 본문 기본값이다. 한글은 16px 아래로 내려가면 읽기 힘들어진다.
 */
export const SIZES = {
  sm: 13,
  md: 16,
  lg: 20,
  xl: 26,
} as const
export type SizeKey = keyof typeof SIZES

/**
 * 한 칸을 어떤 펜으로 적었는지.
 *
 * 체크박스는 여기 없다. 손으로 그리는 것이라 글 안에 ☐ / ☑ 글자로 들어간다.
 * 그래서 줄 앞이든 문장 중간이든 아무 자리에나 그릴 수 있다.
 */
export type ItemStyle = {
  bold?: boolean
  italic?: boolean
  /** 형광펜 */
  highlight?: boolean
  size?: SizeKey
  /** kind='sticker' 일 때 붙인 자리. 페이지 크기 대비 % 라서 화면이 좁아져도 안 밀린다 */
  x?: number
  y?: number
  /**
   * kind='sticker' 의 크기 배율. 없으면 1.
   * 사진을 붙이고 모서리를 끌어 키우듯 스티커도 끌어서 키운다.
   */
  scale?: number
}

/** 스티커 기본 크기(px)와 늘릴 수 있는 범위 */
export const STICKER_SIZE = 32
export const STICKER_SCALE = { min: 0.5, max: 4 } as const

/** Free Note 페이지에 붙인 스티커의 기준일. 실제 날짜와 겹치지 않는 자리표시자다. */
export const FREE_NOTE_ANCHOR = '1970-01-01'

export type Item = {
  id: string
  kind: ItemKind
  /** 'YYYY-MM-DD'. kind별 의미는 supabase/schema.sql 주석 참고 */
  date: string
  content: string
  is_done: boolean
  color: string | null
  sort_order: number
  style: ItemStyle | null
  created_at: string
}

/** 폼 액션이 돌려주는 공통 상태 */
export type FormState = { error: string | null }
