import type { MetadataRoute } from 'next'

/**
 * 홈 화면에 추가했을 때 쓰이는 정보.
 *
 * 아이콘은 `npm run icons` 로 만든다 (원본은 src/app/icon.svg).
 *
 * maskable 이 따로 있는 이유 — 안드로이드는 아이콘을 동그라미나 둥근 네모로
 * 제 마음대로 잘라낸다. 잘려도 되는 여백을 넉넉히 둔 판을 따로 준다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '正 PLANNER',
    short_name: '正',
    description:
      '중요한 일정과 자잘한 할 일을 서로 다른 페이지에 적는 웹 다이어리',
    lang: 'ko',
    start_url: '/',
    display: 'standalone',
    // 노트 바깥 책상색 (--color-desk). 앱이 뜨는 동안 잠깐 보이는 바탕
    background_color: '#f7f1f7',
    // 표지색 (--color-frame). 주소창·상태바가 이 색으로 물든다
    theme_color: '#edc3e8',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icon-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
