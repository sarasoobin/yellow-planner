'use client'

import type { ReactNode } from 'react'
import { CalendarBoard } from '@/components/calendar-board'
import { CalendarDayEditor } from '@/components/calendar-day-editor'
import { PaperBlock } from '@/components/paper-block'
import type { Block } from '@/lib/blocks'
import { calendarOccurrences, calendarTitles, type CalendarSource } from '@/lib/calendar-reminders'
import { dayNumber } from '@/lib/dates'

/** 디자인 시안(JE_바름이5.pdf)을 따라 요일은 영문 소문자로 적는다 */
const WEEKDAY_EN = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export type WeekDay = {
  date: string
  isToday: boolean
  daily: Block
  task: Block
  /** 이 칸에만 할 일 안내 문구를 보인다 (week/[start]/page.tsx hintDate) */
  hint: boolean
}

/**
 * 주간 한 장.
 *
 * 달력에 적은 일정을 여기서도 그대로 고치고 옮긴다. 예전에는 달력 내용을
 * 한 줄로 비춰 보여주기만 해서, 요일 칸을 채우다 일정이 하나 생기면 월간으로
 * 돌아가야 했다.
 */
export function WeekBoard({ days, path, sources, children }: {
  days: WeekDay[]
  path: string
  sources: CalendarSource[]
  /** 주간 메모. 같은 테두리 안에 들어간다 */
  children: ReactNode
}) {
  return (
    <CalendarBoard sources={sources}>
      {({ controller, revision, onDetails, onRenameTitle }) => {
        // 안내 문구는 비어 있는 첫 칸에만. 일곱 칸에 다 깔면 회색 글씨로 뒤덮인다.
        const calendarHint = days.find((day) =>
          calendarTitles(controller.sources, day.date).length === 0 &&
          calendarOccurrences(controller.sources, day.date).length === 0)?.date

        return (
          <>
            {/*
              요일 칸의 세로줄이 아래 메모칸의 가로줄과 직교로 만나야 한다.
              그래서 둘을 같은 테두리 안에 넣고 사이에 여백을 두지 않는다.
            */}
            <div className="flex flex-1 flex-col border border-rule">
              <div className="grid flex-1 grid-cols-1 md:grid-cols-7">
                {days.map((day, i) => (
                  <section
                    key={day.date}
                    className={`flex min-w-0 flex-col border-b border-rule last:border-b-0 md:border-r md:border-b-0 md:last:border-r-0 ${
                      day.isToday ? 'bg-frame/25' : ''
                    }`}
                  >
                    {/* 요일 · 날짜 · 그 날 한 줄 — 시안의 머리 띠 */}
                    <div className="flex items-center gap-1.5 border-b border-rule px-1.5 py-1.5">
                      <span className={`shrink-0 text-[12px] tracking-wide ${i === 6 ? 'text-today' : 'text-ink-faint'}`}>
                        {WEEKDAY_EN[i]}
                      </span>
                      <span className={`grid size-[22px] shrink-0 place-items-center rounded-full text-[14px] leading-none font-bold ${
                        day.isToday ? 'bg-today text-paper' : 'text-ink'
                      }`}>
                        {dayNumber(day.date)}
                      </span>
                      <PaperBlock
                        kind="daily"
                        date={day.date}
                        path={path}
                        content={day.daily.content}
                        color={day.daily.color}
                        style={day.daily.style}
                        minRows={1}
                        lineHeight={20}
                        fontSize={13}
                        ruled={false}
                        className="min-w-0 flex-1"
                      />
                    </div>

                    <div className="flex flex-1 flex-col px-1.5 pt-1 pb-2">
                      {/* 달력 하루 칸을 그대로 작은 네모 안에 넣고, 아래는 주간 자유 할 일칸으로 둔다. */}
                      <div className="mb-1 rounded-sm border border-edge/80 bg-frame/15 px-1 py-0.5">
                        <p className="border-b border-rule/80 pb-0.5 text-[10px] tracking-wide text-ink-faint">달력 일정</p>
                        <CalendarDayEditor
                          key={`${day.date}-${revision}`}
                          date={day.date}
                          controller={controller}
                          onDetails={onDetails}
                          onRenameTitle={onRenameTitle}
                          leading={null}
                          hideDetails
                          hint={day.date === calendarHint}
                        />
                      </div>

                      <PaperBlock
                        kind="task"
                        date={day.date}
                        path={path}
                        content={day.task.content}
                        color={day.task.color}
                        style={day.task.style}
                        minRows={8}
                        placeholder={day.hint ? '할 일을 적어보세요' : undefined}
                        className="flex-1"
                      />
                    </div>
                  </section>
                ))}
              </div>

              {children}
            </div>
          </>
        )
      }}
    </CalendarBoard>
  )
}
