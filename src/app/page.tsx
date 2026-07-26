import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <div>
        <h1 className="text-3xl font-bold">正 PLANNER</h1>
        <p className="mt-3 max-w-md text-neutral-600">
          중요한 일정과 자잘한 할 일을 서로 다른 페이지에 적는 웹 다이어리.
          <br />
          노란 공책 한 권을 1년 내내 쓰는 느낌으로.
        </p>
      </div>

      <Link
        href="/login"
        className="rounded bg-neutral-900 px-5 py-2.5 text-sm text-white"
      >
        시작하기
      </Link>
    </main>
  )
}
