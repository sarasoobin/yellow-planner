import Link from 'next/link'

/** 표지에서 해를 넘긴다. 각 해는 주소와 저장 공간이 따로라 예전 기록도 그대로 남는다. */
export function YearNavigation({ year }: { year: number }) {
  const previousYear = year > 1000 ? year - 1 : null
  const nextYear = year < 9999 ? year + 1 : null

  return (
    <div className="flex items-center justify-center gap-3">
      {previousYear ? (
        <Link
          href={`/cover/${previousYear}`}
          aria-label={`Cover for ${previousYear}`}
          className="grid size-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-frame hover:text-accent"
        >
          ‹
        </Link>
      ) : (
        <span className="size-8" aria-hidden />
      )}

      <h1 className="cover-year font-hand text-[7.25rem] leading-[0.68] md:text-[10.5rem]">
        {year}
      </h1>

      {nextYear ? (
        <Link
          href={`/cover/${nextYear}`}
          aria-label={`Cover for ${nextYear}`}
          className="grid size-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-frame hover:text-accent"
        >
          ›
        </Link>
      ) : (
        <span className="size-8" aria-hidden />
      )}
    </div>
  )
}
