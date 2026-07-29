'use client'

import Link from 'next/link'

/**
 * 노트 바깥 — 랜딩과 로그인 화면에서 뭔가 잘못됐을 때.
 *
 * 노트 안쪽은 (planner)/error.tsx 가 따로 맡는다. 그쪽은 헤더와 인덱스 탭이
 * 살아 있는 자리라 문구도 다르다.
 */
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-desk px-6 py-16 text-center">
      <span className="font-hand text-5xl leading-none text-accent">正</span>

      <p className="text-sm text-ink-soft">
        화면을 여는 데 실패했습니다.
        <br />
        잠시 뒤에 다시 시도해주세요.
      </p>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="cursor-pointer border border-accent bg-frame px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-paper"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="text-sm text-ink-faint underline underline-offset-4 hover:text-accent"
        >
          처음으로
        </Link>
      </div>

      {error.digest && (
        <p className="mt-4 text-[12px] text-ink-soft">
          오류 표식 {error.digest}
        </p>
      )}
    </div>
  )
}
