import { describe, expect, it } from 'vitest'
import { repeatsOn } from '@/lib/repetition'

describe('반복 일정', () => {
  it('시작일에는 원본 일정만 보여 주고 그 다음 날짜부터 매일 반복한다', () => {
    expect(repeatsOn('2026-09-09', '2026-09-09', 'daily')).toBe(false)
    expect(repeatsOn('2026-09-09', '2026-09-10', 'daily')).toBe(true)
  })

  it('매주와 매월은 시작일의 요일·일자를 기준으로 반복한다', () => {
    expect(repeatsOn('2026-09-09', '2026-09-16', 'weekly')).toBe(true)
    expect(repeatsOn('2026-09-09', '2026-09-15', 'weekly')).toBe(false)
    expect(repeatsOn('2026-09-09', '2026-10-09', 'monthly')).toBe(true)
    expect(repeatsOn('2026-09-09', '2026-10-10', 'monthly')).toBe(false)
  })

  it('종료 날짜는 포함하고 그 다음 날부터 반복하지 않는다', () => {
    expect(repeatsOn('2026-09-09', '2026-09-11', 'daily', '2026-09-11T18:00')).toBe(true)
    expect(repeatsOn('2026-09-09', '2026-09-12', 'daily', '2026-09-11T18:00')).toBe(false)
    expect(repeatsOn('2026-09-09', '2026-09-16', 'weekly', '2026-09-15T23:59')).toBe(false)
  })

  it('월말과 윤년은 해당 달의 마지막 날짜로 맞춘다', () => {
    expect(repeatsOn('2026-01-31', '2026-02-28', 'monthly')).toBe(true)
    expect(repeatsOn('2026-01-31', '2026-03-31', 'monthly')).toBe(true)
    expect(repeatsOn('2024-02-29', '2025-02-28', 'yearly')).toBe(true)
    expect(repeatsOn('2024-02-29', '2028-02-29', 'yearly')).toBe(true)
    expect(repeatsOn('2024-02-29', '2028-02-28', 'yearly')).toBe(false)
  })
})
