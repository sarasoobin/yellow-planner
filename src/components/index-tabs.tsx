'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * 노트 옆에 붙는 인덱스 탭 14개 — 표지 · 1~12월 · 메모.
 *
 * 데스크톱은 오른쪽 세로, 모바일은 위쪽 가로 스크롤 (DESIGN.md §5-1, §6).
 * 14개를 세로로 쌓으면 375px 화면에 절대 들어가지 않는다.
 */

/** DESIGN.md §2 — 계절을 따라간 12개월 색 */
const MONTH_COLORS = [
  '#A8C4D9', '#B8B0D4', '#F0BCC8', '#F5C9A0',
  '#C5DBA0', '#9CC9A8', '#8FC5D6', '#F5B889',
  '#D9B896', '#E09A73', '#B8A894', '#8FA3C4',
]

const COVER_COLOR = '#E0CE72'
const NOTE_COLOR = '#C9C4BC'

type Tab = { key: string; label: string; href: string; color: string }

function buildTabs(year: number): Tab[] {
  return [
    { key: 'cover', label: '표지', href: '/cover', color: COVER_COLOR },
    ...MONTH_COLORS.map((color, i) => {
      const mm = String(i + 1).padStart(2, '0')
      return {
        key: `m${mm}`,
        label: `${i + 1}월`,
        href: `/month/${year}-${mm}`,
        color,
      }
    }),
    { key: 'note', label: '메모', href: '/note', color: NOTE_COLOR },
  ]
}

/** 지금 보고 있는 화면에 해당하는 탭. 주간 페이지는 그 주가 시작하는 달을 켠다. */
function activeKey(pathname: string): string {
  if (pathname.startsWith('/cover')) return 'cover'
  if (pathname.startsWith('/note')) return 'note'

  const match = pathname.match(/^\/(?:month|week)\/\d{4}-(\d{2})/)
  return match ? `m${match[1]}` : ''
}

/** 주소에 연도가 있으면 그 해를, 없으면 올해를 기준으로 탭을 만든다 */
function yearFromPath(pathname: string, fallback: number): number {
  const match = pathname.match(/^\/(?:month|week)\/(\d{4})-/)
  return match ? Number(match[1]) : fallback
}

export function IndexTabs({
  orientation,
  currentYear,
}: {
  orientation: 'side' | 'top'
  currentYear: number
}) {
  const pathname = usePathname()
  const tabs = buildTabs(yearFromPath(pathname, currentYear))
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
              className={`shrink-0 rounded-t-[3px] px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-ink transition-opacity ${
                on
                  ? 'opacity-100 shadow-[inset_0_-3px_0_rgba(61,53,39,.35)]'
                  : 'opacity-55 hover:opacity-85'
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
      className="hidden shrink-0 flex-col gap-[3px] pt-8 md:flex"
    >
      {tabs.map((tab) => {
        const on = tab.key === active
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={on ? 'page' : undefined}
            style={{ backgroundColor: tab.color }}
            className={`flex w-[30px] items-center justify-center rounded-r-[3px] py-3 text-[11px] font-semibold text-ink transition-all [writing-mode:vertical-rl] ${
              on
                ? 'w-[38px] opacity-100 shadow-[1px_1px_2px_rgba(61,53,39,.18)]'
                : 'opacity-60 hover:w-[34px] hover:opacity-90'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
