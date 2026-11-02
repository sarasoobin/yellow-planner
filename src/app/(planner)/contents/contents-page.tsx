import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PaperBlock } from '@/components/paper-block'
import { toBlock } from '@/lib/blocks'
import { toDisplayHtml, toPlainText } from '@/lib/rich-text'
import { yearFirstDay } from '@/lib/dates'
import type { Item } from '@/lib/types'

const YEARS_PER_SPREAD = 4

/** 네 해의 표지 목표와, 각 해에 남기는 짧은 회고를 한 장에 모은다. */
export default async function ContentsPage({ startYear }: { startYear: number }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const years = Array.from({ length: YEARS_PER_SPREAD }, (_, index) => startYear + index)
  const dates = years.map(yearFirstDay)
  const path = `/contents/${startYear}`

  const { data } = await supabase
    .from('items')
    .select('*')
    .in('kind', ['year', 'contents'])
    .in('date', dates)
    .order('created_at', { ascending: true })

  const items = (data ?? []) as Item[]
  return (
    <section className="vintage-paper flex flex-1 flex-col px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6 flex items-center justify-between gap-3">
        {startYear > 2026 ? (
          <Link
            href={`/contents/${startYear - YEARS_PER_SPREAD}`}
            aria-label={`Previous four years, starting ${startYear - YEARS_PER_SPREAD}`}
            className="grid size-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-frame/70 hover:text-accent"
          >
            ‹
          </Link>
        ) : <span className="size-8" aria-hidden />}
        <div className="text-center">
          <p className="font-hand text-4xl leading-none text-ink md:text-5xl">Contents</p>
          <p className="mt-1 text-xs tracking-[0.18em] text-ink-faint">
            {startYear} — {startYear + YEARS_PER_SPREAD - 1}
          </p>
        </div>
        <Link
          href={`/contents/${startYear + YEARS_PER_SPREAD}`}
          aria-label={`Next four years, starting ${startYear + YEARS_PER_SPREAD}`}
          className="grid size-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-frame/70 hover:text-accent"
        >
          ›
        </Link>
      </header>

      <div className="grid gap-px overflow-hidden border border-edge/70 bg-edge/70 sm:grid-cols-2">
        {years.map((year) => {
          const date = yearFirstDay(year)
          const goal = toBlock(
            items.filter((item) => item.kind === 'year' && item.date === date),
          )
          const reflection = toBlock(
            items.filter((item) => item.kind === 'contents' && item.date === date),
          )
          const goalText = toPlainText(goal.content)

          return (
            <article key={year} className="flex min-h-72 flex-col bg-paper/88 p-5 md:p-6">
              <Link href={`/cover/${year}`} className="group block text-center">
                <h2 className="font-hand text-5xl leading-none text-ink transition-colors group-hover:text-accent">
                  {year}
                </h2>
                <p className="mt-2 text-[10px] font-semibold tracking-[0.18em] text-ink-faint uppercase">
                  Yearly intentions
                </p>
                {goalText ? (
                  <div
                    className="ruled mx-auto mt-3 min-h-[84px] w-full max-w-sm text-left text-[17px] text-ink-soft [&_div]:min-h-7 [&_p]:min-h-7"
                    // 표지에서 줄을 바꾼 자리와 글자별 꾸밈을 그대로 목차로 옮긴다.
                    dangerouslySetInnerHTML={{ __html: toDisplayHtml(goal.content) }}
                  />
                ) : (
                  <p className="mx-auto mt-3 min-h-[84px] w-full max-w-sm text-left text-[17px] leading-7 text-ink-faint">
                    Begin this year’s intentions on its cover.
                  </p>
                )}
              </Link>

              <div className="my-3 h-px scale-y-50 bg-rule/80" aria-hidden />

              <div className="flex flex-1 flex-col">
                <PaperBlock
                  kind="contents"
                  date={date}
                  path={path}
                  content={reflection.content}
                  color={reflection.color}
                  style={reflection.style}
                  minRows={4}
                  placeholder="A small reflection for this year…"
                />
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
