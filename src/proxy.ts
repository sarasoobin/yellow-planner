import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Next.js 16부터 middleware.ts 대신 proxy.ts 를 쓴다.
 * 모든 요청이 페이지에 도달하기 전에 이 함수를 먼저 지나간다.
 */
export default async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * 아래를 제외한 모든 경로에서 실행:
     * - _next/static, _next/image : Next.js 내부 파일
     * - favicon.ico, 이미지 파일  : 정적 자원
     * 이걸 걸러주지 않으면 이미지 한 장 받을 때마다 세션 검사가 돌아 느려진다.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
