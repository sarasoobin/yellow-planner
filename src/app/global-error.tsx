'use client'

/**
 * 최후의 화면 — 루트 레이아웃 자체가 터졌을 때.
 *
 * 이 파일은 레이아웃을 대신하므로 html·body 를 직접 그린다.
 * globals.css 가 실리지 않아 Tailwind 클래스도, --color-* 토큰도 여기선 없다.
 * 그래서 색을 값으로 직접 적는다. globals.css 의 다음 토큰과 같은 값이다.
 *
 *   #f4f2ed  --color-desk   #fffdf4  --color-paper
 *   #5a5145  --color-ink-soft   #8b6f3d  --color-accent
 *
 * 표지색을 바꿀 때 같이 봐야 하는 세 곳 중 하나다 (DESIGN.md §2).
 * 나머지는 manifest.ts 와 layout.tsx 의 themeColor.
 *
 * 손글씨 폰트도 없다. 여기까지 왔다는 건 폰트 로딩을 포함해 아무것도
 * 못 믿는 상황이라는 뜻이라, 시스템 글꼴로 글자만 확실히 보이게 한다.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
          background: '#f4f2ed',
          color: '#5a5145',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Malgun Gothic", "Apple SD Gothic Neo", system-ui, sans-serif',
        }}
      >
        {/* 여기서는 metadata 를 못 쓴다. 제목은 React 로 직접 넣는다 */}
        <title>正 PLANNER</title>

        <p style={{ margin: 0, fontSize: '40px', color: '#8b6f3d' }}>正</p>

        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.7 }}>
          앱을 여는 데 실패했습니다.
          <br />
          새로고침해도 같으면 잠시 뒤에 다시 들어와주세요.
        </p>

        <button
          type="button"
          onClick={() => unstable_retry()}
          style={{
            marginTop: '8px',
            cursor: 'pointer',
            border: '1px solid #8b6f3d',
            background: '#fffdf4',
            color: '#8b6f3d',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'inherit',
          }}
        >
          다시 시도
        </button>

        {error.digest && (
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#5a5145' }}>
            오류 표식 {error.digest}
          </p>
        )}
      </body>
    </html>
  )
}
