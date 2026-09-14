import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyCalendarChange, blankCalendarNote, calendarContent } from '@/lib/calendar-reminders'

const mocked = vi.hoisted(() => ({ createClient: vi.fn(), revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocked.createClient }))
vi.mock('next/cache', () => ({ revalidatePath: mocked.revalidatePath }))
import { saveCalendarChanges } from '@/lib/actions/calendar'

type Row = { id: string; content: string; style: Record<string, unknown> }

function database({ user = true, initial = null, conflict = false }: { user?: boolean; initial?: Row | null; conflict?: boolean } = {}) {
  let row = initial
  let reads = 0
  let writes = 0
  const filters: Array<[string, unknown]> = []
  mocked.createClient.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: user ? { id: 'owner' } : null } }) },
    from: () => {
      let update: Partial<Row> | null = null
      const query = {
        eq: (key: string, value: unknown) => { filters.push([key, value]); return query },
        is: () => query,
        maybeSingle: async () => { reads++; return { data: structuredClone(row), error: null } },
        update: (value: Partial<Row>) => { update = value; return query },
        insert: async (value: Row) => { writes++; row = { ...value, id: 'new' }; return { error: null } },
        select: () => {
          if (!update) return query
          writes++
          if (conflict && writes === 1) {
            const note = applyCalendarChange(blankCalendarNote(), { type: 'text', id: 'other-tab', text: '다른 탭의 새 항목' })
            row = { id: 'existing', content: calendarContent(note, '2026-09-09'), style: { calendar: note } }
            return Promise.resolve({ data: [], error: null })
          }
          row = { ...row!, ...update }
          return Promise.resolve({ data: [{ id: row.id }], error: null })
        },
      }
      return query
    },
  })
  return { current: () => row, counts: () => ({ reads, writes }), filters }
}

beforeEach(() => vi.clearAllMocks())

describe('달력 저장 서버 액션', () => {
  it('로그인하지 않은 요청은 DB를 읽거나 수정하지 않는다', async () => {
    const db = database({ user: false })
    const result = await saveCalendarChanges({ sourceDate: '2026-09-09', changes: [{ type: 'title', text: '회의' }] })
    expect(result.error).toContain('로그인')
    expect(db.counts()).toEqual({ reads: 0, writes: 0 })
  })

  it('잘못된 날짜와 시작일 이전의 종료 시각은 저장하지 않는다', async () => {
    const db = database()
    expect((await saveCalendarChanges({ sourceDate: '2026-02-30', changes: [{ type: 'title', text: '회의' }] })).error).not.toBeNull()
    expect((await saveCalendarChanges({ sourceDate: '2026-09-09', changes: [{ type: 'titleRepeat', repeat: 'daily', endsAt: '2026-09-08T23:59' }] })).error).toContain('시작일')
    expect(db.counts().writes).toBe(0)
  })

  it('항목 작성과 반복을 한 번에 저장하고 허용된 서식만 보관한다', async () => {
    const db = database()
    const result = await saveCalendarChanges({ sourceDate: '2026-09-09', changes: [
      { type: 'title', text: '회의 <script>' },
      { type: 'text', id: 'task-one', text: '<span style="background-color:#F7B8CE">회의록</span><script>alert(1)</script>' },
      { type: 'repeat', id: 'task-one', repeat: 'weekly', endsAt: '2026-10-09T18:00' },
    ] })
    expect(result.error).toBeNull()
    expect(db.current()?.content).toBe('<b>회의 </b><br>☐ <span style="background-color:#F7B8CE">회의록</span>')
    expect(db.current()?.style.calendar).toMatchObject({ tasks: [{ repeat: 'weekly', endsAt: '2026-10-09T18:00' }] })
    expect(db.filters).toContainEqual(['user_id', 'owner'])
    expect(db.filters).toContainEqual(['date', '2026-09-09'])
  })

  it('동시 저장 충돌 후 다시 읽어서 다른 항목을 보존한다', async () => {
    const db = database({ initial: { id: 'existing', content: '', style: {} }, conflict: true })
    const result = await saveCalendarChanges({ sourceDate: '2026-09-09', changes: [{ type: 'title', text: '오늘 회의' }] })
    expect(result.error).toBeNull()
    expect(db.counts()).toEqual({ reads: 2, writes: 2 })
    expect(db.current()?.content).toBe('<b>오늘 회의</b><br>☐ 다른 탭의 새 항목')
  })
})
