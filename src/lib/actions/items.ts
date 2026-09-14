'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isBlank } from '@/lib/rich-text'
import { sanitizeRich } from '@/lib/sanitize'
import { STICKERS } from '@/lib/stickers'
import { calendarNoteSchema } from '@/lib/calendar-reminders'
import {
  STICKER_SCALE,
  type FormState,
  type ItemStyle,
  type RepeatFrequency,
} from '@/lib/types'
import { isRepeatFrequency } from '@/lib/repetition'

/**
 * 노트에 적은 것.
 *
 * 한 칸(표지, 이 달 메모, 달력 한 날, 주간 한 요일…)이 통째로 한 행이다.
 * 종이 한 면을 옮겨 담은 것이라 줄 단위로 쪼개지 않는다.
 *
 * 여기서 user_id 로 다시 걸러내지 않는 이유:
 * DB에 RLS가 걸려 있어 남의 행은 애초에 조회·수정 대상이 되지 않는다.
 * 남의 id를 넣어도 0건이 바뀔 뿐 아무 일도 일어나지 않는다.
 */

const DATE = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않습니다.')

/** 펜 색. DB의 check 제약과 같은 형식이어야 한다. */
const HEX = z.string().regex(/^#[0-9A-Fa-f]{6}$/, '색 형식이 올바르지 않습니다.')

/** 한 칸에 담을 수 있는 글자 수. DB 제약과 같은 값이어야 한다. */
const MAX_LENGTH = 5000

/** 종이 한 칸으로 저장하는 종류. sticker는 여러 장을 붙일 수 있어 별도 액션만 쓴다. */
const BLOCK_KINDS = ['year', 'month', 'event', 'task', 'daily'] as const
const STICKER_KEYS = STICKERS.map((sticker) => sticker.key) as [
  (typeof STICKERS)[number]['key'],
  ...(typeof STICKERS)[number]['key'][],
]
const ID = z.uuid('항목을 찾지 못했습니다.')
const REPEAT = z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly'])

const STYLE = z.object({
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  highlight: z.boolean().optional(),
  size: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
  repeat: REPEAT.optional(),
  calendar: calendarNoteSchema.optional(),
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
  scale: z
    .number()
    .min(STICKER_SCALE.min)
    .max(STICKER_SCALE.max)
    .optional(),
})

/**
 * 꾸미기. 폼에서 JSON 문자열로 넘어온다.
 * 형식이 틀리면 꾸미기 없이 저장한다. 꾸미기 때문에 글이 날아가면 안 된다.
 */
function parseStyle(raw: FormDataEntryValue | null): ItemStyle {
  if (typeof raw !== 'string' || !raw) return {}
  try {
    const parsed = STYLE.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : {}
  } catch {
    return {}
  }
}

/**
 * DB가 돌려준 오류를 사람이 읽을 수 있는 문장으로 바꾼다.
 *
 * 42703 = 없는 컬럼, 23514 = check 제약 위반.
 * 둘 다 "코드는 새 기능인데 DB가 아직 옛날"일 때 나온다.
 */
function dbError(error: { code?: string } | null, fallback: string): string {
  if (
    error?.code === '42703' ||
    error?.code === '23514' ||
    error?.code === '42883' ||
    error?.code === 'PGRST202'
  ) {
    return 'DB가 최신이 아닙니다. supabase/latest.sql 을 Supabase SQL Editor에서 실행해주세요.'
  }
  return fallback
}

/** 화면을 새로 그릴 경로. 액션마다 어디서 불렸는지 달라서 폼에서 함께 넘긴다. */
function revalidatePathFor(path: string) {
  const allowed =
    path === '/cover' ||
    path === '/note' ||
    /^\/month\/\d{4}-(0[1-9]|1[0-2])$/.test(path) ||
    /^\/week\/\d{4}-\d{2}-\d{2}$/.test(path)

  // 폼 값은 브라우저에서 바꿀 수 있다. 이 앱이 실제로 가진 장만 다시 그린다.
  revalidatePath(allowed ? path : '/cover')
}

function revalidateFrom(formData: FormData) {
  const raw = formData.get('path')
  revalidatePathFor(typeof raw === 'string' ? raw : '')
}

/**
 * 반복은 event의 style JSON에만 보관한다. 별도 컬럼을 만들지 않아도 기존 일정과
 * DB가 그대로 호환되고, 선택한 원본 일정 하나만 바꿀 수 있다.
 */
export async function setEventRepeat(input: {
  id: string
  repeat: RepeatFrequency
  path: string
}): Promise<FormState> {
  const id = ID.safeParse(input.id)
  const repeat = REPEAT.safeParse(input.repeat)
  if (!id.success || !repeat.success || !isRepeatFrequency(input.repeat)) {
    return { error: '반복 설정을 확인하지 못했습니다.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { data: item, error: readError } = await supabase
    .from('items')
    .select('style')
    .eq('id', id.data)
    .eq('kind', 'event')
    .eq('user_id', user.id)
    .maybeSingle()
  if (readError || !item) return { error: '일정을 찾지 못했습니다.' }

  const previous =
    item.style && typeof item.style === 'object' && !Array.isArray(item.style)
      ? item.style
      : {}
  const nextStyle = { ...previous, repeat: repeat.data }
  const { error } = await supabase
    .from('items')
    .update({ style: nextStyle })
    .eq('id', id.data)
    .eq('kind', 'event')
    .eq('user_id', user.id)

  if (error) return { error: dbError(error, '반복 일정을 저장하지 못했습니다.') }
  revalidatePathFor(input.path)
  return { error: null }
}

/**
 * 한 칸을 통째로 저장한다.
 *
 * 예전에는 한 줄이 한 행이었다. 그때 적은 것들이 여러 행으로 남아 있으면
 * 첫 행에 합쳐 담고 나머지는 지운다 — 한 칸은 한 행이어야 한다.
 * 내용을 다 지우면 행도 지운다. 빈 칸을 남겨두는 게 종이에 가깝다.
 */
export async function saveBlock(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const kind = z.enum(BLOCK_KINDS).safeParse(formData.get('kind'))
  const date = DATE.safeParse(formData.get('date'))
  if (!kind.success || !date.success) {
    return { error: '저장할 자리를 찾지 못했습니다.' }
  }

  /*
   * 눈에 안 보이는 자리표 글자(U+200B)를 걷어낸다.
   * 고른 글자 없이 크기만 정할 때 그 크기를 붙들어두려고 넣어둔 것이라
   * (components/paper-block.tsx ZERO_WIDTH) 저장할 내용은 아니다.
   */
  const raw = String(formData.get('content') ?? '').replace(/​/g, '')
  if (raw.length > MAX_LENGTH) {
    return { error: `${MAX_LENGTH}자까지 적을 수 있습니다.` }
  }

  /*
   * 서식을 담으려고 HTML로 저장한다. 붙여넣기로 들어온 것이 그대로 남으면
   * 그 글을 보는 사람 화면에서 실행된다. 허용 목록에 없는 것은 여기서 버린다.
   * 화면에 그리기 직전이 아니라 저장 직전에 거른다 — 한 번만 거치면 되고,
   * 이후 어디서 읽어도 안전한 값이 나온다.
   */
  const sanitized = sanitizeRich(raw)
  // 태그만 남고 글자가 없으면 빈 칸으로 본다. 줄바꿈만 눌러도 칸이 살아나면 곤란하다.
  const content = isBlank(sanitized) ? '' : sanitized

  const color = HEX.safeParse(formData.get('color'))
  const style = parseStyle(formData.get('style'))

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  /*
   * 조회 뒤 insert하는 방식은 탭 두 개가 동시에 비어 있는 칸을 저장할 때
   * 중복 행을 만들 수 있다. DB 함수는 유니크 인덱스와 ON CONFLICT를 같은
   * 트랜잭션에서 써서 한 칸을 언제나 한 행으로 지킨다.
   */
  const { error } = await supabase.rpc('save_item_block', {
    p_kind: kind.data,
    p_date: date.data,
    p_content: content,
    p_color: color.success ? color.data : null,
    p_style: style,
  })
  if (error) return { error: dbError(error, '저장하지 못했습니다. 잠시 후 다시 시도해주세요.') }

  revalidateFrom(formData)
  return { error: null }
}

/**
 * 붙인 자리와 크기.
 * 자리는 페이지 크기 대비 %라서 창을 줄여도 제자리에 남는다.
 * 크기는 배율이다. 안 넘어오면 1 (기본 크기).
 */
const SPOT = z.object({
  x: z.coerce.number().min(0).max(100),
  y: z.coerce.number().min(0).max(100),
  scale: z.coerce
    .number()
    .min(STICKER_SCALE.min)
    .max(STICKER_SCALE.max)
    .catch(1),
})

/** 페이지 아무 데나 스티커를 붙인다. */
export async function placeSticker(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const sticker = z.enum(STICKER_KEYS).safeParse(formData.get('sticker'))
  const date = DATE.safeParse(formData.get('date'))
  const spot = SPOT.safeParse({
    x: formData.get('x'),
    y: formData.get('y'),
    scale: formData.get('scale'),
  })
  if (!sticker.success || !date.success || !spot.success) {
    return { error: '스티커 정보를 확인하지 못했습니다.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { error } = await supabase.from('items').insert({
    kind: 'sticker',
    date: date.data,
    content: sticker.data,
    user_id: user.id,
    style: spot.data,
  })
  if (error) return { error: dbError(error, '스티커를 붙이지 못했습니다. 다시 시도해주세요.') }

  revalidateFrom(formData)
  return { error: null }
}

/** 붙여둔 스티커를 끌어서 옮긴다. */
export async function moveSticker(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = ID.safeParse(formData.get('id'))
  const spot = SPOT.safeParse({
    x: formData.get('x'),
    y: formData.get('y'),
    scale: formData.get('scale'),
  })
  if (!id.success || !spot.success) {
    return { error: '스티커 정보를 확인하지 못했습니다.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { error } = await supabase
    .from('items')
    .update({ style: spot.data })
    .eq('id', id.data)
    .eq('kind', 'sticker')
  if (error) return { error: '스티커를 옮기지 못했습니다. 다시 시도해주세요.' }

  revalidateFrom(formData)
  return { error: null }
}

/** 스티커 떼기 */
export async function deleteItem(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = ID.safeParse(formData.get('id'))
  if (!id.success) return { error: '스티커 정보를 확인하지 못했습니다.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id.data)
    .eq('kind', 'sticker')
  if (error) return { error: '스티커를 떼지 못했습니다. 다시 시도해주세요.' }

  revalidateFrom(formData)
  return { error: null }
}
