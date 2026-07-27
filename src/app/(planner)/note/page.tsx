import { createClient } from '@/lib/supabase/server'
import { NoteEditor } from '@/components/note-editor'

export const metadata = {
  title: '메모 · 正 PLANNER',
}

export default async function FreeNotePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Free Note는 한 사람당 한 장이다 (schema.sql의 notes_free_uniq)
  const { data } = await supabase
    .from('notes')
    .select('content')
    .eq('kind', 'free')
    .is('week_start', null)
    .maybeSingle()

  return (
    <div className="flex flex-1 flex-col bg-paper px-4 py-4 md:px-8 md:py-6">
      <h1 className="mb-3 text-sm font-semibold tracking-[0.1em] text-ink">
        Free Note
      </h1>

      <NoteEditor
        initialContent={data?.content ?? ''}
        weekStart={null}
        path="/note"
        rows={18}
      />
    </div>
  )
}
