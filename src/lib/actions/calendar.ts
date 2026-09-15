'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  applyCalendarChange, calendarChangeSchema, calendarContent, calendarDateSchema,
  calendarNoteSchema, calendarTaskSkippedDates, readCalendarNote, type CalendarChange, type CalendarNote,
} from '@/lib/calendar-reminders'
import { repeatsOn } from '@/lib/repetition'
import { sanitizeRich } from '@/lib/sanitize'
import type { FormState, ItemStyle } from '@/lib/types'

const requestSchema = z.object({
  sourceDate: calendarDateSchema,
  changes: z.array(calendarChangeSchema).min(1).max(100),
})

function sanitizeCalendarNote(note: CalendarNote): CalendarNote {
  return {
    ...note,
    title: sanitizeRich(note.title),
    titleOverrides: Object.fromEntries(
      Object.entries(note.titleOverrides ?? {}).map(([date, title]) => [date, sanitizeRich(title)]),
    ),
    tasks: note.tasks.map((task) => ({ ...task, text: sanitizeRich(task.text) })),
  }
}

/** 항목 단위 변경을 현재 DB 값에 적용한다. 다른 항목의 최신 수정을 덮어쓰지 않는다. */
export async function saveCalendarChanges(input: {
  sourceDate: string
  changes: CalendarChange[]
}): Promise<FormState> {
  const parsed = requestSchema.safeParse(input)
  if (!parsed.success) return { error: '입력한 내용과 날짜를 확인해주세요.' }
  const { sourceDate, changes } = parsed.data
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인 후 다시 저장해주세요.' }

  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: item, error: readError } = await supabase.from('items')
      .select('id, content, style').eq('user_id', user.id).eq('kind', 'event')
      .eq('date', sourceDate).maybeSingle()
    if (readError) return { error: '일정을 불러오지 못했습니다. 다시 시도해주세요.' }
    let note = readCalendarNote(item ? { ...item, date: sourceDate, style: item.style as ItemStyle } : undefined)

    for (const change of changes) {
      if ((change.type === 'repeat' || change.type === 'titleRepeat') && change.repeat !== 'none' &&
          change.endsAt && change.endsAt < `${sourceDate}T00:00`) {
        return { error: '반복 종료는 시작일 이후로 선택해주세요.' }
      }
      if (change.type === 'complete') {
        const task = note.tasks.find((task) => task.id === change.id)
        if (!task || (change.date !== sourceDate && !repeatsOn(sourceDate, change.date, task.repeat, task.endsAt))) {
          return { error: '해당 날짜의 반복 항목을 찾지 못했습니다.' }
        }
      }
      if ((change.type === 'repeat' || change.type === 'skip' || change.type === 'memo' || change.type === 'move') &&
          !note.tasks.some((task) => task.id === change.id)) {
        return { error: '반복할 항목을 찾지 못했습니다.' }
      }
      if (change.type === 'complete') {
        const task = note.tasks.find((task) => task.id === change.id)
        if (task && calendarTaskSkippedDates(task).includes(change.date)) return { error: '숨긴 반복 항목입니다.' }
      }
      note = applyCalendarChange(note, change)
    }
    note = sanitizeCalendarNote(note)
    if (!calendarNoteSchema.safeParse(note).success) return { error: '한 날짜에는 최대 200개 항목까지 적을 수 있습니다.' }
    const content = calendarContent(note, sourceDate)
    if (content.length > 5000) return { error: '한 날짜의 내용은 5,000자 이내로 적어주세요.' }
    const style = { ...(item?.style ?? {}), calendar: note, repeat: note.titleRepeat }

    if (!item) {
      const { error } = await supabase.from('items').insert({
        user_id: user.id, kind: 'event', date: sourceDate, content, style,
      })
      if (error?.code === '23505') continue
      if (error) return { error: '저장하지 못했습니다. 다시 시도해주세요.' }
    } else {
      // 읽는 동안 다른 탭이 저장했으면 최신 값을 다시 읽고 항목 변경만 재적용한다.
      let update = supabase.from('items').update({ content, style })
        .eq('id', item.id).eq('user_id', user.id).eq('content', item.content)
      update = item.style === null ? update.is('style', null) : update.eq('style', JSON.stringify(item.style))
      const { data, error } = await update.select('id')
      if (error) return { error: '저장하지 못했습니다. 다시 시도해주세요.' }
      if (!data?.length) continue
    }
    revalidatePath('/month/[ym]', 'page')
    revalidatePath('/week/[start]', 'page')
    return { error: null }
  }
  return { error: '다른 곳에서 수정 중입니다. 다시 저장해주세요.' }
}
