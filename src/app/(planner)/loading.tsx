/**
 * 노트 페이지가 열리는 동안 잠깐 보이는 뼈대 — 표지·월간·주간·메모 공통.
 *
 * 빙글빙글 도는 표시를 쓰지 않는다. 종이 노트를 넘기는 느낌이 목적인데
 * 로딩 스피너는 그 자리에서만 앱처럼 보인다. 대신 곧 나타날 화면과 같은
 * 자리에 옅은 줄을 깔아둔다. 글이 채워지는 순간 자리가 밀리지 않는다.
 *
 * 노트 껍데기(헤더·인덱스 탭)는 레이아웃에 있어 그대로 남는다.
 * 그래서 여기서는 종이 안쪽만 그린다.
 */
export default function Loading() {
  return (
    <div
      // 화면 낭독기에는 "불러오는 중"만 읽히면 된다. 뼈대는 읽을 내용이 아니다
      aria-busy="true"
      className="flex flex-1 flex-col bg-paper px-4 py-4 md:px-6 md:py-6"
    >
      <span className="sr-only">불러오는 중</span>

      <div aria-hidden className="animate-pulse">
        {/* 제목 자리 */}
        <div className="h-7 w-32 bg-rule/60" />

        {/* 괘선 — 실제 글줄과 같은 높이(--spacing-line)로 둔다 */}
        <div className="mt-6 space-y-line">
          {[88, 64, 76, 52, 70, 40].map((width) => (
            <div
              key={width}
              className="h-3 bg-rule/40"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
