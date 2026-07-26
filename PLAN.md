# 스터디 플래너 — 3일 완성 개발 계획서

> 작성일: 2026-07-26
> 목표: **웹 플래너**를 3일 안에 만들고 Vercel에 배포한다.
> 원칙: **매일 밤 배포 가능한 상태로 끝낸다.** (Day 1이 끝나면 이미 인터넷에 접속 가능한 URL이 존재)

---

## 0. 이 문서의 전제

- **기획(무엇을 만들지)과 디자인(어떻게 보일지)은 사용자 본인이 직접 결정한다.**
  → 이 계획서는 그 결정을 **언제, 어떤 형식으로 내려야 하는지**까지 포함한다. (§3 Day 0)
- **엔지니어링(인증·DB·배포·상태관리·성능)은 기획과 무관하게 미리 확정한다.**
  → 그래서 기획이 아직 안 끝나도 Day 1 오전 작업은 바로 시작할 수 있다.
- 데이터 저장: **Supabase (Auth + Postgres + RLS)** — 포트폴리오에서 "백엔드/인증/보안까지 다뤘다"는 근거가 되는 선택.

### ⚠️ 시작 전 1분 작업
현재 폴더명이 `palnner`(오타)입니다. 로컬 폴더는 그대로 둬도 되지만
**GitHub 레포 이름과 Vercel 프로젝트 이름은 반드시 `planner` 또는 제품명으로** 만드세요.
포트폴리오 URL에 오타가 박히면 그 자체가 감점 요소입니다.

---

## 1. 성공 기준 (Definition of Done)

3일 뒤 아래가 **전부** 참이어야 "완성"으로 인정한다.

| # | 기준 | 검증 방법 |
|---|---|---|
| 1 | 공개 URL로 접속 가능 | 시크릿 창에서 `https://<프로젝트>.vercel.app` 열기 |
| 2 | 회원가입 → 로그인 → 데이터 생성 → 로그아웃 → 재로그인 시 데이터 유지 | 실제 신규 계정으로 1회 완주 |
| 3 | 다른 계정의 데이터가 절대 보이지 않음 | 계정 A/B 두 개로 교차 확인 (RLS 검증) |
| 4 | 모바일(375px)에서 레이아웃 깨짐 없음 | 크롬 개발자도구 iPhone SE 프리셋 |
| 5 | 빈 상태 / 로딩 / 에러 화면이 모두 존재 | 데이터 0개 계정으로 전 화면 순회 |
| 6 | README에 스크린샷·기술선택 이유·아키텍처 포함 | GitHub 레포 첫 화면에서 3초 안에 "뭐 하는 앱인지" 파악 가능 |
| 7 | 데모 계정으로 로그인하면 이미 데이터가 채워져 있음 | 심사자가 회원가입 없이 바로 구경 가능 |
| 8 | `npm run build` 에러/경고 0 | 로컬 + Vercel 빌드 로그 |

> 7번이 포트폴리오에서 체감 점수를 가장 많이 올립니다. **데모 계정 없는 로그인 앱은 아무도 안 봅니다.**

---

## 2. 기술 스택 (확정 — 더 고민하지 말 것)

| 영역 | 선택 | 버전(2026-07 기준 최신) | 선택 이유 |
|---|---|---|---|
| 프레임워크 | Next.js (App Router) | 16.2.x | Vercel 배포가 무설정, Server Actions로 API 라우트 작성 생략 |
| 언어 | TypeScript | 5.x | 포폴에서 타입 안정성은 기본 기대치 |
| UI 라이브러리 | React | 19.2.x | Next 16 기본 |
| 스타일 | Tailwind CSS | 4.3.x | 디자인을 직접 할 것이므로 유틸리티 방식이 가장 빠름 |
| 컴포넌트 | shadcn/ui | latest | 복붙 소유 방식이라 디자인 커스텀 자유도 높음 |
| 백엔드/DB/인증 | Supabase (`@supabase/supabase-js` 2.110.x + `@supabase/ssr` 0.12.x) | — | 무료 티어, Postgres + Auth + RLS를 한 번에 |
| 차트 | Recharts | 3.10.x | 통계 화면용. 설정 최소 |
| 날짜 | date-fns | 4.4.x | 주간/월간 집계 계산 |
| 검증 | Zod | 4.4.x | Server Action 입력 검증 |
| 클라이언트 상태 | React 내장(useState/useOptimistic) | — | 전역 상태 라이브러리는 **넣지 않는다**. 3일짜리에 과설계 |
| 배포 | Vercel | — | GitHub push → 자동 배포 |

**의도적으로 쓰지 않는 것:** Redux/Zustand, Prisma(Supabase 클라이언트로 충분), 테스트 프레임워크(3일 안엔 시간 대비 효용 낮음 — 대신 README에 "다음 단계"로 명시), Docker, 커스텀 백엔드 서버.

### Next.js 16 주의사항 (실수 방지)
- `cookies()`, `headers()`, `params`, `searchParams`는 **전부 async** → `await` 필수
- Supabase 세션 갱신은 `middleware.ts`에서 처리 (`@supabase/ssr` 공식 패턴 그대로 복사)
- 서버 컴포넌트용 / 클라이언트 컴포넌트용 Supabase 클라이언트를 **파일 분리** (`lib/supabase/server.ts`, `lib/supabase/client.ts`)

---

## 3. Day 0 — 기획·디자인 결정 세션 (**사용자 담당 / 2~3시간**)

> 개발 시작 **전날 밤**에 끝낸다. 이게 안 끝나면 Day 1 오후부터 반드시 막힌다.
> 결과물은 레포 루트에 `PRODUCT.md`, `DESIGN.md` 두 파일로 남긴다. (이것도 포트폴리오 자산이 된다)

### 3-1. `PRODUCT.md` — 기획 결정서 템플릿

아래 항목을 **전부 한 줄씩이라도** 채운다. 빈칸이 남으면 그 부분은 Day 2에 반드시 재작업이 발생한다.

```markdown
# 제품 정의

## 1. 한 줄 정의
"( 누구 )를 위한 ( 무엇 )을 해주는 플래너"
예) 시험기간 이대생을 위해, 과목별 순공부시간을 자동으로 집계해주는 플래너

## 2. 타겟 사용자 & 핵심 시나리오 (3문장)
- 사용자는 아침에 앱을 열고 ___을 한다
- 공부 중에는 ___을 한다
- 하루가 끝나면 ___을 보며 만족감을 느낀다

## 3. 기능 우선순위 (MoSCoW)
- MUST (이거 없으면 제품이 아님, 최대 3개)
  1.
  2.
  3.
- SHOULD (있으면 좋음, Day 2에 시도)
  1.
  2.
- WON'T (이번엔 절대 안 함 — 명시적으로 버린다)
  - 예: 친구 기능, 알림, 이미지 업로드, 공유 링크

## 4. 화면 목록 (라우트)
| 경로 | 화면 이름 | 이 화면의 목적 한 줄 |
|---|---|---|
| /            | 랜딩       | |
| /login       | 로그인     | |
| /dashboard   | 오늘       | |
| /stats       | 통계       | |
| /settings    | 설정       | |

## 5. 데이터 모델 초안 (엔티티와 필드를 한글로 나열)
- 예) 과목: 이름, 색상
- 예) 할일: 제목, 과목, 목표시간, 완료여부, 날짜
- 예) 공부기록: 과목, 시작시각, 종료시각

## 6. 통계 화면에서 보여줄 지표 3개
1.
2.
3.

## 7. "이 앱을 30초 안에 설명하는 문장" (README 첫 줄에 그대로 들어감)
```

### 3-2. `DESIGN.md` — 디자인 결정서 템플릿

```markdown
# 디자인 시스템

## 1. 무드 / 레퍼런스
- 참고 서비스 3개와 "무엇을 가져올지" 한 줄씩
- 형용사 3개 (예: 차분한 / 밀도 높은 / 학습에 방해되지 않는)

## 2. 컬러 (Tailwind 커스텀 토큰으로 등록)
- Primary:      #
- Background:   # (light) / # (dark)
- Surface/Card: #
- Text:         강조 # / 본문 # / 보조 #
- Semantic:     성공 # / 경고 # / 위험 #
- 다크모드 지원: [ ] 예 (Day 3) / [ ] 아니오 ← 지금 결정

## 3. 타이포그래피
- 본문 폰트: (Pretendard 권장 — 한글 가독성 + next/font 로컬 로딩)
- 숫자 폰트: (통계/타이머용 tabular-nums 여부)
- 스케일: 12 / 14 / 16 / 20 / 24 / 32

## 4. 스페이싱 & 형태
- 기본 간격 단위: 4px 배수
- 카드 라운드: (예: rounded-xl)
- 그림자: (예: 그림자 대신 1px border로 통일)

## 5. 레이아웃
- 데스크톱: 사이드바 / 상단탭 / 단일 컬럼 중 택 1 →
- 모바일: 하단 탭바 여부 →
- 최대 콘텐츠 폭: (예: 1120px)

## 6. 핵심 화면 손그림 (사진 찍어서 /docs 에 넣기)
- [ ] 대시보드
- [ ] 통계
```

### 3-3. 결정 잠금 규칙 (제일 중요)
- **Day 1 오전 9시 이후 `PRODUCT.md`의 MUST 항목은 변경 금지.**
  바꾸고 싶으면 `SHOULD`에 적고 Day 2에 처리한다.
- 색/폰트 같은 시각 요소는 Day 3에 몰아서 바꾼다. Day 1~2엔 회색 톤 기본값으로 두고 **기능만 만든다.**
- 이 규칙 하나가 3일 완성 여부를 가른다. 3일 프로젝트가 망하는 유일한 이유는 "만들면서 기획이 바뀌는 것"이다.

---

## 4. Day 1 — 뼈대 · 인증 · CRUD · **첫 배포** (8시간)

> 오늘의 목표: **못생겼지만 실제로 동작하고 인터넷에 떠 있는 앱**

| 시간 | 작업 | 완료 판정 |
|---|---|---|
| 0:00–0:40 | 프로젝트 생성: `npx create-next-app@latest` (TS, Tailwind, App Router, src 디렉터리) → GitHub 레포 생성 & 첫 push | GitHub에 코드 보임 |
| 0:40–1:10 | **Vercel 연결 먼저 하기.** 기본 화면 상태로 배포 성공시킨다 | `https://…vercel.app`에서 Next 기본 페이지 확인 |
| 1:10–1:50 | Supabase 프로젝트 생성 → 환경변수 3종을 `.env.local` + Vercel 양쪽에 등록 | 로컬/배포 모두 환경변수 존재 |
| 1:50–3:00 | DB 스키마 + RLS 적용 (§8 SQL 실행) | Supabase Table Editor에서 테이블 4개, 각 테이블 RLS "Enabled" |
| 3:00–4:30 | 인증: `@supabase/ssr` 세팅, `middleware.ts`, 로그인/회원가입 페이지, 로그아웃, 보호 라우트 | 로그인 안 하면 `/dashboard` 접근 시 `/login`으로 리다이렉트 |
| — | **점심** | |
| 4:30–6:30 | MUST 기능 1번의 CRUD를 Server Actions로 구현 (생성/조회/수정/삭제) | 새로고침해도 데이터 유지 |
| 6:30–7:20 | 최소 레이아웃: 헤더 + 네비 + 콘텐츠 영역 (디자인 X, 구조만) | 모든 라우트가 같은 셸 안에서 렌더 |
| 7:20–8:00 | 배포 & 실제 폰으로 접속 확인 & 오늘 커밋 정리 | 폰에서 로그인 → 데이터 생성 성공 |

**Day 1 체크포인트 (여기 통과 못 하면 Day 2 계획을 축소한다)**
- [ ] 배포 URL에서 회원가입이 된다
- [ ] 계정 A로 만든 데이터가 계정 B에서 안 보인다
- [ ] 커밋이 5개 이상 (커밋 히스토리도 평가 대상)

---

## 5. Day 2 — 핵심 기능 심화 + 통계 (8시간)

> 오늘의 목표: **"이 앱만의 것"을 만든다.** CRUD만 있는 앱은 포트폴리오에서 전부 똑같아 보인다.

| 시간 | 작업 | 비고 |
|---|---|---|
| 0:00–0:30 | Day 1 잔여 버그 정리 | 30분 넘으면 잘라내고 진행 |
| 0:30–2:30 | **MUST 기능 2번** 구현 | 기획서에 따라 달라짐 (타이머 / 시간블록 / 체크리스트 등) |
| 2:30–4:00 | **MUST 기능 3번** 구현 | |
| — | **점심** | |
| 4:00–5:00 | 낙관적 업데이트(`useOptimistic`) 적용 — 체크/삭제가 즉시 반응 | 체감 성능이 확 올라가는 구간. 면접 얘깃거리도 됨 |
| 5:00–6:30 | 통계 페이지: 주간 집계 쿼리 + Recharts 차트 2개 | §3-1의 지표 3개 기준 |
| 6:30–7:30 | 빈 상태 / 로딩 스켈레톤 / 에러 바운더리 (`loading.tsx`, `error.tsx`, `not-found.tsx`) | DoD 5번 |
| 7:30–8:00 | 배포 + 데모 계정 생성 & 시드 데이터 입력 | |

**타임박스 규칙:** 한 기능이 예상의 1.5배를 넘기면 **즉시 SHOULD로 강등하고 다음으로 넘어간다.** 미완성 기능을 배포에 남기지 말 것(주석 처리보다 브랜치 분리).

---

## 6. Day 3 — 디자인 마감 · 품질 · 포트폴리오 자산 (8시간)

> 오늘의 목표: **심사자가 3초 만에 "잘 만들었네"라고 느끼게 만든다.**

| 시간 | 작업 | 비고 |
|---|---|---|
| 0:00–1:00 | 디자인 토큰 반영: `globals.css`에 Tailwind v4 `@theme`으로 색·폰트·라운드 등록 | `DESIGN.md` 그대로 옮기기 |
| 1:00–3:00 | 전 화면 디자인 적용 (사용자 직접 작업 구간) | 여백/정렬/타이포 위계부터. 장식은 마지막 |
| 3:00–3:40 | 반응형: 375 / 768 / 1280 세 지점 점검 | 가로 스크롤 발생 0 |
| 3:40–4:10 | 다크모드 (DESIGN.md에서 "예"인 경우만) | 아니면 이 시간은 4번 항목에 합침 |
| — | **점심** | |
| 4:10–5:00 | 랜딩 페이지 `/` 마감 — 헤드라인 + 스크린샷 + "데모 계정으로 둘러보기" 버튼 | 데모 버튼은 클릭 즉시 로그인되게 |
| 5:00–5:40 | 품질 패스: `npm run build` 경고 제거, 이미지 `next/image`, 메타데이터/OG 태그, 파비콘 | 링크 공유 시 카드 미리보기 나오게 |
| 5:40–6:10 | 접근성 최소치: 버튼 `aria-label`, 폼 `label` 연결, 포커스 링 유지, 대비 4.5:1 | Lighthouse 접근성 90+ |
| 6:10–7:20 | **README 작성** (§9 구성 그대로) + 스크린샷 3~4장 + 시연 GIF 1개 | 가장 배점 높은 1시간 |
| 7:20–8:00 | 최종 점검: §1 DoD 8개 전부 체크, 시크릿 창 완주 테스트, 최종 배포 | |

---

## 7. 역할 분담

| 영역 | 담당 |
|---|---|
| 제품 정의, 기능 우선순위, 화면 구성, 카피 | **사용자** (Day 0, `PRODUCT.md`) |
| 컬러·타이포·레이아웃·무드, 최종 시각 마감 | **사용자** (Day 0 결정 + Day 3 적용) |
| 프로젝트 스캐폴딩, Supabase 스키마/RLS, 인증 배선 | Claude Code |
| Server Actions, 데이터 페칭, 낙관적 업데이트, 차트 연결 | Claude Code (사용자 리뷰) |
| 배포 파이프라인, 환경변수, 빌드 오류 해결 | Claude Code |
| README 초안, 기술 선택 근거 정리 | Claude Code → 사용자가 자기 말로 다듬기 |

> 면접에서 설명해야 하므로, **AI가 쓴 코드라도 "왜 이렇게 했는지"는 사용자가 말할 수 있어야 한다.** 각 Day 종료 시 15분씩 코드 리뷰 시간을 갖는다.

---

## 8. 데이터 모델 & RLS 초안 (SQL)

> `PRODUCT.md` §5를 확정한 뒤 테이블/컬럼명을 조정한다. 아래는 "학습 플래너" 계열에 두루 맞는 뼈대.
> Supabase 대시보드 → SQL Editor에 그대로 붙여넣어 실행.

```sql
-- 1) 프로필 (auth.users 확장)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- 회원가입 시 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) 과목/카테고리
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#64748b',
  created_at timestamptz not null default now()
);

-- 3) 할 일
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  due_date date not null default current_date,
  target_minutes int not null default 0,
  is_done boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 4) 공부 세션 기록 (통계의 원천)
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds int not null default 0,
  memo text
);

-- 조회 성능
create index on public.tasks (user_id, due_date);
create index on public.study_sessions (user_id, started_at desc);

-- 5) RLS: 전 테이블 활성화 + "내 것만" 정책
alter table public.profiles        enable row level security;
alter table public.subjects        enable row level security;
alter table public.tasks           enable row level security;
alter table public.study_sessions  enable row level security;

create policy "own profile" on public.profiles
  for all using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "own subjects" on public.subjects
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own tasks" on public.tasks
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own sessions" on public.study_sessions
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
```

**RLS 검증(Day 1 필수):** 계정 두 개를 만들고 서로의 데이터가 안 보이는지 직접 확인한다.
README에 "RLS로 행 단위 접근제어를 걸었다"고 쓰려면 실제로 검증했어야 한다.

---

## 9. 환경 변수 & 배포 체크리스트

`.env.local` (그리고 Vercel → Settings → Environment Variables에 동일하게):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=https://<프로젝트>.vercel.app
```

- [ ] `.env.local`이 `.gitignore`에 포함되어 있는지 확인 (**키 커밋은 치명적 감점**)
- [ ] `service_role` 키는 절대 클라이언트 코드/`NEXT_PUBLIC_`에 넣지 않는다
- [ ] Supabase → Authentication → URL Configuration에 Vercel 도메인 등록 (Site URL + Redirect URLs). 안 하면 배포 환경에서 로그인 콜백이 깨진다
- [ ] Vercel 프로덕션 도메인 확정 후 `NEXT_PUBLIC_SITE_URL` 갱신 → 재배포
- [ ] 데모 계정(`demo@example.com`) 생성 + 시드 데이터 입력 + README에 계정/비번 명시

### README 구성 (Day 3에 이 순서 그대로)
1. 프로젝트명 + 한 줄 설명 + **배포 링크** + **데모 계정**
2. 대표 스크린샷 1장 (또는 시연 GIF)
3. 만든 이유 / 해결하려는 문제 (2~3문장)
4. 주요 기능 3~5개 (각 1줄 + 스크린샷)
5. 기술 스택 & **선택 이유** (표) ← 여기서 변별력이 갈린다
6. 아키텍처 한 장 (요청 흐름: 브라우저 → Server Action → Supabase, RLS 위치 표시)
7. 기술적으로 고민한 점 2~3개 (예: RLS로 인가를 DB 계층에 둔 이유, 낙관적 업데이트로 체감 지연 제거)
8. 로컬 실행 방법
9. 다음 단계 (테스트 코드, 오프라인 지원, 알림 등 — "알지만 시간상 안 했다"를 보여주는 항목)

---

## 10. 리스크 & 컷 라인

| 리스크 | 신호 | 대응 |
|---|---|---|
| 기획이 계속 흔들림 | Day 1 오후에 "이 기능 말고…" 생각이 듦 | `PRODUCT.md` 잠금 규칙 적용. SHOULD로 적어두고 진행 |
| 인증 배선에서 반나절 소모 | Day 1 4시간차에 로그인 미완성 | `@supabase/ssr` 공식 예제를 **그대로** 복사. 커스텀 시도 금지 |
| 디자인 완벽주의 | Day 3 3시간차에 아직 대시보드만 만짐 | 화면당 40분 타임박스. 여백·정렬만 맞춰도 80점 |
| 배포에서 처음 터짐 | Day 3 저녁에 첫 배포 시도 | **Day 1 1시간차에 배포부터 한다.** 이 계획의 핵심 |
| 기능 욕심 | MUST가 4개 이상 | MUST는 3개. 4번째는 무조건 SHOULD |

**전체 컷 라인:** Day 3 저녁 6시에 미완성인 것은 **모두 잘라낸다.** 미완성 흔적이 남은 앱보다, 기능은 적지만 매끄러운 앱이 포트폴리오에서 항상 이긴다.

---

## 11. 이번에 하지 않을 것 (Won't Do)

명시적으로 버림 — README "다음 단계"에 적어서 오히려 가점 요소로 쓴다.

- 소셜 기능(친구, 랭킹, 공유), 푸시 알림, 파일 업로드
- 테스트 코드(Vitest/Playwright), Storybook
- 국제화(i18n), PWA/오프라인, 커스텀 도메인
- 관리자 페이지, 결제

---

## 12. 착수 순서 (지금 바로)

1. 이 문서 읽고 §3의 `PRODUCT.md` / `DESIGN.md`를 작성한다 ← **다음에 할 일**
2. 두 파일이 준비되면 Claude Code에게 "Day 1 시작" 이라고 말한다
3. Day 1 시간표대로 진행 (배포를 1시간차에 끝내는 것이 최우선)

> 개발 중 새 아이디어는 전부 `PRODUCT.md`의 SHOULD/WON'T에 적기만 한다.
> **3일 프로젝트에서 가장 비싼 행동은 코딩이 아니라 마음을 바꾸는 것이다.**
