'use client'

import { useActionState, useState } from 'react'
import { signIn, signUp, type AuthState } from '@/lib/actions/auth'

const EMPTY: AuthState = { error: null, notice: null }

const FIELD =
  'border border-rule bg-paper px-3 py-2 text-ink outline-none transition-colors focus:border-accent'

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [state, formAction, pending] = useActionState(
    mode === 'signin' ? signIn : signUp,
    EMPTY,
  )

  const isSignIn = mode === 'signin'

  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-1 flex items-baseline gap-1.5 text-accent">
        <span className="font-hand text-3xl leading-none">正</span>
        <span className="text-base font-semibold tracking-[0.14em]">
          PLANNER
        </span>
      </h1>
      <p className="mb-8 text-sm text-ink-faint">
        {isSignIn ? '다시 오셨네요.' : '공책 한 권을 새로 펼칩니다.'}
      </p>

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-soft">이메일</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={FIELD}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-soft">비밀번호</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={isSignIn ? 'current-password' : 'new-password'}
            className={FIELD}
          />
        </label>

        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        {state.notice && (
          <p role="status" className="text-sm text-done">
            {state.notice}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 cursor-pointer bg-accent px-3 py-2 font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? '처리 중…' : isSignIn ? '로그인' : '가입하기'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(isSignIn ? 'signup' : 'signin')}
        className="mt-4 cursor-pointer text-sm text-ink-faint underline underline-offset-4 hover:text-accent"
      >
        {isSignIn
          ? '계정이 없으신가요? 가입하기'
          : '이미 계정이 있으신가요? 로그인'}
      </button>
    </div>
  )
}
