/**
 * 12개월 색 (DESIGN.md §2) — 흰색에서 핑크를 거쳐 보라로 부드럽게 이어진다.
 *
 * 인덱스 탭과 표지의 월별 완료율이 같은 색을 써야
 * "7월 = 하늘색"이 화면을 옮겨 다녀도 유지된다.
 */
export const MONTH_COLORS = [
  '#FDF0F5', // January — very light rose
  '#FCEBF2', // February — light blush
  '#FBE6EE', // March — petal pink
  '#F9E0E9', // April — soft pink
  '#F7DAE5', // May — blush pink
  '#F4D3E0', // June — rose pink
  '#F1CAD9', // July — warm rose
  '#EDC0D2', // August — dusty rose
  '#E9B6CB', // September — deep blush
  '#E5ACC5', // October — rose mauve
  '#E1A2BE', // November — muted rose
  '#DD98B8', // December — deepest pink
] as const

/**
 * 표지 탭 (제일 위).
 *
 * 값을 적지 않고 프레임 테두리색을 그대로 가리킨다.
 * globals.css 에서 테마를 바꿨을 때 이 탭만 옛 색으로 남지 않게 하기 위해서다.
 */
export const COVER_COLOR = '#FDEAF2'
/** Contents tab */
export const CONTENTS_COLOR = '#F9E3EC'
/** Free Note 탭 (제일 아래) */
export const NOTE_COLOR = '#F7E4ED'

/** 1~12 → 'YYYY-MM' */
export function yearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}
