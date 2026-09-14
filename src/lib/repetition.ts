import { fromISODate } from '@/lib/dates'
import {
  REPEAT_FREQUENCIES,
  type ItemStyle,
  type RepeatFrequency,
} from '@/lib/types'

/** 저장된 style 값이 오래되었거나 손상돼도 반복하지 않는 일정으로 안전하게 처리한다. */
export function repeatFromStyle(style: ItemStyle | null | undefined): RepeatFrequency {
  return REPEAT_FREQUENCIES.includes(style?.repeat ?? 'none')
    ? (style?.repeat ?? 'none')
    : 'none'
}

export function isRepeatFrequency(value: string): value is RepeatFrequency {
  return REPEAT_FREQUENCIES.includes(value as RepeatFrequency)
}

/** 시작일에 적은 일정이 targetDate에도 보여야 하는지. 시작일 자체는 원본 일정으로만 그린다. */
export function repeatsOn(
  sourceDate: string,
  targetDate: string,
  repeat: RepeatFrequency,
  endsAt: string | null = null,
): boolean {
  if (repeat === 'none' || targetDate <= sourceDate) return false
  // 시간 없는 달력 항목은 해당 날짜 00:00부터 존재한다. 종료일도 포함한다.
  if (endsAt && `${targetDate}T00:00` > endsAt) return false

  const source = fromISODate(sourceDate)
  const target = fromISODate(targetDate)
  if (!source || !target) return false

  switch (repeat) {
    case 'daily':
      return true
    case 'weekly':
      return source.getDay() === target.getDay()
    case 'monthly':
      return Math.min(source.getDate(), new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()) === target.getDate()
    case 'yearly':
      return (
        source.getMonth() === target.getMonth() &&
        Math.min(source.getDate(), new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()) === target.getDate()
      )
  }
}

export const REPEAT_LABELS: Record<RepeatFrequency, string> = {
  none: '반복 안 함',
  daily: '매일',
  weekly: '매주',
  monthly: '매월',
  yearly: '매년',
}
