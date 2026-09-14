/**
 * 12개월 색 (DESIGN.md §2) — 핑크빛 보라 안에서 은은하게 달라진다.
 *
 * 인덱스 탭과 표지의 월별 완료율이 같은 색을 써야
 * "7월 = 하늘색"이 화면을 옮겨 다녀도 유지된다.
 */
export const MONTH_COLORS = [
  '#AFA0DE', // 1월 — 아메시스트
  '#C39DE3', // 2월 — 바이올렛
  '#DC9AD8', // 3월 — 오키드
  '#EC9DC8', // 4월 — 핑크 라일락
  '#E7A8B7', // 5월 — 로즈
  '#DCA9C8', // 6월 — 모브
  '#CBA8DA', // 7월 — 퍼플 헤이즈
  '#B7A6E0', // 8월 — 페리윙클
  '#A6B4E1', // 9월 — 블루 라일락
  '#A9C2D9', // 10월 — 미스트 블루
  '#B7C9D0', // 11월 — 실버 모브
  '#C9B3D3', // 12월 — 플럼 그레이
] as const

/**
 * 표지 탭 (제일 위).
 *
 * 값을 적지 않고 프레임 테두리색을 그대로 가리킨다.
 * globals.css 에서 테마를 바꿨을 때 이 탭만 옛 색으로 남지 않게 하기 위해서다.
 */
export const COVER_COLOR = 'var(--color-edge)'
/** Free Note 탭 (제일 아래) */
export const NOTE_COLOR = '#D2C0D4'

/** 1~12 → 'YYYY-MM' */
export function yearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}
