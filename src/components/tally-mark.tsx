/**
 * 正자 집계 — 완료 5개마다 正 한 글자 (PRODUCT.md §8, DESIGN.md §5-3).
 *
 * 글꼴의 正에는 "3획만 그린 상태"가 없어서 획을 직접 그린다.
 * 획 순서: 위 가로 → 가운데 세로 → 중간 가로 → 왼쪽 세로 → 아래 가로.
 */
const STROKES = [
  'M4 4 H20', // 一 위
  'M11 4 V20', // 丨 가운데
  'M11 12 H19', // 一 중간
  'M5 12 V20', // 丨 왼쪽
  'M4 20 H20', // 一 아래
]

/** 표시할 글자 수 상한. 넘으면 숫자로 줄인다. */
const MAX_GLYPHS = 20

function Glyph({ strokes }: { strokes: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-6 w-6 shrink-0 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      {STROKES.slice(0, strokes).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

export function TallyMark({
  count,
  label,
}: {
  count: number
  /** 글자 아래 문구. 기본은 "N개 완료" */
  label?: string
}) {
  if (count <= 0) return null

  const full = Math.floor(count / 5)
  const rest = count % 5
  const shown = Math.min(full, MAX_GLYPHS)
  const hidden = full - shown

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="flex flex-wrap items-center justify-center gap-1"
        role="img"
        aria-label={`${count}개 완료`}
      >
        {Array.from({ length: shown }, (_, i) => (
          <Glyph key={i} strokes={5} />
        ))}
        {hidden > 0 && (
          <span className="text-xs text-ink-faint">+{hidden}</span>
        )}
        {rest > 0 && <Glyph strokes={rest} />}
      </div>
      <p className="text-xs text-ink-faint">{label ?? `${count}개 완료`}</p>
    </div>
  )
}
