import type { createClient } from '@/lib/supabase/server'
import { calendarSources } from '@/lib/calendar-reminders'
import type { Item } from '@/lib/types'

/** 오래전에 시작된 반복도 읽는다. Supabase 응답 개수 제한에서 잘리지 않도록 나눈다. */
export async function loadCalendarSources(supabase: Awaited<ReturnType<typeof createClient>>, rangeEnd: string) {
  const items: Item[] = []
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from('items').select('*')
      .eq('kind', 'event').lte('date', rangeEnd)
      .order('date').order('id').range(offset, offset + pageSize - 1)
    if (error) throw new Error('달력 내용을 불러오지 못했습니다. 다시 시도해주세요.')
    items.push(...(data as Item[]))
    if (data.length < pageSize) return calendarSources(items)
  }
}
