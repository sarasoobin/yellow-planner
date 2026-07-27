import type { Item, ItemStyle } from '@/lib/types'

/**
 * 한 칸(표지, 이 달 메모, 달력 한 날, 주간 한 요일…)에 해당하는 행들을
 * 하나의 글로 되돌린다.
 *
 * 지금은 한 칸이 한 행이지만, 줄 단위로 저장하던 시절에 적은 것은
 * 여러 행으로 남아 있다. 줄바꿈으로 이어 붙이면 그대로 읽힌다.
 * 그 칸을 한 번 저장하면 한 행으로 정리된다.
 */
export type Block = {
  content: string
  color: string | null
  style: ItemStyle | null
}

export const EMPTY_BLOCK: Block = { content: '', color: null, style: null }

export function toBlock(rows: Item[]): Block {
  if (rows.length === 0) return EMPTY_BLOCK
  return {
    content: rows.map((row) => row.content).join('\n'),
    color: rows[0].color,
    style: rows[0].style,
  }
}

/** 날짜별로 칸을 묶는다. 달력과 주간 페이지처럼 칸이 여러 개인 화면에서 쓴다. */
export function blocksByDate(rows: Item[]): Map<string, Block> {
  const grouped = new Map<string, Item[]>()
  for (const row of rows) {
    const list = grouped.get(row.date) ?? []
    list.push(row)
    grouped.set(row.date, list)
  }

  const blocks = new Map<string, Block>()
  for (const [date, list] of grouped) blocks.set(date, toBlock(list))
  return blocks
}

/** 체크한 개수. 그려둔 네모 중 체크된 것을 센다 (正자 집계에 쓴다). */
export function countChecked(content: string): number {
  return (content.match(/☑/g) ?? []).length
}

/**
 * 그려둔 네모와 그중 체크한 것.
 *
 * 네모를 안 그린 줄은 세지 않는다. 그냥 적어둔 메모까지 "미완료"로 잡으면
 * 완료율이 늘 바닥에 붙어서 아무 뜻이 없어진다.
 */
export function countBoxes(content: string): { done: number; total: number } {
  const done = (content.match(/☑/g) ?? []).length
  const todo = (content.match(/☐/g) ?? []).length
  return { done, total: done + todo }
}

/** 적힌 줄 수. 빈 줄은 세지 않는다 (달력의 할 일 개수 점에 쓴다). */
export function countLines(content: string): number {
  return content.split('\n').filter((line) => line.trim()).length
}

/** 첫 줄. 달력에 적은 그 날 가장 중요한 일정을 주간 페이지 위에 띄우는 데 쓴다. */
export function firstLine(content: string): string {
  return content.split('\n').find((line) => line.trim()) ?? ''
}
