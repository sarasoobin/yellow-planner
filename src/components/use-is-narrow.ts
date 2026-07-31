'use client'

import { useSyncExternalStore } from 'react'

/**
 * 좁은 화면(폰)인가.
 *
 * Tailwind 의 md 기준(768px)과 같은 값을 쓴다. CSS 로 감추면 되는 것은 CSS 로
 * 하고, 여기서는 "폰에서는 아예 다른 것을 그린다" 처럼 구조가 달라질 때만 쓴다.
 */
const NARROW = '(max-width: 767px)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia(NARROW)
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
