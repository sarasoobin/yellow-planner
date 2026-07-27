import { createClient } from '@/lib/supabase/server'
import { PaperBlock } from '@/components/paper-block'
import { StickerLayer } from '@/components/sticker-layer'
import { TallyMark } from '@/components/tally-mark'
import { countChecked, toBlock } from '@/lib/blocks'
import { yearFirstDay } from '@/lib/dates'
import type { Item } from '@/lib/types'

export const metadata = {
  title: '표지 · 正 PLANNER',
}

export default async function CoverPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 미들웨어가 이미 막고 있지만, 서버 컴포넌트에서도 한 번 더 확인한다.
  if (!user) return null

  const year = new Date().getFullYear()
  const yearDate = yearFirstDay(year)

  // 올해 목표 칸과 이 페이지에 붙인 스티커를 한 번에 가져온다
  const { data } = await supabase
    .from('items')
    .select('*')
    .in('kind', ['year', 'sticker'])
    .eq('date', yearDate)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  const all = (data ?? []) as Item[]
  const block = toBlock(all.filter((i) => i.kind === 'year'))
  const stickers = all.filter((i) => i.kind === 'sticker')
  const doneCount = countChecked(block.content)

  return (
    // 가운데는 다른 페이지와 같은 종이색. 노란 표지는 바깥 프레임이 맡는다.
    <StickerLayer
      stickers={stickers}
      date={yearDate}
      path="/cover"
      className="flex flex-1 flex-col items-center justify-center bg-paper px-6 py-12"
    >
      <p className="text-6xl leading-none font-bold tracking-tight text-ink md:text-7xl">
        {year}
      </p>

      <div className="mt-12 w-full max-w-sm">
        <h1 className="mb-2 text-sm font-semibold tracking-[0.1em] text-ink">
          올해의 목표
        </h1>

        <PaperBlock
          kind="year"
          date={yearDate}
          path="/cover"
          content={block.content}
          color={block.color}
          style={block.style}
          minRows={8}
          placeholder="올해 이루고 싶은 걸 적어보세요"
        />

        {doneCount > 0 && (
          <div className="mt-10 flex justify-center">
            <TallyMark count={doneCount} />
          </div>
        )}
      </div>
    </StickerLayer>
  )
}
