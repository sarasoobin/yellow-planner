import { LoginForm } from './login-form'

export const metadata = {
  title: '로그인 · 正 PLANNER',
}

export default async function LoginPage({
  searchParams,
}: {
  // Next.js 16에서 searchParams는 Promise다. 반드시 await 해야 한다.
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <LoginForm next={next ?? '/cover'} />
    </main>
  )
}
