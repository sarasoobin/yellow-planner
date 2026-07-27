# 正 PLANNER

**중요한 일정과 자잘한 할 일을 서로 다른 페이지에 적는 웹 다이어리**

🔗 **[yellow-planner.vercel.app](https://yellow-planner.vercel.app)** — 첫 화면의
**"데모 계정으로 둘러보기"** 를 누르면 가입 없이 채워진 노트를 볼 수 있습니다.

> 🚧 **개발 중 (Day 1/3)** — 현재 로그인과 표지 페이지가 동작합니다.
> 월간 · 주간 페이지는 Day 2에 추가됩니다. 진행 상황은 [CHANGELOG.md](CHANGELOG.md)를 참고하세요.

<!-- TODO(Day 3): 스크린샷 3장 — 표지 / 월간 / 주간 -->

---

## 왜 만들었나

기존 캘린더 앱은 **"중간고사"와 "목데이터 연결하기"를 같은 칸에 같은 크기로** 적습니다.
그러다 보니 정작 중요한 일정이 자잘한 할 일 사이에 묻혀서 눈에 안 들어옵니다.

正 PLANNER는 **적는 곳을 아예 분리**해서 이 문제를 풀었습니다.

| | 어디에 적나 | 무엇을 적나 |
|---|---|---|
| 🔴 **중요한 일정** | 월간 페이지의 달력 칸 | 시험, 마감일, 약속 |
| ⚪ **자잘한 할 일** | 주간 페이지의 요일 칸 | 목데이터 연결, 강의 듣기 |

주간 페이지 상단에는 그 날의 중요한 일정이 **색 띠**로 따라옵니다.
"오늘 뭐 하지"를 볼 때 "이번 주에 뭐가 걸려 있지"를 같이 보게 하려는 의도입니다.

종이 다이어리를 쓰는 감각을 그대로 옮겼습니다. 노란 노트 한 권,
오른쪽에 표지 · 1월~12월 · free note 인덱스 탭.

---

## 주요 기능

- **표지** — 올해의 목표와 달성률
- **월간 페이지** — 달력 칸을 눌러 그 자리에서 일정 입력
- **주간 페이지** — 월요일 시작 7일, 요일별 할 일 + 하단 메모
- **인덱스 탭** — 어느 페이지에서든 표지 · 1~12월 · free note로 바로 이동
- **正 카운터** — 완료한 항목 수를 정(正) 자 획으로 표시
- 이메일 회원가입 / 로그인, 계정별 데이터 완전 격리

---

## 기술적으로 신경 쓴 것

### 1. 데이터베이스가 직접 권한을 지킨다 (RLS)

앱 코드에서 `user_id`로 거르지 않습니다. **PostgreSQL의 Row Level Security**가
DB 레벨에서 본인 데이터만 오가도록 강제합니다.

```sql
create policy "본인 항목만" on public.items for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

앱 코드에 버그가 있어도 남의 데이터는 새어나가지 않습니다.
다른 사람의 id로 삭제를 시도하면 에러가 아니라 **0건 처리**로 끝납니다.

`(select auth.uid())`로 감싼 것은 행마다가 아니라 쿼리당 한 번만 평가시키기 위한 것입니다.

### 2. 테이블 하나로 네 개의 화면을 굴린다

표지 · 월간 왼쪽 칸 · 달력 칸 · 주간 요일 칸은 **"날짜에 묶인 짧은 글 + 체크"** 라는
같은 구조입니다. 테이블을 나누는 대신 `kind` 컬럼 하나로 구분했습니다.

| `kind` | 화면 | `date`에 저장하는 값 |
|---|---|---|
| `year` | 표지 | 그 해 1월 1일 |
| `month` | 월간 왼쪽 칸 | 그 달 1일 |
| `event` | 달력 칸 (중요 일정) | 실제 날짜 |
| `task` | 주간 요일 칸 (자잘한 할 일) | 실제 날짜 |

덕분에 CRUD 구현 한 벌(`ItemList` 컴포넌트 + Server Action 4개)이
세 페이지 전부를 담당합니다.

### 3. Next.js 16 기준으로 작성

- `middleware.ts`는 16에서 **deprecated**. `proxy.ts` 규약을 사용했습니다.
- `cookies()`, `params`, `searchParams`가 모두 async — 전부 `await` 처리.
- API 라우트 없이 **Server Actions**로 처리.

### 4. 인증에서 흘리지 않기

- 세션 검증은 `getSession()`이 아니라 **`getUser()`** — `getSession()`은 쿠키를 그대로 믿기 때문에 위조가 가능합니다.
- 로그인 실패 메시지를 일부러 뭉뚱그렸습니다. "비밀번호가 틀렸습니다"는 **그 이메일이 가입돼 있다는 사실**을 알려주는 셈이라 계정 목록을 캐낼 수 있습니다.
- `?next=` 파라미터는 내부 경로만 허용 — 외부 주소로 튕기는 오픈 리다이렉트 방지.

---

## 기술 스택

| 분류 | 사용 기술 |
|---|---|
| 프레임워크 | Next.js 16.2.12 (App Router, Turbopack) |
| UI | React 19.2.4, TypeScript 5, Tailwind CSS 4 |
| 백엔드 | Supabase (PostgreSQL + Auth), `@supabase/ssr` |
| 검증 | Zod 4 |
| 날짜 | date-fns 4 |
| 배포 | Vercel (main 브랜치 push 시 자동 배포) |

---

## 로컬에서 실행하기

```bash
git clone https://github.com/sarasoobin/yellow-planner.git
cd yellow-planner
npm install
```

`.env.local` 파일을 만들고 아래 값을 채웁니다.
값은 [Supabase 대시보드](https://supabase.com/dashboard) → Settings → API keys에서 확인할 수 있습니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://<프로젝트-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 데모 계정 (선택) — 없으면 "둘러보기" 버튼만 안내 문구를 띄웁니다
DEMO_EMAIL=demo@yellow-planner.app
DEMO_PASSWORD=...
```

> `service_role` / Secret key는 **RLS를 무시**합니다. 절대 코드나 `.env`에 넣지 마세요.
> `DEMO_PASSWORD` 에 `NEXT_PUBLIC_` 을 붙이면 브라우저 번들에 그대로 박혀 나갑니다.
> 데모 로그인은 서버 액션 안에서만 일어납니다.

Supabase SQL Editor에서 [`supabase/latest.sql`](supabase/latest.sql)을 실행해 테이블과 정책을 만든 뒤:

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

---

## 프로젝트 구조

```
src/
├── proxy.ts                  모든 요청을 통과시키는 인증 문지기
├── lib/
│   ├── types.ts              Item 타입
│   ├── supabase/             브라우저 / 서버 / 세션 갱신 클라이언트
│   └── actions/              Server Actions (auth, items)
├── components/
│   └── item-list.tsx         재사용 CRUD 컴포넌트 (표지·월간·주간 공용)
└── app/
    ├── login/                로그인 · 회원가입
    ├── cover/                표지
    ├── month/[ym]/           월간 페이지
    └── week/[start]/         주간 페이지

supabase/schema.sql           테이블 · 트리거 · RLS 정책
```

---

## 기획 문서

| 문서 | 내용 |
|---|---|
| [PRODUCT.md](PRODUCT.md) | 무엇을 왜 만드는가, 데이터 모델, 라우트 |
| [DESIGN.md](DESIGN.md) | 컬러 · 타이포 · 레이아웃 · 반응형 규칙 |
| [PLAN.md](PLAN.md) | 3일 개발 계획과 완료 기준 |
| [CHANGELOG.md](CHANGELOG.md) | 버전별 변경 이력 |

---

## 알려진 사항

`npm audit`에 고위험 항목이 보고되지만 **의도적으로 두었습니다.**
전부 `eslint` / `postcss` / `sharp` 등 **빌드·개발 단계에서만 쓰이는 의존성**이며
런타임에 포함되지 않습니다. `npm audit fix --force`는 Next.js를 9.3.3으로
다운그레이드하기 때문에 실행하지 않았습니다.
