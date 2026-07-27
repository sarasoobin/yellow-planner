import type { Item } from '@/lib/types'

/**
 * 어느 줄에 무엇이 적혀 있는지 계산한다.
 *
 * sort_order 를 "공책의 몇째 줄"로 쓴다. 그래서 일곱째 줄을 눌러 적으면
 * 일곱째 줄에 그대로 남는다 — 종이에 쓰는 것과 같게 하려는 것이다.
 *
 * 줄 번호가 생기기 전에 적은 것들은 전부 0이라 자리가 겹친다.
 * 겹치면 아래 빈 줄로 밀어 순서만은 지킨다.
 */
export function layoutLines(items: Item[]): Map<number, Item> {
  const byLine = new Map<number, Item>()
  let next = 0

  for (const item of items) {
    let line = Number.isFinite(item.sort_order) ? item.sort_order : next
    if (line < 0) line = next
    while (byLine.has(line)) line++
    byLine.set(line, item)
    next = line + 1
  }

  return byLine
}

/** 적힌 줄 중 가장 아래 줄 번호. 아무것도 없으면 -1 */
export function lastLineOf(byLine: Map<number, Item>): number {
  return byLine.size ? Math.max(...byLine.keys()) : -1
}
