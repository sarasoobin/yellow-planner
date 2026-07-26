-- ============================================================
--  正 PLANNER — 데이터베이스 스키마
--  Supabase 대시보드 → SQL Editor 에 붙여넣고 실행한다.
--  (PLAN.md §8의 초안은 "공부시간 측정 앱"용이라 이 파일로 대체됨)
-- ============================================================


-- ------------------------------------------------------------
-- 1) 프로필 — auth.users 를 확장한다
--    Supabase의 auth.users 테이블은 직접 건드릴 수 없어서
--    추가 정보를 담을 테이블을 따로 둔다.
-- ------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

-- 회원가입하면 프로필이 자동으로 만들어지게 하는 함수
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ------------------------------------------------------------
-- 2) 적은 것 (items) — 이 앱의 핵심 테이블
--
--    표지의 올해 목표, 월간 할 일, 달력의 중요 일정,
--    주간 페이지의 자잘한 할 일을 전부 이 한 테이블로 처리한다.
--    kind 로 구분한다.
--
--    kind      | date 의 의미        | 보이는 곳
--    ----------|--------------------|---------------------------
--    'year'    | 그 해 1월 1일       | 표지
--    'month'   | 그 달 1일           | 월간 페이지 왼쪽
--    'event'   | 실제 날짜           | 달력 칸 + 주간 페이지 위쪽  ← 중요한 일정
--    'task'    | 실제 날짜           | 주간 페이지 요일 칸        ← 자잘한 할 일
-- ------------------------------------------------------------
create table public.items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,

  kind       text not null check (kind in ('year', 'month', 'event', 'task')),
  date       date not null,

  content    text not null check (char_length(content) between 1 and 200),
  is_done    boolean not null default false,
  color      text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0,

  created_at timestamptz not null default now()
);

-- 조회 성능: 화면마다 "내 것 중 / 종류가 무엇이고 / 어느 기간인지" 로 찾는다
create index items_user_kind_date_idx on public.items (user_id, kind, date);
-- 달력에서 그 달 전체를 한 번에 긁어올 때
create index items_user_date_idx      on public.items (user_id, date);


-- ------------------------------------------------------------
-- 3) 메모 (notes)
--    주간 페이지 아래쪽 메모 한 칸 + Free Note 한 장
-- ------------------------------------------------------------
create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,

  kind       text not null check (kind in ('week', 'free')),
  week_start date,                      -- kind='week' 일 때만 사용 (그 주 월요일)
  content    text not null default '',

  updated_at timestamptz not null default now(),

  -- kind 와 week_start 의 짝이 맞는지 강제한다
  constraint notes_week_shape check (
    (kind = 'week' and week_start is not null) or
    (kind = 'free' and week_start is null)
  )
);

-- 한 주에 메모는 하나만, Free Note 도 사람당 하나만
create unique index notes_week_uniq on public.notes (user_id, week_start) where kind = 'week';
create unique index notes_free_uniq on public.notes (user_id)             where kind = 'free';


-- ============================================================
--  4) RLS — 행 단위 접근 제어
--
--  여기가 이 앱의 보안 핵심이다.
--  "남의 데이터는 애초에 DB가 내주지 않는다"를 보장한다.
--  코드에서 필터를 깜빡해도, API를 직접 호출해도 뚫리지 않는다.
--
--  auth.uid() = 지금 요청한 사람의 사용자 ID (로그인 토큰에서 추출됨)
--  (select auth.uid()) 로 감싸는 이유: 행마다 재평가하지 않아 훨씬 빠르다
-- ============================================================

alter table public.profiles enable row level security;
alter table public.items    enable row level security;
alter table public.notes    enable row level security;

-- using      : 읽기/수정/삭제할 때 "이 행을 건드려도 되는가"
-- with check : 새로 넣거나 바꾼 값이 "여전히 내 것인가"
create policy "본인 프로필만" on public.profiles
  for all
  using       ((select auth.uid()) = id)
  with check  ((select auth.uid()) = id);

create policy "본인 항목만" on public.items
  for all
  using       ((select auth.uid()) = user_id)
  with check  ((select auth.uid()) = user_id);

create policy "본인 메모만" on public.notes
  for all
  using       ((select auth.uid()) = user_id)
  with check  ((select auth.uid()) = user_id);
