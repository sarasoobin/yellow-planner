import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/actions/auth'
import { IndexTabs } from '@/components/index-tabs'
import { RefreshOnFocus } from '@/components/refresh-on-focus'
import { Toolbar, ToolProvider } from '@/components/toolbar'

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
    // 도구는 헤더(고르는 곳)와 본문(적는 곳)이 함께 알아야 해서 둘을 같이 감싼다
    <ToolProvider>
      {/* 다른 기기에서 적은 것을 화면 다시 볼 때 가져온다 */}
      <RefreshOnFocus />

      {/*
        노트가 화면을 거의 채운다. 책상은 테두리처럼 조금만 남긴다.
        1024px로 묶어두면 노트북에서 책상만 넓고 정작 달력 칸이 작아진다.
        아주 넓은 화면에서 한 줄이 끝없이 길어지는 것만 막아 폭 상한을 둔다.
      */}
      <div className="min-h-dvh bg-desk px-2 py-3 md:px-5 md:py-6">
        <div className="mx-auto flex w-full max-w-[1500px] items-stretch">
          {/* 노트 본체 */}
          <div className="flex min-w-0 flex-1 flex-col border border-edge bg-frame shadow-notebook">
            <IndexTabs orientation="top" currentYear={currentYear} />

            <header className="flex items-center justify-between gap-3 px-4 py-3 md:px-5">
              <Link
                href="/cover"
                className="flex shrink-0 items-baseline gap-1.5 text-accent"
              >
                <span className="font-hand text-2xl leading-none">正</span>
                <span className="hidden text-sm font-semibold tracking-[0.14em] sm:inline">
                  PLANNER
                </span>
              </Link>

              {/* 필통 — 여기서 고른 도구로 다음에 적는 글이 저장된다 */}
              <Toolbar />

              <div className="flex shrink-0 items-center gap-3 text-xs text-ink-soft">
                <span className="hidden max-w-[16ch] truncate md:inline">
                  {user?.email}
                </span>
                <form action={signOut}>
                  <button className="cursor-pointer underline underline-offset-4 hover:text-accent">
                    로그아웃
                  </button>
                </form>
              </div>
            </header>

            {/*
              종이. 노란 프레임이 사방에 조금 남도록 안쪽에 여백을 둔다.
              표지·월간·주간의 높이가 같아야 페이지를 넘겨도 노트 크기가 안 흔들린다.
              배경색은 각 페이지가 정한다 (표지는 전체가 노란색이다).
            */}
            <div className="flex flex-1 flex-col px-2 pb-2 md:px-3 md:pb-3">
              {/*
                종이가 화면 높이를 채운다. 안쪽 여백·헤더·프레임을 뺀 만큼이다.
                내용이 더 길어지면 그만큼 늘어나고 페이지가 스크롤된다.
              */}
              <main className="flex min-h-[560px] flex-1 flex-col border border-rule md:min-h-[calc(100dvh-7rem)]">
                {children}
              </main>
            </div>
          </div>

          {/* 인덱스 탭 — 노트 오른쪽 바깥에 붙는다 */}
          <IndexTabs orientation="side" currentYear={currentYear} />
        </div>
      </div>
    </ToolProvider>
  )
}
