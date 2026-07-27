'use client'

import { useFormStatus } from 'react-dom'
import { signInDemo } from '@/lib/actions/auth'

function Button({ variant }: { variant: 'solid' | 'quiet' }) {
  // 로그인에 몇 백 밀리초가 걸린다. 누르고 아무 반응이 없으면 또 누르게 된다.
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        variant === 'solid'
          ? 'cursor-pointer border border-accent px-6 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-paper disabled:opacity-60'
          : 'cursor-pointer text-sm text-ink-faint underline underline-offset-4 transition-colors hover:text-accent disabled:opacity-60'
      }
    >
      {pending ? '노트 펼치는 중…' : '데모 계정으로 둘러보기'}
    </button>
  )
}

/** 가입 없이 채워진 노트를 바로 보여주는 버튼 */
export function DemoButton({
  variant = 'solid',
}: {
  variant?: 'solid' | 'quiet'
}) {
  return (
    <form action={signInDemo}>
      <Button variant={variant} />
    </form>
  )
}
