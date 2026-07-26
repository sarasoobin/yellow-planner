/** items.kind — 어디에 적은 것인지 구분한다. DB의 check 제약과 값이 일치해야 한다. */
export const ITEM_KINDS = ['year', 'month', 'event', 'task'] as const
export type ItemKind = (typeof ITEM_KINDS)[number]

export type Item = {
  id: string
  kind: ItemKind
  /** 'YYYY-MM-DD'. kind별 의미는 supabase/schema.sql 주석 참고 */
  date: string
  content: string
  is_done: boolean
  color: string | null
  sort_order: number
  created_at: string
}

/** 폼 액션이 돌려주는 공통 상태 */
export type FormState = { error: string | null }
