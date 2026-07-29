import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

/**
 * 이 앱의 날짜 규칙
 * - 주는 월요일에 시작한다 (PRODUCT.md §5)
 * - DB에는 항상 'YYYY-MM-DD' 문자열로 저장한다
 * - Date 객체는 계산할 때만 쓰고 바로 문자열로 되돌린다.
 *   toISOString()은 UTC로 바꿔버려 한국 시간 기준 날짜가 하루 밀린다. 쓰지 않는다.
 */

/** 주 시작 요일: 월요일 */
const WEEK_OPTS = { weekStartsOn: 1 } as const

export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

/** Date -> 'YYYY-MM-DD' (로컬 시간 기준) */
export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** 'YYYY-MM-DD' -> Date. 형식이 틀리면 null */
export function fromISODate(value: string): Date | null {
  const parsed = parse(value, 'yyyy-MM-dd', new Date())
  return isValid(parsed) ? parsed : null
}

export function todayISO(): string {
  return toISODate(new Date())
}

/** 'YYYY-MM' 이 올바른지 확인하고 Date로 바꾼다. 틀리면 null */
export function parseYearMonth(ym: string): Date | null {
  if (!/^\d{4}-\d{2}$/.test(ym)) return null
  const parsed = parse(`${ym}-01`, 'yyyy-MM-dd', new Date())
  return isValid(parsed) ? parsed : null
}

/** 'YYYY-MM' -> 그 달 1일 ('YYYY-MM-01'). 월간 할 일을 저장하는 날짜 */
export function monthFirstDay(ym: string): string {
  return `${ym}-01`
}

/** 연간 목표를 저장하는 날짜 */
export function yearFirstDay(year: number): string {
  return `${year}-01-01`
}

/** 어떤 날짜가 속한 주의 월요일 */
export function weekStartOf(dateISO: string): string {
  const date = fromISODate(dateISO)
  if (!date) return dateISO
  return toISODate(startOfWeek(date, WEEK_OPTS))
}

/** 주간 페이지의 월~일 7일 */
export function weekDays(startISO: string): string[] {
  const start = fromISODate(startISO)
  if (!start) return []
  return Array.from({ length: 7 }, (_, i) => toISODate(addDays(start, i)))
}

/**
 * 월간 달력 격자.
 * 그 달을 감싸는 월요일~일요일 구간을 통째로 만들어 7개씩 끊는다.
 * 앞뒤로 딸려오는 이웃 달 날짜도 칸을 채워야 격자가 깨지지 않는다.
 */
export function monthGrid(ym: string): string[][] {
  const first = parseYearMonth(ym)
  if (!first) return []

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(first), WEEK_OPTS),
    end: endOfWeek(endOfMonth(first), WEEK_OPTS),
  }).map(toISODate)

  const weeks: string[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return weeks
}

/** 'YYYY-MM-DD' 가 'YYYY-MM' 에 속하는가 (달력에서 이웃 달 날짜를 흐리게 그리는 데 쓴다) */
export function isInMonth(dateISO: string, ym: string): boolean {
  return dateISO.startsWith(ym)
}

/** 날짜에서 '일'만 (달력 칸에 크게 표시) */
export function dayNumber(dateISO: string): number {
  return Number(dateISO.slice(8, 10))
}

/** '2026-07' -> '7월' */
export function monthLabel(ym: string): string {
  return `${Number(ym.slice(5, 7))}월`
}

/** 주간 페이지 제목: '7월 20일 – 26일' (달이 바뀌면 양쪽 다 표시) */
export function weekRangeLabel(startISO: string): string {
  const days = weekDays(startISO)
  if (days.length !== 7) return startISO

  const start = fromISODate(days[0])
  const end = fromISODate(days[6])
  if (!start || !end) return startISO

  const sameMonth = days[0].slice(0, 7) === days[6].slice(0, 7)
  return sameMonth
    ? `${format(start, 'M월 d일')} – ${format(end, 'd일')}`
    : `${format(start, 'M월 d일')} – ${format(end, 'M월 d일')}`
}

/**
 * 이 주가 "어느 달의 주"인가.
 *
 * 월요일이 속한 달로 정하면 안 된다. 2026년 7월은 1일이 수요일이라 첫 주의
 * 월요일이 6월 29일이다. 그 규칙을 쓰면 7월 1일에 적어둔 것을 보러 갔다가
 * 6월 달력으로 돌아오게 되고, 적은 게 사라진 것처럼 보인다.
 *
 * 목요일이 속한 달로 정한다. 이레 중 나흘 이상이 그 달에 들어 있다는 뜻이라
 * 어느 쪽으로 치우쳐도 사람이 생각하는 "그 주의 달"과 어긋나지 않는다.
 */
export function weekOwnerMonth(startISO: string): string {
  const days = weekDays(startISO)
  return (days[3] ?? startISO).slice(0, 7)
}

/** 오늘이 속한 달의 'YYYY-MM' — 인덱스 탭이 어느 해를 가리킬지 정하는 데 쓴다 */
export function currentYearMonth(): string {
  return format(new Date(), 'yyyy-MM')
}
