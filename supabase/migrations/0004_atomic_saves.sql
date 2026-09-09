-- 한 칸/메모 자동 저장이 겹쳐도 중복 행이나 유니크 오류가 나지 않게 한다.
-- Supabase SQL Editor에서 한 번 실행하거나, latest.sql 전체를 다시 실행하세요.

alter table public.items drop constraint if exists items_kind_check;
alter table public.items add constraint items_kind_check
  check (kind in ('year', 'month', 'event', 'task', 'daily', 'sticker'));

alter table public.items drop constraint if exists items_content_check;
alter table public.items add constraint items_content_check
  check (char_length(content) <= 5000);

-- 이전 줄 단위 데이터가 있다면 화면에서 읽던 순서대로 한 칸에 합친다.
with grouped as (
  select
    user_id,
    kind,
    date,
    (array_agg(id order by sort_order, created_at, id))[1] as keep_id,
    string_agg(content, '<br>' order by sort_order, created_at, id) as merged_content
  from public.items
  where kind in ('year', 'month', 'event', 'task', 'daily')
  group by user_id, kind, date
  having count(*) > 1
), updated as (
  update public.items as item
  set content = grouped.merged_content
  from grouped
  where item.id = grouped.keep_id
)
delete from public.items as item
using grouped
where item.user_id = grouped.user_id
  and item.kind = grouped.kind
  and item.date = grouped.date
  and item.id <> grouped.keep_id;

drop index if exists public.items_daily_uniq;
create unique index if not exists items_one_block_per_slot_uniq
  on public.items (user_id, kind, date)
  where kind in ('year', 'month', 'event', 'task', 'daily');

create or replace function public.save_item_block(
  p_kind text,
  p_date date,
  p_content text,
  p_color text,
  p_style jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if p_kind not in ('year', 'month', 'event', 'task', 'daily') then
    raise exception '저장할 자리를 찾지 못했습니다.';
  end if;

  if p_content = '' then
    delete from public.items
    where user_id = auth.uid() and kind = p_kind and date = p_date;
    return;
  end if;

  insert into public.items (user_id, kind, date, content, color, style)
  values (auth.uid(), p_kind, p_date, p_content, p_color, coalesce(p_style, '{}'::jsonb))
  on conflict (user_id, kind, date)
    where kind in ('year', 'month', 'event', 'task', 'daily')
  do update set
    content = excluded.content,
    color = excluded.color,
    style = excluded.style;
end;
$$;

create or replace function public.save_note(
  p_week_start date,
  p_content text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if p_week_start is null then
    insert into public.notes (user_id, kind, week_start, content)
    values (auth.uid(), 'free', null, p_content)
    on conflict (user_id) where kind = 'free'
    do update set content = excluded.content, updated_at = now();
  else
    insert into public.notes (user_id, kind, week_start, content)
    values (auth.uid(), 'week', p_week_start, p_content)
    on conflict (user_id, week_start) where kind = 'week'
    do update set content = excluded.content, updated_at = now();
  end if;
end;
$$;

revoke all on function public.save_item_block(text, date, text, text, jsonb) from public, anon;
revoke all on function public.save_note(date, text) from public, anon;
grant execute on function public.save_item_block(text, date, text, text, jsonb) to authenticated;
grant execute on function public.save_note(date, text) to authenticated;
