'use client'

import { startTransition, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useArmedSticker } from '@/components/toolbar'
import {
  blankCalendarNote, blankCalendarTask, calendarOccurrences, calendarTaskKind,
  calendarTaskSkippedDates, calendarText, calendarTitleForDate, calendarTitleSkippedDates, hasCalendarText,
} from '@/lib/calendar-reminders'
import { toDisplayHtml, toPlainText } from '@/lib/rich-text'
import { repeatsOn } from '@/lib/repetition'
import type { CalendarController } from '@/components/use-calendar-notes'
import type { RepeatSelection } from '@/components/calendar-repeat-dialog'

export type CalendarTitleRename = {
  sourceDate: string
  occurrenceDate: string
  previous: string
  next: string
}

function InfoButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" aria-label={label} title="일정 설정" onClick={onClick}
    className="grid size-5 shrink-0 place-items-center self-start rounded focus-visible:outline-2 focus-visible:outline-accent md:size-[18px]">
    <span aria-hidden className="grid size-[13px] place-items-center rounded-full border border-[#bd6aae] bg-transparent text-[9px] leading-none font-bold text-[#a64c98] md:size-3 md:text-[8px]">i</span>
  </button>
}

function inlineValue(element: HTMLElement): string {
  const html = element.innerHTML
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(div|p)>/gi, ' ')
    .replace(/<(div|p)[^>]*>/gi, '')
  return toPlainText(html).trim() ? html : ''
}

function placeCaretAtEnd(element: HTMLElement) {
  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(element)
  range.collapse(false)
  selection?.removeAllRanges()
  selection?.addRange(range)
}

function isCaretAtStart(element: HTMLElement): boolean {
  const selection = window.getSelection()
  if (!selection?.isCollapsed || selection.rangeCount === 0) return false
  const range = selection.getRangeAt(0)
  if (!element.contains(range.startContainer)) return false
  const before = range.cloneRange()
  before.selectNodeContents(element)
  before.setEnd(range.startContainer, range.startOffset)
  return before.toString().length === 0
}

type TextSlice = { node: Text; from: number; to: number }

function toRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

function selectedTextSlices(root: HTMLElement, range: Range): TextSlice[] {
  const slices: TextSlice[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    const text = node as Text
    if (!text.data || !range.intersectsNode(text)) continue
    const from = text === range.startContainer ? range.startOffset : 0
    const to = text === range.endContainer ? range.endOffset : text.data.length
    if (from < to) slices.push({ node: text, from, to })
  }
  return slices
}

function wrapTextSlice(slice: TextSlice, makeWrapper: () => HTMLElement): HTMLElement | null {
  const parent = slice.node.parentNode
  if (!parent) return null
  const before = slice.node.data.slice(0, slice.from)
  const picked = slice.node.data.slice(slice.from, slice.to)
  const after = slice.node.data.slice(slice.to)
  if (!picked) return null
  const fragment = document.createDocumentFragment()
  if (before) fragment.append(document.createTextNode(before))
  const wrapper = makeWrapper()
  wrapper.append(document.createTextNode(picked))
  fragment.append(wrapper)
  if (after) fragment.append(document.createTextNode(after))
  parent.replaceChild(fragment, slice.node)
  return wrapper
}

function decorateSelection(root: HTMLElement, makeWrapper: () => HTMLElement): boolean {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return false
  const range = selection.getRangeAt(0).cloneRange()
  if (range.collapsed || !range.intersectsNode(root)) return false
  const wrappers = selectedTextSlices(root, range)
    .reverse()
    .map((slice) => wrapTextSlice(slice, makeWrapper))
    .filter((wrapper): wrapper is HTMLElement => wrapper !== null)
  root.normalize()
  selection.removeAllRanges()
  if (wrappers[0]) {
    const after = document.createRange()
    after.setStartAfter(wrappers[0])
    after.collapse(true)
    selection.addRange(after)
  }
  return wrappers.length > 0
}

function closestDecoratedElement(root: HTMLElement, node: Text, decorated: (element: HTMLElement) => boolean): HTMLElement | null {
  let element = node.parentElement
  while (element && element !== root) {
    if (decorated(element)) return element
    element = element.parentElement
  }
  return null
}

function appendWrappedSlice(fragment: DocumentFragment, wrapper: HTMLElement, slice: DocumentFragment) {
  if (!slice.childNodes.length) return
  const clone = wrapper.cloneNode(false) as HTMLElement
  clone.append(slice)
  fragment.append(clone)
}

function unwrapDecoratedSlice(
  wrapper: HTMLElement,
  startNode: Text,
  startOffset: number,
  endNode: Text,
  endOffset: number,
) {
  const parent = wrapper.parentNode
  if (!parent) return
  const beforeRange = document.createRange()
  beforeRange.setStart(wrapper, 0)
  beforeRange.setEnd(startNode, startOffset)
  const pickedRange = document.createRange()
  pickedRange.setStart(startNode, startOffset)
  pickedRange.setEnd(endNode, endOffset)
  const afterRange = document.createRange()
  afterRange.setStart(endNode, endOffset)
  afterRange.setEnd(wrapper, wrapper.childNodes.length)
  const fragment = document.createDocumentFragment()
  appendWrappedSlice(fragment, wrapper, beforeRange.cloneContents())
  fragment.append(pickedRange.cloneContents())
  appendWrappedSlice(fragment, wrapper, afterRange.cloneContents())
  parent.replaceChild(fragment, wrapper)
}

function removeDecoration(root: HTMLElement, decorated: (element: HTMLElement) => boolean): boolean {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return false
  const range = selection.getRangeAt(0).cloneRange()
  if (range.collapsed || !range.intersectsNode(root)) return false
  const slices = selectedTextSlices(root, range)
  const groups: { wrapper: HTMLElement; slices: TextSlice[] }[] = []
  for (const slice of slices) {
    const wrapper = closestDecoratedElement(root, slice.node, decorated)
    if (!wrapper) return false
    const group = groups.find((entry) => entry.wrapper === wrapper)
    if (group) group.slices.push(slice)
    else groups.push({ wrapper, slices: [slice] })
  }
  if (!groups.length) return false
  for (const group of groups.reverse()) {
    const first = group.slices[0]
    const last = group.slices[group.slices.length - 1]
    unwrapDecoratedSlice(group.wrapper, first.node, first.from, last.node, last.to)
  }
  root.normalize()
  selection.removeAllRanges()
  return true
}

function isHighlightedWith(hex: string) {
  const rgb = toRgb(hex)
  return (element: HTMLElement) =>
    element.style.backgroundColor === hex ||
      element.style.backgroundColor === rgb ||
      getComputedStyle(element).backgroundColor === rgb
}

function isUnderlined(element: HTMLElement): boolean {
  return element.tagName === 'U' ||
    element.style.textDecoration === 'underline' ||
    element.style.textDecorationLine === 'underline'
}

function toggleHighlight(root: HTMLElement, hex: string): boolean {
  const selection = window.getSelection()
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null
  if (!range || range.collapsed) return false
  const slices = selectedTextSlices(root, range)
  const highlighted = isHighlightedWith(hex)
  if (slices.length > 0 && slices.every((slice) => closestDecoratedElement(root, slice.node, highlighted))) {
    return removeDecoration(root, highlighted)
  }
  return decorateSelection(root, () => {
    const span = document.createElement('span')
    span.style.backgroundColor = hex
    return span
  })
}

function toggleUnderline(root: HTMLElement): boolean {
  const selection = window.getSelection()
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null
  if (!range || range.collapsed) return false
  const slices = selectedTextSlices(root, range)
  if (slices.length > 0 && slices.every((slice) => closestDecoratedElement(root, slice.node, isUnderlined))) {
    return removeDecoration(root, isUnderlined)
  }
  return decorateSelection(root, () => document.createElement('u'))
}

function CalendarTextLine({ value, ariaLabel, placeholder, className, inputRef, onChange, onBlur, onKeyDown, onSlashCheckbox }: {
  value: string
  ariaLabel: string
  placeholder?: string
  className: string
  inputRef?: (element: HTMLDivElement | null) => void
  onChange: (value: string) => void
  onBlur: () => void
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  onSlashCheckbox?: () => void
}) {
  const localRef = useRef<HTMLDivElement | null>(null)
  const { marker, underline } = useArmedSticker()
  const html = toDisplayHtml(value)
  const [initialHtml] = useState(() => ({ __html: html }))

  useEffect(() => {
    const element = localRef.current
    if (element && document.activeElement !== element && element.innerHTML !== html) {
      element.innerHTML = html
    }
  }, [html])

  function emit(element: HTMLDivElement) {
    const next = inlineValue(element)
    if (onSlashCheckbox && /^\/\s*(체크박스|체크|checkbox|check|todo)?\s*$/i.test(toPlainText(next))) {
      element.innerHTML = ''
      onSlashCheckbox()
      return
    }
    onChange(next)
  }

  return <div className="relative min-w-0 flex-1">
    <div ref={(element) => { localRef.current = element; inputRef?.(element) }}
      contentEditable suppressContentEditableWarning role="textbox" aria-label={ariaLabel}
      spellCheck={false} dangerouslySetInnerHTML={initialHtml}
      onInput={(event) => emit(event.currentTarget)}
      onBlur={(event) => { emit(event.currentTarget); onBlur() }}
      onKeyDown={onKeyDown}
      onMouseUp={(event) => {
        const root = event.currentTarget
        const changed = marker ? toggleHighlight(root, marker) : underline ? toggleUnderline(root) : false
        if (changed) { emit(root); onBlur() }
      }}
      onPaste={(event) => {
        event.preventDefault()
        document.execCommand('insertText', false, event.clipboardData.getData('text/plain').replace(/\s*\n+\s*/g, ' '))
        requestAnimationFrame(() => emit(event.currentTarget))
      }}
      className={`calendar-rich-text ${className}`}
    />
    {!hasCalendarText(value) && placeholder && (
      <span aria-hidden className="pointer-events-none absolute top-0 left-0 py-px text-ink-faint/50">{placeholder}</span>
    )}
  </div>
}

export function CalendarDayEditor({ date, leading, controller, onDetails, onRenameTitle, mobile = false }: {
  date: string
  leading: ReactNode
  controller: CalendarController
  onDetails: (selection: RepeatSelection) => void
  onRenameTitle: (rename: CalendarTitleRename) => void
  mobile?: boolean
}) {
  const { sources, change, flush } = controller
  const source = sources.find((source) => source.date === date)
  const note = source?.note ?? blankCalendarNote()
  const inputs = useRef(new Map<string, HTMLDivElement>())
  const titleDraft = useRef<string | null>(null)
  const recurringTitleDrafts = useRef(new Map<string, string>())
  const inheritedTaskDrafts = useRef(new Map<string, string>())
  const visibleStoredTasks = note.tasks.filter((task) => !calendarTaskSkippedDates(task).includes(date))
  const ownTasks = visibleStoredTasks.length ? visibleStoredTasks : [blankCalendarTask(`empty-${date}`, 'event')]
  const inherited = calendarOccurrences(sources, date).filter((row) => row.sourceDate !== date)
  const visibleOwnTasks = visibleStoredTasks.length || inherited.length === 0 ? ownTasks : []
  const rows = [...visibleOwnTasks.map((task) => ({ sourceDate: date, task })), ...inherited]
  const recurringTitles = sources.filter((entry) => !calendarTitleSkippedDates(entry.note).includes(date) && hasCalendarText(entry.note.title) &&
    repeatsOn(entry.date, date, entry.note.titleRepeat, entry.note.titleEndsAt))
  const titleValue = calendarTitleSkippedDates(note).includes(date) ? '' : calendarTitleForDate(note, date)
  const titleRepeats = note.titleRepeat !== 'none'
  const primaryRecurringTitle = hasCalendarText(titleValue) ? undefined : recurringTitles[0]
  const primaryTitle = primaryRecurringTitle
    ? calendarTitleForDate(primaryRecurringTitle.note, date)
    : titleValue
  const remainingRecurringTitles = primaryRecurringTitle ? recurringTitles.slice(1) : recurringTitles
  const save = () => startTransition(async () => { await flush() })
  const focus = (sourceDate: string, id: string) => requestAnimationFrame(() => {
    const element = inputs.current.get(`${sourceDate}:${id}`)
    element?.focus()
    if (element) placeCaretAtEnd(element)
  })
  const replaceInheritedTask = (key: string, sourceDate: string, task: typeof rows[number]['task'], text: string, kind: 'event' | 'todo') => {
    inheritedTaskDrafts.current.delete(key)
    if (text === task.text && kind === calendarTaskKind(task)) { save(); return null }
    change(sourceDate, { type: 'skip', id: task.id, date, skip: true })
    if (!hasCalendarText(text) && kind !== 'todo') { save(); return null }
    const id = crypto.randomUUID()
    change(date, { type: 'text', id, text, kind, afterId: note.tasks.at(-1)?.id })
    save()
    return id
  }

  return (
    <div className={mobile ? 'text-[15px]' : 'text-[13px]'} style={{ color: source?.color ?? undefined }}>
      <div className="flex min-w-0 items-start gap-0.5">
        {leading}
        <CalendarTextLine value={primaryTitle} ariaLabel={`${date} 중요 일정`}
          placeholder={mobile ? '중요 일정' : ''}
          onChange={(text) => {
            if (primaryRecurringTitle) recurringTitleDrafts.current.set(primaryRecurringTitle.date, text)
            else if (titleRepeats) titleDraft.current = text
            else change(date, { type: 'title', text })
          }}
          onBlur={() => {
            if (primaryRecurringTitle) {
              const next = recurringTitleDrafts.current.get(primaryRecurringTitle.date)
              recurringTitleDrafts.current.delete(primaryRecurringTitle.date)
              if (next !== undefined && next !== primaryTitle) {
                onRenameTitle({ sourceDate: primaryRecurringTitle.date, occurrenceDate: date, previous: calendarText(primaryTitle), next })
              } else save()
              return
            }
            const next = titleDraft.current
            titleDraft.current = null
            if (titleRepeats && next !== null && next !== titleValue) {
              onRenameTitle({ sourceDate: date, occurrenceDate: date, previous: calendarText(titleValue), next })
            } else save()
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || event.keyCode === 229) return
            if (event.key === 'Enter' || event.key === 'ArrowDown') {
              event.preventDefault()
              if (!visibleOwnTasks.length) change(date, { type: 'text', id: ownTasks[0].id, text: '', kind: 'event' }, false)
              focus(date, ownTasks[0].id); save()
            }
          }}
          className="min-h-6 w-full min-w-0 resize-none overflow-hidden rounded-sm bg-transparent py-0.5 leading-5 font-bold text-ink outline-none focus:bg-frame/20"
        />
        {hasCalendarText(primaryTitle) && <InfoButton label={`${calendarText(primaryTitle)} 일정 설정`} onClick={() => {
          save()
          onDetails({
            sourceDate: primaryRecurringTitle?.date ?? date,
            occurrenceDate: date,
            title: calendarText(primaryTitle),
            memo: primaryRecurringTitle?.note.titleMemo ?? note.titleMemo ?? '',
            repeat: primaryRecurringTitle?.note.titleRepeat ?? note.titleRepeat,
            endsAt: primaryRecurringTitle?.note.titleEndsAt ?? note.titleEndsAt,
          })
        }} />}
      </div>
      {remainingRecurringTitles.map((entry) => {
        const inheritedTitle = calendarTitleForDate(entry.note, date)
        return (
          <div key={entry.date} className="flex items-start gap-1 pl-6 text-xs leading-5 font-bold">
            <CalendarTextLine value={inheritedTitle} ariaLabel={`${date} 반복 중요 일정`}
              className="min-h-5 w-full min-w-0 resize-none overflow-hidden rounded-sm bg-transparent py-0 leading-5 font-bold text-ink outline-none focus:bg-frame/20"
              onChange={(text) => recurringTitleDrafts.current.set(entry.date, text)}
              onBlur={() => {
                const next = recurringTitleDrafts.current.get(entry.date)
                recurringTitleDrafts.current.delete(entry.date)
                if (next !== undefined && next !== inheritedTitle) {
                  onRenameTitle({ sourceDate: entry.date, occurrenceDate: date, previous: calendarText(inheritedTitle), next })
                } else save()
              }}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing || event.keyCode === 229) return
                if (event.key === 'Enter') { event.preventDefault(); save() }
              }}
            />
            <InfoButton label={`${calendarText(inheritedTitle)} 일정 설정`} onClick={() => onDetails({ sourceDate: entry.date, occurrenceDate: date, title: calendarText(inheritedTitle), memo: entry.note.titleMemo ?? '', repeat: entry.note.titleRepeat, endsAt: entry.note.titleEndsAt })} />
          </div>
        )
      })}
      <div className="mt-0.5">
        {rows.map(({ sourceDate, task }) => {
          const key = `${sourceDate}:${task.id}`
          const done = task.completedDates.includes(date)
          const taskText = calendarText(task.text)
          const kind = calendarTaskKind(task)
          const inheritedTask = sourceDate !== date
          return <div key={key} className="flex min-w-0 items-start gap-0.5">
            {kind === 'todo' ? (
              <label className="grid size-6 shrink-0 cursor-pointer place-items-center md:h-[22px] md:w-5">
                <input type="checkbox" aria-label={`${taskText || '빈 할 일'} 완료`} checked={done} disabled={!taskText.trim()}
                  onChange={(event) => { change(sourceDate, { type: 'complete', id: task.id, date, done: event.target.checked }); save() }}
                  className="size-[13px] cursor-pointer appearance-none rounded-[2px] border border-ink-faint/65 bg-transparent checked:border-ink-faint/65 checked:bg-transparent checked:after:block checked:after:text-center checked:after:text-[12px] checked:after:leading-[10px] checked:after:font-bold checked:after:text-today checked:after:content-['✓'] focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-default" />
              </label>
            ) : <span aria-hidden className="size-6 shrink-0 md:h-[22px] md:w-5" />}
            <div className="min-w-0 flex-1">
              <CalendarTextLine value={task.text} ariaLabel={`${date} 할 일 ${rows.findIndex((row) => row.task.id === task.id && row.sourceDate === sourceDate) + 1}`}
                placeholder={mobile && !hasCalendarText(task.text) ? '할 일' : ''}
                inputRef={(element) => { if (element) inputs.current.set(key, element); else inputs.current.delete(key) }}
                onChange={(text) => {
                  if (inheritedTask) inheritedTaskDrafts.current.set(key, text)
                  else change(sourceDate, { type: 'text', id: task.id, text, kind, afterId: note.tasks[note.tasks.findIndex((entry) => entry.id === task.id) - 1]?.id })
                }}
                onSlashCheckbox={() => {
                  if (inheritedTask) {
                    const id = replaceInheritedTask(key, sourceDate, task, '', 'todo')
                    if (id) focus(date, id)
                  } else {
                    change(sourceDate, { type: 'kind', id: task.id, kind: 'todo' }); save()
                  }
                }}
                onBlur={() => {
                  if (!inheritedTask) { save(); return }
                  const next = inheritedTaskDrafts.current.get(key)
                  if (next === undefined) { save(); return }
                  replaceInheritedTask(key, sourceDate, task, next, kind)
                }}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing || event.keyCode === 229) return
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    if (!toPlainText(event.currentTarget.innerHTML).trim()) return
                    const next = ownTasks[ownTasks.findIndex((entry) => entry.id === task.id) + 1]
                    if (sourceDate === date && next && !hasCalendarText(next.text)) { focus(date, next.id); return }
                    const id = crypto.randomUUID()
                    change(date, { type: 'text', id, text: '', kind, afterId: sourceDate === date ? task.id : ownTasks.at(-1)?.id }, false)
                    focus(date, id); save()
                  } else if (event.key === 'Backspace' && kind === 'todo' && isCaretAtStart(event.currentTarget)) {
                    event.preventDefault()
                    if (inheritedTask) {
                      const id = replaceInheritedTask(key, sourceDate, task, inlineValue(event.currentTarget), 'event')
                      if (id) focus(date, id)
                    } else {
                      change(sourceDate, { type: 'kind', id: task.id, kind: 'event' })
                      save()
                    }
                  } else if (event.key === 'Backspace' && !toPlainText(event.currentTarget.innerHTML) && sourceDate === date && ownTasks.length > 1) {
                    event.preventDefault()
                    const index = ownTasks.findIndex((entry) => entry.id === task.id)
                    change(date, { type: 'remove', id: task.id })
                    focus(date, ownTasks[Math.max(0, index - 1)].id); save()
                  }
                }}
                className={`block min-h-[22px] w-full min-w-0 resize-none overflow-hidden rounded-sm bg-transparent py-px leading-5 outline-none focus:bg-frame/20 ${kind === 'event' ? 'font-bold text-ink' : ''} ${done ? 'text-ink-faint line-through' : ''}`}
              />
            </div>
            {taskText.trim() && <InfoButton label={`${taskText} 일정 설정`} onClick={() => { save(); onDetails({ sourceDate, occurrenceDate: date, id: task.id, title: taskText, memo: task.memo ?? '', repeat: task.repeat, endsAt: task.endsAt }) }} />}
          </div>
        })}
      </div>
    </div>
  )
}
