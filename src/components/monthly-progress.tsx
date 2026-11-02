import Link from 'next/link'
import { MONTH_COLORS, yearMonth } from '@/lib/month-colors'
import { MONTH_LABELS } from '@/lib/dates'

/**
 * 표지의 월별 완료율.
 *
 * 통계 페이지를 따로 만들지 않기로 했다 (PRODUCT.md §5).
 * 한 해를 한눈에 보는 건 표지가 할 일이고, 막대 하나를 누르면 그 달로 간다.
 *
 * 네모를 그린 줄만 센다. 그냥 적어둔 메모까지 미완료로 잡으면
 * 막대가 늘 바닥에 붙어 아무 뜻이 없어진다.
 */
const BAR_HEIGHT = 44

export function MonthlyProgress({
  year,
  months,
}: {
  year: number
  /** 1~12월 순서. 네모를 안 그린 달은 total 이 0 */
  months: { done: number; total: number }[]
}) {
  const yearDone = months.reduce((sum, m) => sum + m.done, 0)
  const yearTotal = months.reduce((sum, m) => sum + m.total, 0)

  return (
    <section className="w-full">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-xs font-semibold tracking-[0.1em] text-ink-soft">
          Yearly progress
        </h2>
        {yearTotal > 0 && (
          <span className="text-[12px] text-ink-faint">
            {yearDone} of {yearTotal} complete
          </span>
        )}
      </div>

      <ol className="flex items-end gap-[3px]">
        {months.map((month, i) => {
          const rate = month.total ? month.done / month.total : 0
          const percent = Math.round(rate * 100)
          const color = MONTH_COLORS[i]

          return (
            <li key={i} className="flex flex-1 flex-col items-center gap-1">
              <Link
                href={`/month/${yearMonth(year, i + 1)}`}
                title={
                  month.total
                    ? `${MONTH_LABELS[i]} — ${month.done} of ${month.total} complete (${percent}%)`
                    : `${MONTH_LABELS[i]} — nothing yet`
                }
                aria-label={
                  month.total
                    ? `${MONTH_LABELS[i]}, ${month.done} of ${month.total} complete`
                    : `${MONTH_LABELS[i]}, nothing yet`
                }
                className="flex w-full flex-col justify-end rounded-[2px] bg-rule/35 transition-opacity hover:opacity-75"
                style={{ height: `${BAR_HEIGHT}px` }}
              >
                {/* 하나라도 체크했으면 눈에 보이게 최소 높이를 준다 */}
                <span
                  className="block w-full rounded-[2px] transition-all"
                  style={{
                    height: month.done
                      ? `${Math.max(rate * BAR_HEIGHT, 3)}px`
                      : 0,
                    backgroundColor: color,
                  }}
                />
              </Link>
              <span className="text-[10px] leading-none text-ink-faint">
                {i + 1}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
