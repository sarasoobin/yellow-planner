import { z } from 'zod'
import { fromISODate } from '@/lib/dates'
import { toDisplayHtml, toPlainText } from '@/lib/rich-text'
import { repeatFromStyle, repeatsOn } from '@/lib/repetition'
import { REPEAT_FREQUENCIES, type Item, type ItemStyle, type RepeatFrequency } from '@/lib/types'

export const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((date) => !!fromISODate(date), '날짜를 확인해주세요.')
const idSchema = z.string().regex(/^[a-zA-Z0-9-]{1,80}$/)
const repeatSchema = z.enum(REPEAT_FREQUENCIES)
const taskKindSchema = z.enum(['event', 'todo'])
const endSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/)
  .refine((value) => !!fromISODate(value.slice(0, 10)), '종료 날짜를 확인해주세요.').nullable()

export const calendarTaskSchema = z.object({
  id: idSchema,
  kind: taskKindSchema.optional(),
  text: z.string().max(5000),
  memo: z.string().max(5000).optional(),
  repeat: repeatSchema,
  endsAt: endSchema,
  completedDates: z.array(calendarDateSchema).max(20000),
  skippedDates: z.array(calendarDateSchema).max(20000).optional(),
})
export type CalendarTask = z.infer<typeof calendarTaskSchema>

export const calendarNoteSchema = z.object({
  version: z.literal(1),
  title: z.string().max(5000),
  titleMemo: z.string().max(5000).optional(),
  titleRepeat: repeatSchema,
  titleEndsAt: endSchema,
  titleOverrides: z.record(calendarDateSchema, z.string().max(5000)).optional(),
  /** 반복 제목에서 이번 날짜만 보이지 않게 한 목록. */
  titleSkippedDates: z.array(calendarDateSchema).max(20000).optional(),
  tasks: z.array(calendarTaskSchema).max(200),
  /** 처음 목록으로 고칠 때 이전 글과 서식을 복구할 수 있도록 보관한다. */
  legacyContent: z.string().optional(),
})
export type CalendarNote = z.infer<typeof calendarNoteSchema>
export type CalendarSource = { date: string; note: CalendarNote; color: string | null }
export type CalendarOccurrence = { sourceDate: string; task: CalendarTask }

export const calendarChangeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('title'), text: z.string().max(5000) }),
  z.object({ type: z.literal('titleMemo'), memo: z.string().max(5000) }),
  z.object({ type: z.literal('titleRemove') }),
  z.object({ type: z.literal('titleOverride'), date: calendarDateSchema, text: z.string().max(5000).nullable() }),
  z.object({ type: z.literal('titleSkip'), date: calendarDateSchema, skip: z.boolean() }),
  // afterId: 없으면 맨 아래, null 이면 맨 위에 넣는다.
  z.object({ type: z.literal('text'), id: idSchema, text: z.string().max(5000), afterId: idSchema.nullish(), kind: taskKindSchema.optional() }),
  z.object({ type: z.literal('move'), id: idSchema, afterId: idSchema.nullable() }),
  z.object({ type: z.literal('kind'), id: idSchema, kind: taskKindSchema }),
  z.object({ type: z.literal('memo'), id: idSchema, memo: z.string().max(5000) }),
  z.object({ type: z.literal('remove'), id: idSchema }),
  z.object({ type: z.literal('skip'), id: idSchema, date: calendarDateSchema, skip: z.boolean() }),
  z.object({ type: z.literal('complete'), id: idSchema, date: calendarDateSchema, done: z.boolean() }),
  z.object({ type: z.literal('repeat'), id: idSchema, repeat: repeatSchema, endsAt: endSchema }),
  z.object({ type: z.literal('titleRepeat'), repeat: repeatSchema, endsAt: endSchema }),
])
export type CalendarChange = z.infer<typeof calendarChangeSchema>

export function calendarText(value: string): string {
  return toPlainText(value)
}

export function hasCalendarText(value: string): boolean {
  return calendarText(value).trim().length > 0
}

export function calendarTaskKind(task: CalendarTask): 'event' | 'todo' {
  return task.kind ?? 'todo'
}

export function calendarTaskSkippedDates(task: CalendarTask): string[] {
  return task.skippedDates ?? []
}

function isTaskSkippedOn(task: CalendarTask, date: string): boolean {
  return calendarTaskSkippedDates(task).includes(date)
}

export function calendarTitleForDate(note: CalendarNote, date: string): string {
  return note.titleOverrides?.[date] ?? note.title
}

export function calendarTitleSkippedDates(note: CalendarNote): string[] {
  return note.titleSkippedDates ?? []
}

function isCalendarTitleSkippedOn(note: CalendarNote, date: string): boolean {
  return calendarTitleSkippedDates(note).includes(date)
}

export function blankCalendarNote(): CalendarNote {
  return { version: 1, title: '', titleMemo: '', titleRepeat: 'none', titleEndsAt: null, titleSkippedDates: [], tasks: [] }
}

export function blankCalendarTask(id: string, kind: 'event' | 'todo' = 'event'): CalendarTask {
  return { id, kind, text: '', memo: '', repeat: 'none', endsAt: null, completedDates: [], skippedDates: [] }
}

/** 이전 자유 입력을 제목과 체크 항목으로 나눈다. DB는 실제로 편집할 때만 갱신한다. */
export function readCalendarNote(
  item: { content: string; style: ItemStyle | null; date: string } | undefined,
): CalendarNote {
  if (!item) return blankCalendarNote()
  const parsed = calendarNoteSchema.safeParse(item.style?.calendar)
  if (parsed.success) return parsed.data

  const lines = toPlainText(item.content).split('\n').filter((line) => line.trim())
  // 이미 체크박스로 시작하는 글은 제목으로 옮기지 않는다.
  const title = lines[0] && !/^\s*[☐☑]/.test(lines[0]) ? lines.shift()! : ''
  return {
    version: 1,
    title,
    titleRepeat: repeatFromStyle(item.style),
    titleEndsAt: null,
    legacyContent: item.content,
    tasks: lines.map((line, index) => ({
      ...blankCalendarTask(`legacy-${index}`, 'todo'),
      text: line.replace(/^\s*[☐☑]\s*/, ''),
      completedDates: /^\s*☑/.test(line) ? [item.date] : [],
    })),
  }
}

export function calendarSources(items: Item[]): CalendarSource[] {
  return items.map((item) => ({ date: item.date, note: readCalendarNote(item), color: item.color }))
}

/** 새 항목이 들어갈 자리. 맨 위(null)·맨 아래(없음)·특정 항목 바로 다음. */
function insertIndex(tasks: CalendarTask[], afterId: string | null | undefined): number {
  if (afterId === null) return 0
  if (afterId === undefined) return tasks.length
  const index = tasks.findIndex((task) => task.id === afterId)
  return index < 0 ? tasks.length : index + 1
}

/** 절대값 변경이라 통신 실패 후 다시 보내도 항목이 중복되거나 체크가 재반전되지 않는다. */
export function applyCalendarChange(note: CalendarNote, change: CalendarChange): CalendarNote {
  if (change.type === 'title') return { ...note, title: change.text }
  if (change.type === 'titleMemo') return { ...note, titleMemo: change.memo }
  if (change.type === 'titleRemove') {
    return { ...note, title: '', titleMemo: '', titleRepeat: 'none', titleEndsAt: null, titleOverrides: {}, titleSkippedDates: [] }
  }
  if (change.type === 'titleOverride') {
    const titleOverrides = { ...(note.titleOverrides ?? {}) }
    if (change.text === null || !hasCalendarText(change.text)) delete titleOverrides[change.date]
    else titleOverrides[change.date] = change.text
    return { ...note, titleOverrides }
  }
  if (change.type === 'titleSkip') {
    const dates = new Set(calendarTitleSkippedDates(note))
    if (change.skip) dates.add(change.date)
    else dates.delete(change.date)
    return { ...note, titleSkippedDates: [...dates].sort() }
  }
  if (change.type === 'titleRepeat') {
    return { ...note, titleRepeat: change.repeat, titleEndsAt: change.repeat === 'none' ? null : change.endsAt }
  }
  if (change.type === 'remove') return { ...note, tasks: note.tasks.filter((task) => task.id !== change.id) }
  if (change.type === 'move') {
    const moved = note.tasks.find((task) => task.id === change.id)
    if (!moved) return note
    const tasks = note.tasks.filter((task) => task.id !== change.id)
    tasks.splice(insertIndex(tasks, change.afterId), 0, moved)
    return { ...note, tasks }
  }
  if (change.type === 'text' && !note.tasks.some((task) => task.id === change.id)) {
    const tasks = [...note.tasks]
    tasks.splice(insertIndex(tasks, change.afterId), 0, { ...blankCalendarTask(change.id, change.kind ?? 'todo'), text: change.text })
    return { ...note, tasks }
  }
  return {
    ...note,
    tasks: note.tasks.map((task) => {
      if (task.id !== change.id) return task
      if (change.type === 'text') return { ...task, text: change.text, kind: change.kind ?? task.kind }
      if (change.type === 'kind') return { ...task, kind: change.kind }
      if (change.type === 'memo') return { ...task, memo: change.memo }
      if (change.type === 'repeat') return { ...task, repeat: change.repeat, endsAt: change.repeat === 'none' ? null : change.endsAt }
      if (change.type === 'skip') {
        const dates = new Set(calendarTaskSkippedDates(task))
        if (change.skip) dates.add(change.date)
        else dates.delete(change.date)
        return { ...task, skippedDates: [...dates].sort() }
      }
      const dates = new Set(task.completedDates)
      if (change.done) dates.add(change.date)
      else dates.delete(change.date)
      return { ...task, completedDates: [...dates].sort() }
    }),
  }
}

export function calendarOccurrences(sources: CalendarSource[], date: string): CalendarOccurrence[] {
  return sources.flatMap((source) => source.note.tasks
    .filter((task) =>
      !isTaskSkippedOn(task, date) &&
      (source.date === date || (hasCalendarText(task.text) && repeatsOn(source.date, date, task.repeat, task.endsAt))))
    .map((task) => ({ sourceDate: source.date, task })))
}

export function calendarTitles(sources: CalendarSource[], date: string): string[] {
  return sources.flatMap((source) => {
    const titles: string[] = []
    const title = calendarTitleForDate(source.note, date)
    if (!isCalendarTitleSkippedOn(source.note, date) && hasCalendarText(title) &&
      (source.date === date || repeatsOn(source.date, date, source.note.titleRepeat, source.note.titleEndsAt))) {
      titles.push(calendarText(title))
    }
    for (const task of source.note.tasks) {
      if (calendarTaskKind(task) === 'event' && hasCalendarText(task.text) &&
        !isTaskSkippedOn(task, date) &&
        (source.date === date || repeatsOn(source.date, date, task.repeat, task.endsAt))) {
        titles.push(calendarText(task.text))
      }
    }
    return titles
  })
}

/** 다른 페이지에서도 기존 content 형식으로 읽을 수 있도록 함께 저장한다. */
export function calendarContent(note: CalendarNote, date: string): string {
  const title = calendarTitleForDate(note, date)
  return [
    !isCalendarTitleSkippedOn(note, date) && hasCalendarText(title) ? `<b>${toDisplayHtml(title)}</b>` : '',
    ...note.tasks.filter((task) => hasCalendarText(task.text) && !isTaskSkippedOn(task, date)).map((task) =>
      calendarTaskKind(task) === 'event'
        ? `<b>${toDisplayHtml(task.text)}</b>`
        : `${task.completedDates.includes(date) ? '☑' : '☐'} ${toDisplayHtml(task.text)}`),
  ].filter(Boolean).join('<br>')
}

/**
 * 끌어서 옮기는 일정 한 줄.
 *
 * id 가 null 이면 그 날의 대표 일정(제목)이다. sourceDate 는 실제로 적힌 날,
 * occurrenceDate 는 지금 보이고 있는 날이다. 반복으로 비친 줄은 둘이 다르다.
 */
export type CalendarDragItem = {
  sourceDate: string
  occurrenceDate: string
  id: string | null
  kind: 'event' | 'todo'
  text: string
  memo: string
  repeat: RepeatFrequency
  endsAt: string | null
  done: boolean
}

/** 내려놓을 자리. 대표 일정 줄이거나, 어떤 항목 바로 다음(맨 위는 null)이다. */
export type CalendarDropSpot =
  | { date: string; place: 'title' }
  | { date: string; place: 'after'; afterId: string | null }

export type CalendarDatedChange = { date: string; change: CalendarChange }

/**
 * 일정 한 줄을 다른 자리로 옮기는 데 필요한 변경 목록.
 *
 * 같은 날 안에서 순서만 바꾸면 항목을 그대로 옮긴다. 날짜를 건너가면 원래 자리에서
 * 빼고 새 자리에 다시 적는다. 반복 일정은 시리즈를 지키기 위해 그 날 하나만 숨기고
 * 옮긴 날에는 한 번짜리로 남긴다 (달력 앱의 "이 일정만" 과 같다).
 */
export function calendarMoveChanges(
  sources: CalendarSource[],
  drag: CalendarDragItem,
  spot: CalendarDropSpot,
  newId: () => string,
): CalendarDatedChange[] {
  if (!hasCalendarText(drag.text)) return []
  const own = drag.sourceDate === drag.occurrenceDate
  const repeating = drag.repeat !== 'none'
  const targetNote = sources.find((source) => source.date === spot.date)?.note ?? blankCalendarNote()
  // 옮기는 줄이 바로 그 날의 대표 일정이면 제자리다.
  const isTargetTitle = drag.id === null && own && drag.sourceDate === spot.date

  if (spot.place === 'title' && isTargetTitle) return []
  if (spot.place === 'after' && own && drag.id && spot.date === drag.occurrenceDate) {
    if (spot.afterId === drag.id) return []
    return [{ date: drag.sourceDate, change: { type: 'move', id: drag.id, afterId: spot.afterId } }]
  }

  const changes: CalendarDatedChange[] = []
  if (drag.id === null) {
    changes.push({
      date: drag.sourceDate,
      change: repeating ? { type: 'titleSkip', date: drag.occurrenceDate, skip: true } : { type: 'titleRemove' },
    })
  } else {
    changes.push({
      date: drag.sourceDate,
      change: repeating || !own
        ? { type: 'skip', id: drag.id, date: drag.occurrenceDate, skip: true }
        : { type: 'remove', id: drag.id },
    })
  }

  // 체크박스는 제목 자리에 놓을 수 없고, 반복하는 제목은 아래로 밀어내면 시리즈가 깨진다.
  const titleTaken = hasCalendarText(targetNote.title)
  if (spot.place === 'title' && drag.kind === 'event' && (!titleTaken || targetNote.titleRepeat === 'none')) {
    if (titleTaken) {
      const pushed = newId()
      changes.push({ date: spot.date, change: { type: 'text', id: pushed, text: targetNote.title, kind: 'event', afterId: null } })
      if (targetNote.titleMemo) changes.push({ date: spot.date, change: { type: 'memo', id: pushed, memo: targetNote.titleMemo } })
    }
    changes.push({ date: spot.date, change: { type: 'title', text: drag.text } })
    changes.push({ date: spot.date, change: { type: 'titleMemo', memo: drag.memo } })
    return changes
  }

  const id = newId()
  changes.push({
    date: spot.date,
    change: { type: 'text', id, text: drag.text, kind: drag.kind, afterId: spot.place === 'after' ? spot.afterId : null },
  })
  if (drag.memo) changes.push({ date: spot.date, change: { type: 'memo', id, memo: drag.memo } })
  if (drag.done) changes.push({ date: spot.date, change: { type: 'complete', id, date: spot.date, done: true } })
  return changes
}
