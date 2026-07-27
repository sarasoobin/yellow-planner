'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * 다른 기기에서 적은 것을 가져온다.
 *
 * 노트북에서 적고 폰을 켜면 폰은 아직 옛 화면을 들고 있다.
 * 실시간 연결을 열어두는 대신, 화면을 다시 볼 때만 서버에서 새로 받아온다.
 * 노트를 펼치는 순간 최신이면 충분하고, 연결을 계속 붙들지 않아 가볍다.
 */
export function RefreshOnFocus() {
  const router = useRouter()

  useEffect(() => {
    function refresh() {
      if (document.visibilityState !== 'visible') return

      // 적고 있는 중이면 건드리지 않는다.
      // 저장은 칸에서 손을 뗄 때 일어나므로, 지금 새로 받아오면 적던 글이 날아간다.
      const el = document.activeElement
      if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
        return
      }

      router.refresh()
    }

    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [router])

  return null
}
