'use client'

import { startTransition, useCallback, useEffect, useRef, useState } from 'react'
import { saveCalendarChanges } from '@/lib/actions/calendar'
import { applyCalendarChange, blankCalendarNote, type CalendarChange, type CalendarSource } from '@/lib/calendar-reminders'

type PendingChange = { date: string; change: CalendarChange }

/** 달력 전체가 한 저장 대기열을 공유한다. 반복 원본과 표시 날짜를 함께 즉시 갱신한다. */
export function useCalendarNotes(initialSources: CalendarSource[]) {
  const [sources, setSources] = useState(initialSources)
  const [status, setStatus] = useState<'saved' | 'pending' | 'error'>('saved')
  const [error, setError] = useState<string | null>(null)
  const queue = useRef<PendingChange[]>([])
  const running = useRef<Promise<boolean> | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback((): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current)
    if (running.current) return running.current
    const request = Promise.resolve().then(async () => {
      while (queue.current.length) {
        const date = queue.current[0].date
        let count = 1
        while (count < queue.current.length && count < 100 && queue.current[count].date === date) count++
        const batch = queue.current.splice(0, count)
        try {
          const result = await saveCalendarChanges({ sourceDate: date, changes: batch.map((entry) => entry.change) })
          if (result.error) throw new Error(result.error)
        } catch (cause) {
          queue.current.unshift(...batch)
          setError(cause instanceof Error ? cause.message : '저장하지 못했습니다. 다시 시도해주세요.')
          setStatus('error')
          return false
        }
      }
      setStatus('saved')
      setError(null)
      return true
    }).finally(() => { running.current = null })
    running.current = request
    return request
  }, [])

  const change = useCallback((date: string, change: CalendarChange, persist = true) => {
    setSources((sources) => {
      const source = sources.find((source) => source.date === date)
      const updated = {
        date, color: source?.color ?? null,
        note: applyCalendarChange(source?.note ?? blankCalendarNote(), change),
      }
      return source ? sources.map((entry) => entry.date === date ? updated : entry) : [...sources, updated]
    })
    if (!persist) return
    // 타이핑 중에는 같은 필드의 가장 최근 값만 전송한다.
    const last = queue.current.at(-1)
    if (last?.date === date && last.change.type === change.type &&
      (change.type === 'title' || (change.type === 'text' && last.change.type === 'text' && last.change.id === change.id))) {
      // 새 항목의 삽입 위치는 이후 타이핑에도 유지한다.
      if (change.type === 'text' && last.change.type === 'text') change = { ...last.change, ...change }
      last.change = change
    } else queue.current.push({ date, change })
    setStatus('pending')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => startTransition(async () => { await flush() }), 350)
  }, [flush])

  useEffect(() => {
    const onUnload = (event: BeforeUnloadEvent) => {
      if (queue.current.length || running.current) event.preventDefault()
    }
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      if (timer.current) clearTimeout(timer.current)
      // 날짜/화면을 바꾸는 순간에도 마지막 입력을 전송한다.
      startTransition(async () => { await flush() })
    }
  }, [flush])

  return { sources, change, flush, status, error }
}

export type CalendarController = ReturnType<typeof useCalendarNotes>
