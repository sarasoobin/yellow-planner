'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { ITEM_KINDS, type FormState, type ItemStyle } from '@/lib/types'

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

/** 펜 색. DB의 check 제약과 같은 형식이어야 한다. */
const HEX = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, '색 형식이 올바르지 않습니다.')

const createSchema = z.object({
  kind: z.enum(ITEM_KINDS),
  date: DATE,
  content: z
    .string()
    .trim()
    .min(1, '내용을 입력해주세요.')
    .max(200, '200자까지 입력할 수 있습니다.'),
  color: HEX.nullable(),
})

/**
 * 꾸미기. 폼에서 JSON 문자열로 넘어온다.
 * 모르는 키는 버리고, 형식이 틀리면 꾸미기 없이 저장한다.
 * 꾸미기 때문에 글 자체가 저장 안 되는 일은 없어야 한다.
 */
const STYLE = z.object({
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  highlight: z.boolean().optional(),
  check: z.boolean().optional(),
  sticker: z.string().max(32).nullable().optional(),
})

function parseStyle(raw: FormDataEntryValue | null): ItemStyle {
  if (typeof raw !== 'string' || !raw) return {}
  try {
    const parsed = STYLE.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : {}
  } catch {
    return {}
  }
}

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
    // 펜을 고르지 않았으면 색 없이 저장하고 기본 글자색으로 보인다
    color: formData.get('color') || null,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  // 새 항목은 늘 맨 아래에 붙는다.
  // 기본값 0으로 두면 순서를 바꾼 뒤 추가한 것이 중간에 끼어든다.
  const { data: last } = await supabase
    .from('items')
    .select('sort_order')
    .eq('kind', parsed.data.kind)
    .eq('date', parsed.data.date)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from('items').insert({
    ...parsed.data,
    user_id: user.id,
    sort_order: (last?.sort_order ?? -1) + 1,
    style: parseStyle(formData.get('style')),
  })

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

  // `/` 메뉴로 꾸미기만 바꾸는 경우도 있어 색·꾸미기도 같이 저장한다
  const patch: Record<string, unknown> = { content: parsed.data }
  const color = HEX.safeParse(formData.get('color'))
  if (color.success) patch.color = color.data
  if (typeof formData.get('style') === 'string') {
    patch.style = parseStyle(formData.get('style'))
  }

  const supabase = await createClient()
  const { error } = await supabase.from('items').update(patch).eq('id', id)

  if (error) return { error: '수정하지 못했습니다.' }

  revalidateFrom(formData)
  return { error: null }
}

/**
 * 한 줄에 체크박스를 붙이거나 뗀다.
 *
 * 달력이나 이 달 메모처럼 그냥 적는 곳에서도 가끔은 체크할 게 생긴다.
 * 목록 전체가 아니라 줄 하나만 바꾼다.
 */
export async function setItemCheck(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const next = formData.get('check') === 'true'

  const supabase = await createClient()

  // style 을 통째로 덮어쓰면 굵게·스티커까지 날아간다. 기존 값에 얹는다.
  const { data } = await supabase
    .from('items')
    .select('style')
    .eq('id', id)
    .maybeSingle()

  const merged = { ...((data?.style as ItemStyle) ?? {}), check: next }
  await supabase.from('items').update({ style: merged }).eq('id', id)

  revalidateFrom(formData)
}

/**
 * 드래그로 바뀐 순서를 저장한다.
 * 화면에 보이는 순서대로 id를 받아 sort_order를 0,1,2… 로 다시 매긴다.
 *
 * 남의 id가 섞여 들어와도 RLS가 막아 그 행만 0건 수정되고 끝난다.
 */
export async function reorderItems(formData: FormData) {
  const raw = formData.get('ids')
  if (typeof raw !== 'string') return

  const ids = raw.split(',').filter(Boolean)
  if (ids.length === 0 || ids.length > 200) return

  const supabase = await createClient()
  await Promise.all(
    ids.map((id, index) =>
      supabase.from('items').update({ sort_order: index }).eq('id', id),
    ),
  )

  revalidateFrom(formData)
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

  const parsedColor = HEX.safeParse(formData.get('color'))
  const color = parsedColor.success ? parsedColor.data : null

  const style = parseStyle(formData.get('style'))

  if (id) {
    const { error } = await supabase
      .from('items')
      .update({ content, color, style })
      .eq('id', id)
    if (error) return { error: '저장하지 못했습니다.' }
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase.from('items').insert({
      kind: 'daily',
      date: date.data,
      content,
      color,
      style,
      user_id: user.id,
    })
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
