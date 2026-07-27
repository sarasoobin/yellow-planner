import Link from 'next/link'
import { DemoButton } from '@/components/demo-button'

export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-desk p-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="flex items-baseline gap-2 text-accent">
          <span className="font-hand text-5xl leading-none">正</span>
          <span className="text-xl font-semibold tracking-[0.16em]">
            PLANNER
          </span>
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-ink-soft">
          중요한 일정과 자잘한 할 일을 서로 다른 페이지에 적는 웹 다이어리.
          <br />
          노란 공책 한 권을 1년 내내 쓰는 느낌으로.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        {/* 가입 전에 먼저 보여준다. 빈 화면보다 채워진 노트가 설명을 대신한다 */}
        <DemoButton />
        <Link
          href="/login"
          className="text-sm text-ink-faint underline underline-offset-4 transition-colors hover:text-accent"
        >
          내 노트 만들기
        </Link>
      </div>
    </main>
  )
}
