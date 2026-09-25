import { describe, expect, it } from 'vitest'
import { isBlank, normalizeRichHtmlEntities, toDisplayHtml, toPlainText } from '@/lib/rich-text'

describe('리치 텍스트 변환', () => {
  it('HTML 줄바꿈과 엔티티를 사람이 읽는 텍스트로 바꾼다', () => {
    expect(toPlainText('<strong>시험</strong><br>일정 &amp; 준비')).toBe(
      '시험\n일정 & 준비',
    )
  })

  it('태그와 자리표 문자만 있는 칸은 빈 칸으로 본다', () => {
    expect(isBlank('<div>​</div>')).toBe(true)
  })

  it('예전 일반 텍스트는 안전한 HTML 줄바꿈으로 표시한다', () => {
    expect(toDisplayHtml('<과제>\n완료')).toBe('&lt;과제&gt;<br>완료')
  })

  it('여러 번 이스케이프된 앰퍼샌드를 한 번에 복구한다', () => {
    expect(toPlainText('오소플 강의&amp;amp;퀴즈')).toBe('오소플 강의&퀴즈')
    expect(toDisplayHtml('오소플 강의&amp;퀴즈')).toBe('오소플 강의&amp;퀴즈')
    expect(normalizeRichHtmlEntities('<b>오소플 강의&amp;amp;퀴즈</b>')).toBe('<b>오소플 강의&amp;퀴즈</b>')
  })
})
