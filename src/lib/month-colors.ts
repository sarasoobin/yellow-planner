/**
 * 12개월 색 (DESIGN.md §2) — 계절을 따라간다.
 *
 * 인덱스 탭과 표지의 월별 완료율이 같은 색을 써야
 * "7월 = 하늘색"이 화면을 옮겨 다녀도 유지된다.
 */
export const MONTH_COLORS = [
  '#A8C4D9', // 1월
  '#B8B0D4', // 2월
  '#F0BCC8', // 3월
  '#F5C9A0', // 4월
  '#C5DBA0', // 5월
  '#9CC9A8', // 6월
  '#8FC5D6', // 7월
  '#F5B889', // 8월
  '#D9B896', // 9월
  '#E09A73', // 10월
  '#B8A894', // 11월
  '#8FA3C4', // 12월
] as const

/**
 * 표지 탭 (제일 위).
 *
 * 값을 적지 않고 프레임 테두리색을 그대로 가리킨다.
 * globals.css 에서 노란색을 바꿨을 때 이 탭만 옛 색으로 남지 않게 하기 위해서다.
 */
export const COVER_COLOR = 'var(--color-edge)'
/** Free Note 탭 (제일 아래) */
export const NOTE_COLOR = '#C9C4BC'

/** 1~12 → 'YYYY-MM' */
export function yearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}
