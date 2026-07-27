'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { ITEM_KINDS, type FormState } from '@/lib/types'

/**
 * 적은 것(items)에 대한 생성/수정/토글/삭제.
 *
 * 여기서 user_id 로 다시 걸러내지 않는 이유:
 * DB에 RLS가 걸려 있어 남의 행은 애초에 조회·수정 대상이 되지 않는다.
 * 남의 id를 넣어도 0건이 바뀔 뿐 아무 일도 일어나지 않는다.
 */

const DATE = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않습니다.')

const createSchema = z.object({
  kind: z.enum(ITEM_KINDS),
  date: DATE,
  content: z
    .string()
    .trim()
    .min(1, '내용을 입력해주세요.')
    .max(200, '200자까지 입력할 수 있습니다.'),
})

/** 화면을 새로 그릴 경로. 액션마다 어디서 불렸는지 달라서 폼에서 함께 넘긴다. */
function revalidateFrom(formData: FormData) {
  const path = formData.get('path')
  revalidatePath(typeof path === 'string' && path.startsWith('/') ? path : '/')
}

export async function createItem(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = createSchema.safeParse({
    kind: formData.get('kind'),
    date: formData.get('date'),
    content: formData.get('content'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { error } = await supabase
    .from('items')
    .insert({ ...parsed.data, user_id: user.id })

  if (error) return { error: '저장하지 못했습니다. 잠시 후 다시 시도해주세요.' }

  revalidateFrom(formData)
  return { error: null }
}

export async function toggleItem(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const isDone = formData.get('is_done') === 'true'
  if (!id) return

  const supabase = await createClient()
  await supabase.from('items').update({ is_done: !isDone }).eq('id', id)

  revalidateFrom(formData)
}

export async function updateItem(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get('id') ?? '')
  const parsed = createSchema.shape.content.safeParse(formData.get('content'))
  if (!id) return { error: '대상을 찾을 수 없습니다.' }
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase
    .from('items')
    .update({ content: parsed.data })
    .eq('id', id)

  if (error) return { error: '수정하지 못했습니다.' }

  revalidateFrom(formData)
  return { error: null }
}

/**
 * 주간 페이지에서 요일 옆에 적는 한 줄(kind='daily').
 * 하루에 하나뿐이라 "있으면 고치고 없으면 만든다".
 * 내용을 비우면 지운다 — 빈 줄을 남겨두는 게 종이 노트에 가깝다.
 */
export async function saveDaily(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get('id') ?? '')
  const date = DATE.safeParse(formData.get('date'))
  if (!date.success) return { error: date.error.issues[0].message }

  const content = String(formData.get('content') ?? '').trim()
  const supabase = await createClient()

  if (!content) {
    if (id) await supabase.from('items').delete().eq('id', id)
    revalidateFrom(formData)
    return { error: null }
  }

  if (content.length > 200) {
    return { error: '200자까지 입력할 수 있습니다.' }
  }

  if (id) {
    const { error } = await supabase
      .from('items')
      .update({ content })
      .eq('id', id)
    if (error) return { error: '저장하지 못했습니다.' }
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase
      .from('items')
      .insert({ kind: 'daily', date: date.data, content, user_id: user.id })
    if (error) return { error: '저장하지 못했습니다.' }
  }

  revalidateFrom(formData)
  return { error: null }
}

export async function deleteItem(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const supabase = await createClient()
  await supabase.from('items').delete().eq('id', id)

  revalidateFrom(formData)
}
