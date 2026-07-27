import { HIGHLIGHT, stickerSrc } from '@/lib/stickers'
import { SIZES, type Item, type ItemStyle } from '@/lib/types'

/**
 * 적힌 한 줄을 그대로 보여준다 — 펜 색, 굵게, 기울임, 형광펜, 스티커.
 * 체크리스트·달력 칸·주간 칸이 모두 이걸 쓴다.
 */

/** 다 한 줄은 흐려지지 않는다. 종이에서는 빨간 줄을 그을 뿐이다. */
const STRIKE = {
  textDecorationLine: 'line-through',
  textDecorationColor: '#C1453C',
  textDecorationThickness: '2px',
} as const

export function writtenStyle(
  color: string | null,
  style: ItemStyle | null,
  isDone: boolean,
): React.CSSProperties {
  return {
    color: color ?? undefined,
    fontWeight: style?.bold ? 700 : undefined,
    fontStyle: style?.italic ? 'italic' : undefined,
    backgroundColor: style?.highlight ? HIGHLIGHT : undefined,
    // 크기를 안 정했으면 그 자리의 기본 크기를 그대로 쓴다
    fontSize: style?.size ? `${SIZES[style.size]}px` : undefined,
    ...(isDone ? STRIKE : null),
  }
}

export function Sticker({ name }: { name: string | null | undefined }) {
  const src = stickerSrc(name)
  if (!src) return null
  // public/stickers 의 SVG 파일. 크기가 작고 개수도 적어 최적화가 필요 없다.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" aria-hidden className="size-4 shrink-0" />
}

/** 빨간 색연필로 그은 듯한 체크. 네모 밖으로 살짝 넘치게 그린다. */
export function CheckMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      className="pointer-events-none absolute -top-[7px] -left-[5px] size-[23px]"
    >
      <path
        d="M3.2 12.8c2.1 1.4 4 3.8 5.6 6.9C11.6 12 15.6 6.2 21 2.6"
        stroke="#C1453C"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 스티커 + 글자를 한 덩어리로 */
export function Written({
  item,
  className = '',
}: {
  item: Pick<Item, 'content' | 'color' | 'style' | 'is_done'>
  className?: string
}) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1 ${className}`}>
      <Sticker name={item.style?.sticker} />
      <span
        className="truncate"
        style={writtenStyle(item.color, item.style, item.is_done)}
      >
        {item.content}
      </span>
    </span>
  )
}
