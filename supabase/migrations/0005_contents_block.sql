-- Four-year Contents pages each have one shared free-writing block.
-- Run this in Supabase SQL Editor, or run supabase/latest.sql in full.

alter table public.items drop constraint if exists items_kind_check;
alter table public.items add constraint items_kind_check
  check (kind in ('year', 'month', 'event', 'task', 'daily', 'contents', 'sticker'));

drop index if exists public.items_one_block_per_slot_uniq;
create unique index if not exists items_one_block_per_slot_uniq
  on public.items (user_id, kind, date)
  where kind in ('year', 'month', 'event', 'task', 'daily', 'contents');

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

  if p_kind not in ('year', 'month', 'event', 'task', 'daily', 'contents') then
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
    where kind in ('year', 'month', 'event', 'task', 'daily', 'contents')
  do update set
    content = excluded.content,
    color = excluded.color,
    style = excluded.style;
end;
$$;
