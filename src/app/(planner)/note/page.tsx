import { createClient } from '@/lib/supabase/server'
import { NoteEditor } from '@/components/note-editor'
import { StickerLayer } from '@/components/sticker-layer'
import { FREE_NOTE_ANCHOR, type Item } from '@/lib/types'

export const metadata = {
  title: '메모 · 正 PLANNER',
}

export default async function FreeNotePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Free Note는 한 사람당 한 장이다 (latest.sql 의 notes_free_uniq)
  const [{ data: note }, { data: stickerData }] = await Promise.all([
    supabase
      .from('notes')
      .select('content')
      .eq('kind', 'free')
      .is('week_start', null)
      .maybeSingle(),
    supabase
      .from('items')
      .select('*')
      .eq('kind', 'sticker')
      .eq('date', FREE_NOTE_ANCHOR)
      .order('created_at', { ascending: true }),
  ])

  return (
    <StickerLayer
      stickers={(stickerData ?? []) as Item[]}
      date={FREE_NOTE_ANCHOR}
      path="/note"
      className="flex flex-1 flex-col bg-paper px-4 py-4 md:px-8 md:py-6"
    >
      <h1 className="font-hand mb-2 text-3xl leading-none text-ink">
        Free Note
      </h1>

      <NoteEditor
        initialContent={note?.content ?? ''}
        weekStart={null}
        path="/note"
        rows={18}
      />
    </StickerLayer>
  )
}
