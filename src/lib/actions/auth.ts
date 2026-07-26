'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

/** 폼이 돌려받는 상태. error 가 null 이면 성공. */
export type AuthState = {
  error: string | null
  /** 회원가입 후 이메일 인증이 필요한 경우 안내 문구 */
  notice?: string | null
}

const credentials = z.object({
  email: z.string().email('이메일 형식이 올바르지 않습니다.'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다.'),
})

/** 로그인 후 돌아갈 경로. 외부 사이트로 튕기는 공격을 막기 위해 내부 경로만 허용한다. */
function safeNext(raw: FormDataEntryValue | null): string {
  const value = typeof raw === 'string' ? raw : ''
  return value.startsWith('/') && !value.startsWith('//') ? value : '/cover'
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    // 어떤 계정이 존재하는지 알려주지 않기 위해 사유를 뭉뚱그린다
    return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
  }

  revalidatePath('/', 'layout')
  redirect(safeNext(formData.get('next')))
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      data: { display_name: parsed.data.email.split('@')[0] },
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Supabase에서 이메일 인증이 켜져 있으면 세션 없이 사용자만 만들어진다.
  if (!data.session) {
    return {
      error: null,
      notice: '가입 확인 메일을 보냈습니다. 메일의 링크를 눌러 인증을 마쳐주세요.',
    }
  }

  revalidatePath('/', 'layout')
  redirect(safeNext(formData.get('next')))
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
