'use client'

import Link from 'next/link'

/**
 * 노트 안에서 뭔가 잘못됐을 때 종이 자리에만 뜨는 화면.
 *
 * 헤더와 인덱스 탭은 레이아웃에 있어 그대로 남는다. 그래서 여기서 에러가 나도
 * 다른 달로 넘어가는 길은 살아 있다.
 *
 * `unstable_retry` 는 Next 16.2 에서 들어온 이름이다. 예전 `reset` 과 달리
 * 서버에서 데이터를 다시 받아온다. 인터넷이 잠깐 끊겼던 경우가 대부분이라
 * 다시 받아오는 쪽이 맞다.
 */
export default function PlannerError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-paper px-6 py-16 text-center">
      <p className="font-hand text-4xl leading-none text-ink">잠깐만요</p>

      <p className="text-sm text-ink-soft">
        이 장을 펴는 데 실패했습니다.
        <br />
        적어둔 내용은 그대로 있습니다.
      </p>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="cursor-pointer border border-accent bg-frame px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-paper"
        >
          다시 열기
        </button>
        <Link
          href="/cover"
          className="text-sm text-ink-faint underline underline-offset-4 hover:text-accent"
        >
          표지로
        </Link>
      </div>

      {/*
        서버에서 난 에러는 내용을 그대로 내려주지 않는다. 대신 digest 라는
        짧은 표식이 온다. 이게 있으면 서버 기록에서 같은 줄을 찾을 수 있다.
      */}
      {error.digest && (
        <p className="mt-4 text-[12px] text-ink-soft">
          오류 표식 {error.digest}
        </p>
      )}
    </div>
  )
}
