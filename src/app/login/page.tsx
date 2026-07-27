import { LoginForm } from './login-form'
import { DemoButton } from '@/components/demo-button'

export const metadata = {
  title: '로그인 · 正 PLANNER',
}

const DEMO_MESSAGES: Record<string, string> = {
  off: '지금은 데모 계정을 쓸 수 없습니다. 직접 가입해서 둘러봐주세요.',
  failed: '데모 계정에 들어가지 못했습니다. 잠시 후 다시 시도해주세요.',
}

export default async function LoginPage({
  searchParams,
}: {
  // Next.js 16에서 searchParams는 Promise다. 반드시 await 해야 한다.
  searchParams: Promise<{ next?: string; demo?: string }>
}) {
  const { next, demo } = await searchParams
  const demoMessage = demo ? DEMO_MESSAGES[demo] : undefined

  return (
    <main className="flex min-h-dvh items-center justify-center bg-desk p-6">
      {/* 노트 표지를 펼친 느낌 — 노란 프레임 안에 종이 한 장 */}
      <div className="w-full max-w-md border border-edge bg-frame p-2 shadow-notebook">
        <div className="border border-rule bg-paper px-6 py-10 md:px-9">
          {demoMessage && (
            <p
              role="alert"
              className="mb-6 border-l-2 border-danger pl-3 text-sm text-danger"
            >
              {demoMessage}
            </p>
          )}

          <LoginForm next={next ?? '/cover'} />

          <div className="mt-8 border-t border-rule pt-5 text-center">
            <DemoButton variant="quiet" />
            <p className="mt-1.5 text-xs text-ink-faint">
              가입 없이 채워진 노트를 볼 수 있습니다
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
