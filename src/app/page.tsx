import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-desk p-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="flex items-baseline gap-2 text-accent">
          <span className="text-4xl leading-none font-bold">正</span>
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

      <Link
        href="/login"
        className="bg-accent px-6 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
      >
        시작하기
      </Link>
    </main>
  )
}
