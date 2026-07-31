'use client'

import Link from 'next/link'
import { PaperBlock } from '@/components/paper-block'
import { countLines } from '@/lib/blocks'
import { dayNumber } from '@/lib/dates'
import type { Block } from '@/lib/blocks'

/**
 * 달력의 한 칸.
 *
 * 넓은 화면에서는 종이 플래너와 같다. 날짜 옆부터 적기 시작하고, 한 줄이 꽉
 * 차면 다음 줄로 이어진다. 첫 줄이 자연스럽게 그 날 가장 중요한 일정이 된다.
 *
 * 폰에서는 칸이 43px 밖에 안 된다. 13px 한글이 한 줄에 두세 자 들어가서
 * "과제 마감 23:59" 가 "과제 마 / 감 23:5 / 9" 로 잘린다. 글자를 넣을 수 없는
 * 넓이다. 그래서 폰에서는 칸을 한눈에 보는 용도로만 쓴다 — 날짜와 색 띠,
 * 할 일 개수 점까지만 그리고, 누르면 달력 아래에서 그 날을 적는다 (MonthBoard).
 */
const CELL_LINE = 21

/** 폰에서 한 칸에 그릴 색 띠의 최대 개수. 넘으면 칸이 띠로 가득 찬다 */
const MAX_BARS = 3

export function CalendarCell({
  date,
  weekStart,
  ym,
  block,
  taskCount,
  isToday,
  inMonth,
  path,
  narrow,
  picked,
  onPick,
}: {
  date: string
  weekStart: string
  /** 지금 보고 있는 달. 주간에 갔다가 이 달로 돌아오게 하는 데 쓴다 */
  ym: string
  block: Block
  taskCount: number
  isToday: boolean
  inMonth: boolean
  path: string
  /** 폰인가. 참이면 글자 대신 색 띠만 그리고 누르면 고른다 */
  narrow: boolean
  picked: boolean
  onPick: (date: string) => void
}) {
  const bars = Math.min(countLines(block.content), MAX_BARS)

  if (narrow) {
    return (
      <button
        type="button"
        aria-pressed={picked}
        aria-label={`${dayNumber(date)}일${bars ? `, 일정 ${bars}개` : ''}${
          taskCount ? `, 할 일 ${taskCount}개` : ''
        }`}
        onClick={() => onPick(date)}
        className={`flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-[3px] border-r border-b border-rule px-[3px] pt-1 pb-1.5 transition-colors ${
          picked ? 'bg-frame/70' : inMonth ? '' : 'bg-desk/50'
        }`}
      >
        <span
          className={`grid size-[21px] shrink-0 place-items-center rounded-full text-[13px] leading-none ${
            isToday
              ? 'bg-today font-bold text-paper'
              : inMonth
                ? 'text-ink-soft'
                : 'text-ink-faint/60'
          }`}
        >
          {dayNumber(date)}
        </span>

        {/* 중요한 일정 — 한 줄에 하나씩 띠로 (DESIGN.md §5-0) */}
        <span className="flex w-full flex-col gap-[2px]">
          {Array.from({ length: bars }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className="h-[3px] w-full"
              style={{ backgroundColor: block.color ?? 'var(--color-today)' }}
            />
          ))}
        </span>

        {/* 그 날 주간 페이지에 적어둔 자잘한 할 일 개수 */}
        {taskCount > 0 && (
          <span aria-hidden className="mt-auto flex gap-[2px]">
            {Array.from({ length: Math.min(taskCount, 3) }, (_, i) => (
              <span key={i} className="size-[3px] rounded-full bg-ink-faint" />
            ))}
          </span>
        )}
      </button>
    )
  }

  return (
    <div
      className={`group relative min-w-0 flex-1 border-r border-b border-rule px-1 pt-0.5 pb-1 ${
        inMonth ? '' : 'bg-desk/50'
      }`}
    >
      <Link
        href={`/week/${weekStart}?from=${ym}`}
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
