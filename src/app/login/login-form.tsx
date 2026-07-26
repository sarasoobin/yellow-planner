'use client'

import { useActionState, useState } from 'react'
import { signIn, signUp, type AuthState } from '@/lib/actions/auth'

const EMPTY: AuthState = { error: null, notice: null }

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [state, formAction, pending] = useActionState(
    mode === 'signin' ? signIn : signUp,
    EMPTY,
  )

  const isSignIn = mode === 'signin'

  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-1 text-2xl font-bold">正 PLANNER</h1>
      <p className="mb-8 text-sm text-neutral-500">
        {isSignIn ? '다시 오셨네요.' : '공책 한 권을 새로 펼칩니다.'}
      </p>

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-600">이메일</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-600">비밀번호</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={isSignIn ? 'current-password' : 'new-password'}
            className="rounded border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
          />
        </label>

        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}
        {state.notice && (
          <p role="status" className="text-sm text-green-700">
            {state.notice}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-50"
        >
          {pending ? '처리 중…' : isSignIn ? '로그인' : '가입하기'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(isSignIn ? 'signup' : 'signin')}
        className="mt-4 text-sm text-neutral-500 underline underline-offset-4"
      >
        {isSignIn ? '계정이 없으신가요? 가입하기' : '이미 계정이 있으신가요? 로그인'}
      </button>
    </div>
  )
}
