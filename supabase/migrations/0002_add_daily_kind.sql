-- 주간 페이지에서 요일·날짜 옆에 한 줄 적는 칸을 위해 kind에 'daily'를 추가한다.
-- 격언이나 그 날 꼭 해야 하는 것 한 줄. 하루에 하나만 쓴다.
--
-- Supabase 대시보드 → SQL Editor에 붙여넣고 Run 하세요.
-- 이미 실행했다면 다시 돌려도 안전합니다.

alter table public.items
  drop constraint if exists items_kind_check;

alter table public.items
  add constraint items_kind_check
  check (kind in ('year', 'month', 'event', 'task', 'daily'));

-- 하루에 daily는 하나만. 두 번 적히는 일을 DB에서 막는다.
create unique index if not exists items_daily_uniq
  on public.items (user_id, date)
  where kind = 'daily';
