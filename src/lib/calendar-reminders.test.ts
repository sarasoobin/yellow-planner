import { describe, expect, it } from 'vitest'
import {
  applyCalendarChange, blankCalendarNote, calendarContent, calendarOccurrences,
  calendarTitles, readCalendarNote,
} from '@/lib/calendar-reminders'

describe('달력 제목과 개별 할 일', () => {
  it('기존 중요 일정, 체크 여부와 원본 서식을 보존한다', () => {
    const content = '<b>동동 정기회의</b><br>☐ 회의록 준비<br>☑ 자료 제출'
    const note = readCalendarNote({ date: '2026-09-09', content, style: { repeat: 'weekly' } })
    expect(note.title).toBe('동동 정기회의')
    expect(note.titleRepeat).toBe('weekly')
    expect(note.tasks.map((task) => task.text)).toEqual(['회의록 준비', '자료 제출'])
    expect(note.tasks[1].completedDates).toEqual(['2026-09-09'])
    expect(note.legacyContent).toBe(content)
  })

  it('제목 없는 체크 목록을 중요 일정으로 잘못 옮기지 않는다', () => {
    const note = readCalendarNote({ date: '2026-09-09', content: '☐ 책 읽기\n☑ 운동', style: null })
    expect(note.title).toBe('')
    expect(note.tasks).toHaveLength(2)
    expect(calendarTitles([{ date: '2026-09-09', note, color: null }], '2026-09-09')).toEqual([])
  })

  it('항목별로 반복하고, 한 날짜를 완료해도 다른 날짜와 다른 항목은 바뀌지 않는다', () => {
    let note = applyCalendarChange(blankCalendarNote(), { type: 'text', id: 'one', text: '책 읽기' })
    note = applyCalendarChange(note, { type: 'text', id: 'two', text: '자료 제출' })
    note = applyCalendarChange(note, { type: 'repeat', id: 'one', repeat: 'daily', endsAt: '2026-09-11T23:59' })
    note = applyCalendarChange(note, { type: 'complete', id: 'one', date: '2026-09-10', done: true })
    const sources = [{ date: '2026-09-09', note, color: null }]
    expect(calendarOccurrences(sources, '2026-09-09')).toHaveLength(2)
    expect(calendarOccurrences(sources, '2026-09-10')).toHaveLength(1)
    expect(calendarOccurrences(sources, '2026-09-11')[0].task.completedDates).not.toContain('2026-09-11')
    expect(calendarOccurrences(sources, '2026-09-12')).toEqual([])
    expect(note.tasks[1].completedDates).toEqual([])
    expect(calendarContent(note, '2026-09-09')).toBe('☐ 책 읽기<br>☐ 자료 제출')
  })

  it('저장 재시도는 중복 항목을 만들지 않고 다른 항목의 반복 설정을 보존한다', () => {
    const add = { type: 'text', id: 'one', text: '운동' } as const
    let note = applyCalendarChange(blankCalendarNote(), add)
    note = applyCalendarChange(note, { type: 'repeat', id: 'one', repeat: 'weekly', endsAt: null })
    note = applyCalendarChange(note, add)
    note = applyCalendarChange(note, { type: 'title', text: '일정 <확인>' })
    expect(note.tasks).toHaveLength(1)
    expect(note.tasks[0].repeat).toBe('weekly')
    expect(calendarContent(note, '2026-09-09')).toContain('&lt;확인&gt;')
  })

  it('중간 항목 다음에서 Enter로 추가한 순서를 보존한다', () => {
    let note = blankCalendarNote()
    for (const id of ['a', 'c']) note = applyCalendarChange(note, { type: 'text', id, text: id })
    note = applyCalendarChange(note, { type: 'text', id: 'b', text: 'b', afterId: 'a' })
    expect(note.tasks.map((task) => task.id)).toEqual(['a', 'b', 'c'])
  })

  it('반복 제목은 특정 날짜 이름만 따로 바꿀 수 있고 일정 줄은 체크박스로 바꿀 수 있다', () => {
    let note = applyCalendarChange(blankCalendarNote(), { type: 'title', text: '전체회의' })
    note = applyCalendarChange(note, { type: 'titleRepeat', repeat: 'weekly', endsAt: null })
    note = applyCalendarChange(note, { type: 'titleOverride', date: '2026-09-16', text: 'FE회의' })
    note = applyCalendarChange(note, { type: 'text', id: 'event-one', text: '면담', kind: 'event' })
    note = applyCalendarChange(note, { type: 'kind', id: 'event-one', kind: 'todo' })

    const sources = [{ date: '2026-09-09', note, color: null }]
    expect(calendarTitles(sources, '2026-09-16')).toEqual(['FE회의'])
    expect(calendarContent(note, '2026-09-16')).toBe('<b>FE회의</b><br>☐ 면담')
  })

  it('반복 항목은 특정 날짜만 숨길 수 있고 다음 반복은 유지된다', () => {
    let note = applyCalendarChange(blankCalendarNote(), { type: 'text', id: 'meeting', text: '정기회의', kind: 'event' })
    note = applyCalendarChange(note, { type: 'repeat', id: 'meeting', repeat: 'weekly', endsAt: null })
    note = applyCalendarChange(note, { type: 'skip', id: 'meeting', date: '2026-09-16', skip: true })

    const sources = [{ date: '2026-09-09', note, color: null }]
    expect(calendarOccurrences(sources, '2026-09-16')).toEqual([])
    expect(calendarTitles(sources, '2026-09-16')).toEqual([])
    expect(calendarOccurrences(sources, '2026-09-23')).toHaveLength(1)
    expect(calendarTitles(sources, '2026-09-23')).toEqual(['정기회의'])
  })

  it('반복 제목은 특정 날짜만 삭제해도 다음 반복을 유지한다', () => {
    let note = applyCalendarChange(blankCalendarNote(), { type: 'title', text: '정기회의' })
    note = applyCalendarChange(note, { type: 'titleRepeat', repeat: 'weekly', endsAt: null })
    note = applyCalendarChange(note, { type: 'titleSkip', date: '2026-09-16', skip: true })

    const sources = [{ date: '2026-09-09', note, color: null }]
    expect(calendarTitles(sources, '2026-09-16')).toEqual([])
    expect(calendarContent(note, '2026-09-16')).toBe('')
    expect(calendarTitles(sources, '2026-09-23')).toEqual(['정기회의'])
  })

  it('반복 제목 전체 삭제는 이름 변경 예외와 반복 설정까지 지운다', () => {
    let note = applyCalendarChange(blankCalendarNote(), { type: 'title', text: '정기회의' })
    note = applyCalendarChange(note, { type: 'titleRepeat', repeat: 'weekly', endsAt: null })
    note = applyCalendarChange(note, { type: 'titleOverride', date: '2026-09-16', text: '팀 회의' })
    note = applyCalendarChange(note, { type: 'titleRemove' })

    const sources = [{ date: '2026-09-09', note, color: null }]
    expect(calendarTitles(sources, '2026-09-16')).toEqual([])
    expect(note.titleRepeat).toBe('none')
  })

  it('제목과 개별 일정에 메모를 저장한다', () => {
    let note = applyCalendarChange(blankCalendarNote(), { type: 'titleMemo', memo: '회의실 301호' })
    note = applyCalendarChange(note, { type: 'text', id: 'meeting', text: '프로젝트 회의', kind: 'event' })
    note = applyCalendarChange(note, { type: 'memo', id: 'meeting', memo: '자료를 미리 공유하기' })

    expect(note.titleMemo).toBe('회의실 301호')
    expect(note.tasks[0].memo).toBe('자료를 미리 공유하기')
  })
})
