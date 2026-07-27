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
  size: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
  sticker: z.string().max(32).nullable().optional(),
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
})

/**
 * DB가 돌려준 오류를 사람이 읽을 수 있는 문장으로 바꾼다.
 *
 * 42703 = 없는 컬럼, 23514 = check 제약 위반.
 * 둘 다 "코드는 새 기능인데 DB가 아직 옛날"일 때 나온다.
 * 이 경우엔 무엇을 해야 하는지 딱 집어줘야 한다.
 */
function dbError(error: { code?: string } | null, fallback: string): string {
  if (error?.code === '42703' || error?.code === '23514') {
    return 'DB가 최신이 아닙니다. supabase/latest.sql 을 Supabase SQL Editor에서 실행해주세요.'
  }
  return fallback
}

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

  /**
   * sort_order 는 "공책의 몇째 줄"이다.
   * 누른 줄 번호가 함께 오면 그 자리에 그대로 남기고,
   * 없으면(달력 칸처럼 줄 개념이 없는 곳) 맨 아래에 붙인다.
   */
  const line = Number(formData.get('line'))
  let sortOrder = Number.isInteger(line) && line >= 0 ? line : null

  if (sortOrder === null) {
    const { data: last } = await supabase
      .from('items')
      .select('sort_order')
      .eq('kind', parsed.data.kind)
      .eq('date', parsed.data.date)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    sortOrder = (last?.sort_order ?? -1) + 1
  }

  const { error } = await supabase.from('items').insert({
    ...parsed.data,
    user_id: user.id,
    sort_order: sortOrder,
    style: parseStyle(formData.get('style')),
  })

  if (error) {
    return {
      error: dbError(error, '저장하지 못했습니다. 잠시 후 다시 시도해주세요.'),
    }
  }

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

  if (error) return { error: dbError(error, '수정하지 못했습니다.') }

  revalidateFrom(formData)
  return { error: null }
}

/** 붙인 자리. 페이지 크기 대비 %라서 창을 줄여도 제자리에 남는다. */
const SPOT = z.object({
  x: z.coerce.number().min(0).max(100),
  y: z.coerce.number().min(0).max(100),
})

/** 페이지 아무 데나 스티커를 붙인다. */
export async function placeSticker(formData: FormData) {
  const sticker = String(formData.get('sticker') ?? '')
  const date = DATE.safeParse(formData.get('date'))
  const spot = SPOT.safeParse({
    x: formData.get('x'),
    y: formData.get('y'),
  })
  if (!sticker || !date.success || !spot.success) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('items').insert({
    kind: 'sticker',
    date: date.data,
    content: sticker,
    user_id: user.id,
    style: spot.data,
  })

  revalidateFrom(formData)
}

/** 붙여둔 스티커를 끌어서 옮긴다. */
export async function moveSticker(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const spot = SPOT.safeParse({
    x: formData.get('x'),
    y: formData.get('y'),
  })
  if (!id || !spot.success) return

  const supabase = await createClient()
  await supabase.from('items').update({ style: spot.data }).eq('id', id)

  revalidateFrom(formData)
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
  const raw = formData.get('lines')
  if (typeof raw !== 'string') return

  // "줄번호:id" 짝으로 온다. 어느 줄이 채워져 있었는지는 그대로 두고 내용만 옮긴다.
  const pairs = raw
    .split(',')
    .map((pair) => pair.split(':'))
    .filter(([line, id]) => id && Number.isInteger(Number(line)))
    .map(([line, id]) => ({ line: Number(line), id }))

  if (pairs.length === 0 || pairs.length > 200) return

  const supabase = await createClient()
  await Promise.all(
    pairs.map(({ line, id }) =>
      supabase.from('items').update({ sort_order: line }).eq('id', id),
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
    if (error) return { error: dbError(error, '저장하지 못했습니다.') }
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
    if (error) return { error: dbError(error, '저장하지 못했습니다.') }
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
