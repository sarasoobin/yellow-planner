import Link from 'next/link'

export const metadata = {
  title: '없는 장 · 正 PLANNER',
}

/**
 * 없는 장을 펼쳤을 때.
 *
 * 두 갈래로 들어온다.
 *   1. 아예 없는 주소 (/zzzz)
 *   2. 페이지가 직접 부른 notFound() — 없는 달(/month/2026-99),
 *      날짜가 아닌 주(/week/nope)
 *
 * 그래서 문구를 "주소가 틀렸다"로 못 박지 않고 "그 장이 없다"로 적는다.
 * 2번으로 들어온 사람에게는 주소를 고치라는 말이 도움이 안 된다.
 */
export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-desk px-6 py-16 text-center">
      <span className="font-hand text-6xl leading-none text-accent">正</span>

      <div>
        <p className="font-hand mb-1 text-3xl leading-none text-ink">
          없는 장입니다
        </p>
        <p className="text-sm text-ink-soft">
          이 노트에 그런 쪽은 없습니다.
          <br />
          표지에서 다시 시작해보세요.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/cover"
          className="border border-accent bg-frame px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-paper"
        >
          표지로
        </Link>
        <Link
          href="/"
          className="text-sm text-ink-faint underline underline-offset-4 hover:text-accent"
        >
          처음으로
        </Link>
      </div>
    </div>
  )
}
