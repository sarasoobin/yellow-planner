'use client'

import { useSyncExternalStore } from 'react'

/**
 * 좁은 화면(폰)인가.
 *
 * Tailwind 의 md 기준(768px)과 같은 값을 쓴다. CSS 로 감추면 되는 것은 CSS 로
 * 하고, 여기서는 "폰에서는 아예 다른 것을 그린다" 처럼 구조가 달라질 때만 쓴다.
 */
const NARROW = '(max-width: 767px)'
/** 월간 7열 편집칸은 1024px부터 편안하게 읽힌다. 그보다 좁으면 압축 달력을 쓴다. */
const COMPACT_CALENDAR = '(max-width: 1023px)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia(NARROW)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function subscribeCompactCalendar(onChange: () => void) {
  const query = window.matchMedia(COMPACT_CALENDAR)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

export function useIsNarrow(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(NARROW).matches,
    // 서버에서는 화면 폭을 알 수 없다. 넓은 쪽으로 그린다.
    () => false,
  )
}

/** 태블릿까지 포함한 월간 압축 보기 여부. 다른 편집기는 기존 모바일 기준을 따른다. */
export function useIsCompactCalendar(): boolean {
  return useSyncExternalStore(
    subscribeCompactCalendar,
    () => window.matchMedia(COMPACT_CALENDAR).matches,
    () => false,
  )
}
