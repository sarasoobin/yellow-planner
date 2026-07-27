/** items.kind — 어디에 적은 것인지 구분한다. DB의 check 제약과 값이 일치해야 한다. */
export const ITEM_KINDS = ['year', 'month', 'event', 'task', 'daily'] as const
export type ItemKind = (typeof ITEM_KINDS)[number]

/**
 * 한 줄의 꾸미기. DB에는 items.style (jsonb) 한 칸에 통째로 들어간다.
 * 값이 없으면 기본값으로 본다 — 예전에 적은 항목도 그대로 잘 보인다.
 */
export type ItemStyle = {
  bold?: boolean
  italic?: boolean
  /** 형광펜 */
  highlight?: boolean
  /** 체크박스를 그릴지. 없으면 kind별 기본값(defaultCheck) */
  check?: boolean
  /** 스티커 이름. src/lib/stickers.ts 참고 */
  sticker?: string | null
}

/**
 * 체크박스를 기본으로 그릴지는 어디에 적느냐에 달렸다.
 *   올해 목표·주간 할 일 → 체크하는 것이라 네모가 있어야 한다
 *   이 달 메모·달력 일정·그날 한 줄 → 그냥 적는 것이라 네모가 없다
 * 줄마다 따로 켜고 끌 수 있다.
 */
export function defaultCheck(kind: ItemKind): boolean {
  return kind === 'year' || kind === 'task'
}

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
