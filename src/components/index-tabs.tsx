'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  COVER_COLOR,
  CONTENTS_COLOR,
  MONTH_COLORS,
  NOTE_COLOR,
  yearMonth,
} from '@/lib/month-colors'
import { MONTH_LABELS } from '@/lib/dates'

/**
 * 노트 옆에 붙는 인덱스 탭 14개 — 표지 · 1~12월 · 메모.
 *
 * 데스크톱은 오른쪽 세로, 모바일은 위쪽 가로 스크롤 (DESIGN.md §5-1, §6).
 * 14개를 세로로 쌓으면 375px 화면에 절대 들어가지 않는다.
 */

type Tab = { key: string; label: string; href: string; color: string }

function buildTabs(year: number): Tab[] {
  const contentsStart = 2026 + Math.floor((Math.max(year, 2026) - 2026) / 4) * 4
  return [
    { key: 'cover', label: 'Cover', href: `/cover/${year}`, color: COVER_COLOR },
    { key: 'contents', label: 'Contents', href: `/contents/${contentsStart}`, color: CONTENTS_COLOR },
    ...MONTH_COLORS.map((color, i) => ({
      key: `m${String(i + 1).padStart(2, '0')}`,
      label: MONTH_LABELS[i].slice(0, 3),
      href: `/month/${yearMonth(year, i + 1)}`,
      color,
    })),
    { key: 'note', label: 'Notes', href: `/note?year=${year}`, color: NOTE_COLOR },
  ]
}

/** 지금 보고 있는 화면에 해당하는 탭. 주간 페이지는 그 주가 시작하는 달을 켠다. */
function activeKey(pathname: string): string {
  if (pathname.startsWith('/cover')) return 'cover'
  if (pathname.startsWith('/contents')) return 'contents'
  if (pathname.startsWith('/note')) return 'note'

  const match = pathname.match(/^\/(?:month|week)\/\d{4}-(\d{2})/)
  return match ? `m${match[1]}` : ''
}

/** 주소에 연도가 있으면 그 해를, 없으면 올해를 기준으로 탭을 만든다 */
function yearFromPath(pathname: string, fallback: number, noteYear: string | null): number {
  const match = pathname.match(/^\/(?:cover\/(\d{4})$|contents\/(\d{4})$|(?:month|week)\/(\d{4})-)/)
  if (match) return Number(match[1] ?? match[2] ?? match[3])
  return pathname === '/note' && /^\d{4}$/.test(noteYear ?? '')
    ? Number(noteYear)
    : fallback
}

export function IndexTabs({
  orientation,
  currentYear,
}: {
  orientation: 'side' | 'top'
  currentYear: number
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabs = buildTabs(yearFromPath(pathname, currentYear, searchParams.get('year')))
  const active = activeKey(pathname)

  if (orientation === 'top') {
    return (
      <nav
        aria-label="인덱스"
        className="flex gap-1 overflow-x-auto border-b border-edge bg-frame px-3 py-2 md:hidden"
      >
        {tabs.map((tab) => {
          const on = tab.key === active
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={on ? 'page' : undefined}
              style={{ backgroundColor: tab.color }}
              className={`shrink-0 rounded-t-[3px] border border-edge/65 px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap text-ink transition-opacity ${
                on
                  ? 'opacity-100 shadow-[inset_0_-3px_0_rgba(89,55,91,.38)]'
                  : 'opacity-85 hover:opacity-100'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <nav
      aria-label="인덱스"
      // 페이지가 길어져도 탭은 화면에 붙어 따라온다
      className="sticky top-6 hidden shrink-0 flex-col gap-1 self-start pt-10 md:flex"
    >
      {tabs.map((tab) => {
        const on = tab.key === active
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={on ? 'page' : undefined}
            style={{ backgroundColor: tab.color }}
            className={`flex h-9 items-center justify-center rounded-r-[3px] border border-edge/65 text-xs font-semibold text-ink transition-all ${
              on
              ? 'w-[58px] opacity-100 shadow-[1px_1px_3px_rgba(89,55,91,.22)]'
                : 'w-[46px] opacity-85 hover:w-[52px] hover:opacity-100'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
