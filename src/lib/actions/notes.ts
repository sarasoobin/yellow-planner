'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { FormState } from '@/lib/types'

/**
 * 메모(notes) 저장.
 *
 * 주간 메모는 한 사람이 한 주에 하나, Free Note는 한 사람당 하나다.
 * 부분 유니크 인덱스를 쓰므로 ON CONFLICT 처리는 DB 함수가 맡는다.
 */

const schema = z.object({
  content: z.string().max(5000, '5000자까지 입력할 수 있습니다.'),
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
})

function dbError(error: { code?: string } | null): string {
  if (error?.code === '42883' || error?.code === 'PGRST202') {
    return 'DB가 최신이 아닙니다. supabase/latest.sql 을 Supabase SQL Editor에서 실행해주세요.'
  }
  return '저장하지 못했습니다. 잠시 후 다시 시도해주세요.'
}

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

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  // 부분 유니크 인덱스와 ON CONFLICT를 DB 함수에서 함께 써 동시 저장도 한 행으로 처리한다.
  const { error } = await supabase.rpc('save_note', {
    p_week_start: weekStart,
    p_content: content,
  })

  if (error) return { error: dbError(error) }

  const rawPath = formData.get('path')
  const path = typeof rawPath === 'string' ? rawPath : ''
  const allowed =
    path === '/note' || /^\/week\/\d{4}-\d{2}-\d{2}$/.test(path)
  revalidatePath(allowed ? path : '/note')
  return { error: null }
}
