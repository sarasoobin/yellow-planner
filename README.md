# 正 PLANNER

**중요한 일정과 자잘한 할 일을 분리해 적는, 핑크빛 보라 테마의 웹 다이어리**

🔗 [yellow-planner.vercel.app](https://yellow-planner.vercel.app) · 첫 화면의 **데모 계정으로 둘러보기**로 가입 없이 사용해 볼 수 있습니다.

## 어떤 문제를 풀었나

보통의 캘린더는 시험·마감처럼 중요한 일정과 사소한 체크 항목을 한 목록에 섞습니다.
正 PLANNER는 쓰는 위치를 나눠 중요한 일을 먼저 보이게 합니다.

| 구분 | 적는 곳 | 예시 |
| --- | --- | --- |
| 중요한 일정 | 월간 달력 칸 | 시험, 약속, 마감 |
| 자잘한 할 일 | 주간 요일 칸 | 자료 준비, 강의 듣기 |

월간에 적은 중요 일정은 같은 주의 주간 페이지에도 나오고, 거기서 그대로 고칠 수 있습니다.

## 주요 기능

- **월간 일정 관리** — 날짜 옆에는 중요 일정을, 그 아래에는 추가 일정·할 일을 적습니다. 중요 일정에서 Enter를 치면 아래에 일정 한 줄이 새로 열리고, `/` 로 체크박스를 그립니다.
- **끌어서 옮기기** — 일정 왼쪽의 작은 손잡이를 끌어 순서를 바꾸거나 다른 날짜로 옮깁니다. 월간·주간 어디서나 되고, 손잡이에 초점을 두고 위/아래 화살표 키를 써도 됩니다.
- **일정 설정** — 일정 옆 `i` 아이콘에서 메모와 반복 주기·종료일을 설정합니다.
- **반복 일정** — 매일·매주·매월·매년 반복을 지원합니다. 반복 일정은 특정 날짜만 삭제하거나 전체를 삭제할 수 있습니다.
- **안전한 이름 변경** — 반복 일정의 이름을 바꾸면 선택한 날짜만 바꿀지 전체를 바꿀지 선택합니다. 취소하면 편집 전 제목으로 돌아갑니다.
- **종이에 쓰는 편집기** — `/` 메뉴로 체크박스·펜 색·굵게·밑줄·형광펜·글자 크기를 적용합니다.
- **보라 다이어리 테마** — 핑크빛 보라 표지, 월별 퍼플 인덱스, 나눔바른펜, 라벤더·오키드·로즈 형광펜을 사용합니다.
- **반응형 레이아웃** — 데스크톱은 오른쪽 세로 인덱스와 달력 칸 직접 편집을, 모바일은 위쪽 가로 인덱스와 날짜별 편집 영역을 제공합니다.
- **계정별 데이터 분리** — 이메일 로그인과 Supabase RLS로 각 사용자의 플래너 데이터만 읽고 쓸 수 있습니다.

## 사용 방법

1. 월간 달력에서 날짜를 골라 중요한 일정과 할 일을 적습니다.
2. 일정 옆 `i` 아이콘을 눌러 메모를 남기거나 반복을 설정합니다.
3. 반복 일정은 **이 날짜만 삭제** 또는 **반복 전체 삭제**를 선택할 수 있습니다.
4. 주간 페이지에서 그 주의 일정과 요일별 할 일을 함께 보고, 일정을 고치거나 다른 요일로 옮깁니다.

## 구조와 데이터 흐름

```mermaid
flowchart LR
  E["CalendarDayEditor / PaperBlock"]
  C["useCalendarNotes\n낙관적 화면 갱신"]
  A["Server Actions\nsaveCalendarChanges · saveBlock"]
  V["Zod 검증 · sanitize-html"]
  D[("Supabase PostgreSQL")]
  R{{"RLS: 본인 데이터만"}}

  E --> C --> A --> V --> D --> R
```

- 일정은 날짜별 `event` 항목의 `style.calendar` JSON에 제목·반복·메모·완료 여부를 함께 보관합니다.
- 저장은 항목 단위 변경을 최신 DB 값에 재적용하고, 동시 수정 충돌 시 재시도해 다른 탭의 변경을 덮어쓰지 않도록 합니다.
- 사용자 입력은 서버에서 Zod로 검증하고, 리치 텍스트는 저장 직전에 허용된 HTML만 남깁니다.
- RLS가 `auth.uid()` 기준으로 행 접근을 제한하므로 클라이언트가 다른 사용자의 `id`를 보내도 데이터를 수정할 수 없습니다.

## 기술 스택

| 구분 | 사용 기술 |
| --- | --- |
| 프레임워크 | Next.js 16.2, React 19, TypeScript |
| UI | Tailwind CSS 4, 나눔바른펜 웹폰트 |
| 백엔드 | Supabase PostgreSQL, Auth, RLS |
| 검증·보안 | Zod, sanitize-html |
| 날짜 | date-fns |
| 테스트 | Vitest |
| 배포 | Vercel — `main` 푸시 시 자동 배포 |

## 로컬 실행

```bash
git clone https://github.com/sarasoobin/yellow-planner.git
cd yellow-planner
npm install
```

`.env.local` 파일을 만들고 Supabase 프로젝트 값을 넣습니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 선택: 데모 계정
DEMO_EMAIL=demo@yellow-planner.app
DEMO_PASSWORD=...
```

Supabase SQL Editor에서 [`supabase/latest.sql`](supabase/latest.sql)을 실행한 뒤 개발 서버를 시작합니다.

```bash
npm run dev       # 개발 서버
npm run verify    # 린트 · 타입 검사 · 테스트 · 프로덕션 빌드
```

> `service_role` / Secret key는 RLS를 우회합니다. `.env.local`에만 보관하고 저장소에 커밋하지 마세요.

## 프로젝트 구조

```text
src/
├── app/                         페이지 · 레이아웃 · 전역 테마
├── components/
│   ├── calendar-day-editor.tsx  달력 일정·할 일 편집기
│   ├── calendar-repeat-dialog.tsx
│   ├── month-board.tsx          월간 달력과 반복 일정 제어
│   ├── paper-block.tsx          리치 텍스트 편집기
│   └── toolbar.tsx              형광펜·스티커 도구
├── lib/
│   ├── actions/                 인증·일정·항목 Server Actions
│   ├── calendar-reminders.ts    일정·반복·메모 도메인 모델
│   └── supabase/                브라우저·서버 클라이언트
└── proxy.ts                     세션 갱신과 보호 경로 처리

supabase/latest.sql              테이블 · 트리거 · RLS 정책
docs/                            기획 문서와 참고 자료
```

## 문서

| 문서 | 내용 |
| --- | --- |
| [PRODUCT.md](PRODUCT.md) | 제품 목표, 데이터 모델, 라우트 |
| [DESIGN.md](DESIGN.md) | 디자인 원칙과 레이아웃 |
| [PLAN.md](PLAN.md) | 개발 계획과 완료 기준 |
| [CHANGELOG.md](CHANGELOG.md) | 변경 이력 |
