import { describe, expect, it } from 'vitest'
import { countBoxes, countChecked, countLines, firstLine } from '@/lib/blocks'

describe('플래너 집계', () => {
  const content = '<div>☐ 발표 준비</div><div>☑ 자료 제출</div><div>일정 확인</div>'

  it('체크박스 완료와 전체 수를 정확히 센다', () => {
    expect(countBoxes(content)).toEqual({ done: 1, total: 2 })
    expect(countChecked(content)).toBe(1)
  })

  it('빈 줄을 제외하고 줄 수와 첫 줄을 찾는다', () => {
    expect(countLines(content)).toBe(3)
    expect(firstLine(content)).toBe('☐ 발표 준비')
  })
})
