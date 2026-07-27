import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/actions/auth'
import { IndexTabs } from '@/components/index-tabs'

/**
 * 노트 껍데기. 표지·월간·주간·메모가 전부 이 안에 들어간다.
 *
 * (planner)는 라우트 그룹이라 주소에는 나타나지 않는다.
 * 폴더로 묶어서 레이아웃만 공유하고, /cover · /month/... 주소는 그대로 유지한다.
 */
export default async function PlannerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const currentYear = new Date().getFullYear()

  return (
    <div className="min-h-full bg-desk px-3 py-4 md:px-6 md:py-10">
      <div className="mx-auto flex w-full max-w-5xl items-stretch">
        {/* 노트 본체 */}
        <div className="flex min-w-0 flex-1 flex-col border border-edge bg-frame shadow-notebook">
          <IndexTabs orientation="top" currentYear={currentYear} />

          <header className="flex items-center justify-between gap-3 px-4 py-3 md:px-5">
            <Link
              href="/cover"
              className="flex items-baseline gap-1.5 text-accent"
            >
              <span className="text-xl leading-none font-bold">正</span>
              <span className="text-sm font-semibold tracking-[0.14em]">
                PLANNER
              </span>
            </Link>

            <div className="flex items-center gap-3 text-xs text-ink-soft">
              <span className="hidden max-w-[16ch] truncate sm:inline">
                {user?.email}
              </span>
              <form action={signOut}>
                <button className="cursor-pointer underline underline-offset-4 hover:text-accent">
                  로그아웃
                </button>
              </form>
            </div>
          </header>

          {/* 종이. 노란 프레임이 사방에 조금 남도록 안쪽에 여백을 둔다. */}
          <div className="flex flex-1 flex-col px-2 pb-2 md:px-3 md:pb-3">
            <main className="flex-1 border border-rule bg-paper">
              {children}
            </main>
          </div>
        </div>

        {/* 인덱스 탭 — 노트 오른쪽 바깥에 붙는다 */}
        <IndexTabs orientation="side" currentYear={currentYear} />
      </div>
    </div>
  )
}
