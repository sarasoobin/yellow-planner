'use client'

import Link from 'next/link'
import { PaperBlock } from '@/components/paper-block'
import { dayNumber } from '@/lib/dates'
import type { Block } from '@/lib/blocks'

/**
 * 달력의 한 칸.
 *
 * 종이 플래너와 같다. 날짜 옆부터 적기 시작하고, 한 줄이 꽉 차면
 * 다음 줄로 이어진다. 주제가 바뀌면 Enter로 줄을 바꾼다.
 * 첫 줄이 자연스럽게 그 날 가장 중요한 일정이 된다.
 *
 * 날짜 숫자는 그 주의 주간 페이지로 가는 지름길이다.
 */
const CELL_LINE = 21

export function CalendarCell({
  date,
  weekStart,
  block,
  taskCount,
  isToday,
  inMonth,
  path,
}: {
  date: string
  weekStart: string
  block: Block
  taskCount: number
  isToday: boolean
  inMonth: boolean
  path: string
}) {
  return (
    <div
      className={`group relative min-w-0 flex-1 border-r border-b border-rule px-1 pt-0.5 pb-1 ${
        inMonth ? '' : 'bg-desk/50'
      }`}
    >
      <Link
        href={`/week/${weekStart}`}
        aria-label={`${dayNumber(date)}일 주간 페이지로 이동`}
        className={`absolute top-0.5 left-1 z-10 grid size-[21px] place-items-center rounded-full text-[13px] leading-none transition-colors ${
          isToday
            ? 'bg-today font-bold text-paper'
            : inMonth
              ? 'text-ink-soft hover:bg-frame/60'
              : 'text-ink-faint/60'
        }`}
      >
        {dayNumber(date)}
      </Link>

      {/* 그 날 주간 페이지에 적어둔 자잘한 할 일 개수 */}
      {taskCount > 0 && (
        <span
          className="absolute top-[7px] right-1 flex gap-[2px]"
          aria-label={`할 일 ${taskCount}개`}
        >
          {Array.from({ length: Math.min(taskCount, 3) }, (_, i) => (
            <span key={i} className="size-[3px] rounded-full bg-ink-faint" />
          ))}
        </span>
      )}

      <PaperBlock
        kind="event"
        date={date}
        path={path}
        content={block.content}
        color={block.color}
        style={block.style}
        minRows={3}
        lineHeight={CELL_LINE}
        fontSize={13}
        ruled={false}
        // 날짜 숫자를 피해 첫 줄만 들여쓴다. 길어지면 다음 줄은 왼쪽 끝부터.
        firstLineIndent={25}
        className="relative"
      />
    </div>
  )
}
