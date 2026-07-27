-- ============================================================
--  正 PLANNER — 데이터베이스 최신화
--
--  ⭐ DB를 고쳐야 한다고 하면 항상 이 파일 하나만 실행하면 됩니다.
--     Supabase 대시보드 → SQL Editor → 붙여넣기 → Run
--
--  몇 번을 다시 돌려도 안전합니다. 이미 있는 것은 건너뜁니다.
--  처음 만드는 경우에도 이 파일 하나로 끝납니다.
-- ============================================================


-- ------------------------------------------------------------
-- 1) 프로필
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

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
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ------------------------------------------------------------
-- 2) 적은 것 (items)
--
--    kind      | date 의 의미      | 보이는 곳
--    ----------|------------------|------------------------------
--    'year'    | 그 해 1월 1일     | 표지
--    'month'   | 그 달 1일         | 월간 페이지 왼쪽
--    'event'   | 실제 날짜         | 달력 칸 + 주간 페이지 위쪽
--    'task'    | 실제 날짜         | 주간 페이지 요일 칸
--    'daily'   | 실제 날짜         | 주간 페이지 요일 옆 한 줄
--    'sticker' | 그 페이지의 기준일 | 아무 데나 붙인 스티커
-- ------------------------------------------------------------
create table if not exists public.items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,

  kind       text not null,
  date       date not null,

  content    text not null default '',
  is_done    boolean not null default false,
  color      text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0,

  created_at timestamptz not null default now()
);

-- 꾸미기·스티커 위치를 담는 칸. { bold, italic, highlight, check, sticker, x, y }
-- 컬럼을 여러 개 두지 않아서, 새 꾸미기가 생겨도 DB를 다시 안 고쳐도 된다.
alter table public.items
  add column if not exists style jsonb not null default '{}'::jsonb;

alter table public.items drop constraint if exists items_style_object;
alter table public.items add constraint items_style_object
  check (jsonb_typeof(style) = 'object');

alter table public.items drop constraint if exists items_kind_check;
alter table public.items add constraint items_kind_check
  check (kind in ('year', 'month', 'event', 'task', 'daily', 'sticker'));

-- 한 칸이 곧 종이 한 면이라 여러 줄이 통째로 들어온다.
-- 예전엔 한 줄짜리라 200자로 묶어놨었다.
alter table public.items drop constraint if exists items_content_check;
alter table public.items add constraint items_content_check
  check (char_length(content) <= 5000);

create index if not exists items_user_kind_date_idx on public.items (user_id, kind, date);
create index if not exists items_user_date_idx      on public.items (user_id, date);

-- 그날의 한 줄은 하루에 하나만
create unique index if not exists items_daily_uniq
  on public.items (user_id, date) where kind = 'daily';


-- ------------------------------------------------------------
-- 3) 메모 (notes) — 주간 메모 + Free Note
-- ------------------------------------------------------------
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,

  kind       text not null check (kind in ('week', 'free')),
  week_start date,
  content    text not null default '',

  updated_at timestamptz not null default now(),

  constraint notes_week_shape check (
    (kind = 'week' and week_start is not null) or
    (kind = 'free' and week_start is null)
  )
);

create unique index if not exists notes_week_uniq
  on public.notes (user_id, week_start) where kind = 'week';
create unique index if not exists notes_free_uniq
  on public.notes (user_id) where kind = 'free';


-- ============================================================
--  4) RLS — 남의 데이터는 DB가 아예 안 내준다
--
--  코드에서 필터를 깜빡해도, API를 직접 불러도 뚫리지 않는다.
--  (select auth.uid()) 로 감싸면 행마다 다시 계산하지 않아 빠르다.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.items    enable row level security;
alter table public.notes    enable row level security;

drop policy if exists "본인 프로필만" on public.profiles;
create policy "본인 프로필만" on public.profiles
  for all
  using       ((select auth.uid()) = id)
  with check  ((select auth.uid()) = id);

drop policy if exists "본인 항목만" on public.items;
create policy "본인 항목만" on public.items
  for all
  using       ((select auth.uid()) = user_id)
  with check  ((select auth.uid()) = user_id);

drop policy if exists "본인 메모만" on public.notes;
create policy "본인 메모만" on public.notes
  for all
  using       ((select auth.uid()) = user_id)
  with check  ((select auth.uid()) = user_id);
