/**
 * 12개월 색 (DESIGN.md §2) — 흰색에서 핑크를 거쳐 보라로 부드럽게 이어진다.
 *
 * 인덱스 탭과 표지의 월별 완료율이 같은 색을 써야
 * "7월 = 하늘색"이 화면을 옮겨 다녀도 유지된다.
 */
export const MONTH_COLORS = [
  '#FFF8FC', // 1월 — 화이트 핑크
  '#FDEFF7', // 2월 — 블러시
  '#FAE2EF', // 3월 — 페탈 핑크
  '#F7D3E7', // 4월 — 로즈 핑크
  '#F2C4DE', // 5월 — 소프트 핑크
  '#EAB8D6', // 6월 — 로즈
  '#E1ADD4', // 7월 — 핑크 모브
  '#D9A7D3', // 8월 — 오키드
  '#D1A2D1', // 9월 — 라일락 핑크
  '#CAA0D2', // 10월 — 소프트 모브
  '#C3A0D3', // 11월 — 파스텔 퍼플
  '#BDA0D1', // 12월 — 라이트 플럼
] as const

/**
 * 표지 탭 (제일 위).
 *
 * 값을 적지 않고 프레임 테두리색을 그대로 가리킨다.
 * globals.css 에서 테마를 바꿨을 때 이 탭만 옛 색으로 남지 않게 하기 위해서다.
 */
export const COVER_COLOR = '#FFFDFE'
/** Free Note 탭 (제일 아래) */
export const NOTE_COLOR = '#B7A0CE'

/** 1~12 → 'YYYY-MM' */
export function yearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}
