import { describe, expect, it } from 'vitest'
import { monthGrid, parseYearMonth, shiftYearMonth, weekOwnerMonth, weekStartOf } from '@/lib/dates'

describe('날짜 규칙', () => {
  it('주는 월요일에 시작한다', () => {
    expect(weekStartOf('2026-01-01')).toBe('2025-12-29')
  })

  it('월 경계 주는 목요일이 속한 달의 주로 본다', () => {
    expect(weekOwnerMonth('2025-12-29')).toBe('2026-01')
  })

  it('달력은 앞뒤 달 날짜까지 월요일~일요일 단위로 채운다', () => {
    const grid = monthGrid('2026-02')
    expect(grid[0][0]).toBe('2026-01-26')
    expect(grid.at(-1)?.at(-1)).toBe('2026-03-01')
  })

  it('존재하지 않는 달은 거절한다', () => {
    expect(parseYearMonth('2026-13')).toBeNull()
  })

  it('12월 다음 달은 다음 해 1월으로 잇는다', () => {
    expect(shiftYearMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftYearMonth('2027-01', -1)).toBe('2026-12')
  })
})
