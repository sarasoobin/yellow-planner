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
    <main className="flex min-h-dvh items-center justify-center bg-desk p-6">
      {/* 노트 표지를 펼친 느낌 — 노란 프레임 안에 종이 한 장 */}
      <div className="w-full max-w-md border border-edge bg-frame p-2 shadow-notebook">
        <div className="border border-rule bg-paper px-6 py-10 md:px-9">
          <LoginForm next={next ?? '/cover'} />
        </div>
      </div>
    </main>
  )
}
