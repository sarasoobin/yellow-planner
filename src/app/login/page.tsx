import { LoginForm } from './login-form'
import { DemoButton } from '@/components/demo-button'

export const metadata = {
  title: 'Sign in · 正 PLANNER',
}

const DEMO_MESSAGES: Record<string, string> = {
  off: 'The demo account is unavailable right now. Please create an account to explore.',
  failed: 'Could not open the demo account. Please try again shortly.',
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
              Explore a filled-in planner without signing up
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
