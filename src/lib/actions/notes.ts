'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { FormState } from '@/lib/types'

/**
 * 메모(notes) 저장.
 *
 * 주간 메모는 한 사람이 한 주에 하나, Free Note는 한 사람당 하나다.
 * DB에 부분 유니크 인덱스로 걸려 있지만(schema.sql), upsert의 onConflict는
 * 부분 인덱스를 대상으로 지정하기 번거로워 "있으면 update, 없으면 insert"로 처리한다.
 */

const schema = z.object({
  content: z.string().max(5000, '5000자까지 입력할 수 있습니다.'),
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
})

export async function saveNote(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const rawWeek = formData.get('week_start')
  const parsed = schema.safeParse({
    content: formData.get('content') ?? '',
    weekStart: typeof rawWeek === 'string' && rawWeek ? rawWeek : null,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { content, weekStart } = parsed.data
  const kind = weekStart ? 'week' : 'free'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  // RLS가 남의 행을 막아주므로 이 조회는 항상 내 메모만 찾는다
  let query = supabase.from('notes').select('id').eq('kind', kind).limit(1)
  query = weekStart
    ? query.eq('week_start', weekStart)
    : query.is('week_start', null)

  const { data: existing } = await query.maybeSingle()

  const { error } = existing
    ? await supabase
        .from('notes')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    : await supabase.from('notes').insert({
        user_id: user.id,
        kind,
        week_start: weekStart,
        content,
      })

  if (error) return { error: '저장하지 못했습니다. 잠시 후 다시 시도해주세요.' }

  const path = formData.get('path')
  revalidatePath(typeof path === 'string' && path.startsWith('/') ? path : '/')
  return { error: null }
}
