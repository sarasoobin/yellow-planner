-- 글자 꾸미기(굵게·기울임·형광펜)와 체크박스 여부, 스티커를 저장한다.
--
-- 컬럼을 다섯 개 만드는 대신 jsonb 하나로 둔다.
-- 스티커를 새로 추가하거나 꾸미기 종류가 늘어도 DB를 다시 안 건드려도 된다.
--
--   { "bold": true, "italic": false, "highlight": true,
--     "check": true, "sticker": "star" }
--
-- 값이 없으면 기본값으로 본다. 이미 적어둔 항목은 손댈 필요가 없다.
--
-- Supabase 대시보드 → SQL Editor에 붙여넣고 Run 하세요.
-- 이미 실행했다면 다시 돌려도 안전합니다.

alter table public.items
  add column if not exists style jsonb not null default '{}'::jsonb;

-- 통째로 이상한 값이 들어오는 것만 막는다. 안쪽 키는 앱에서 검증한다.
alter table public.items
  drop constraint if exists items_style_object;

alter table public.items
  add constraint items_style_object
  check (jsonb_typeof(style) = 'object');
