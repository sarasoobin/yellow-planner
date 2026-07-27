-- ============================================================
--  正 PLANNER — 데모 계정 예시 데이터
--
--  둘러보러 온 사람이 빈 노트를 보면 뭘 하는 앱인지 알 수 없다.
--  채워진 노트를 보여주기 위한 것이다.
--
--  ⚠️ 먼저 앱에서 데모 계정으로 회원가입을 해두세요.
--     아래 demo_email 과 같은 주소여야 합니다.
--
--  Supabase 대시보드 → SQL Editor → 붙여넣기 → Run
--  다시 돌리면 데모 계정 내용을 싹 지우고 새로 채웁니다.
--  (누가 데모에 낙서해두면 이걸 다시 돌리면 됩니다)
-- ============================================================

do $$
declare
  demo_email text := 'demo@yellow-planner.app';
  uid  uuid;
  -- 날짜를 박아두면 몇 달 뒤엔 텅 빈 달을 보게 된다. 오늘 기준으로 계산한다.
  y    date := date_trunc('year',  current_date)::date;  -- 표지
  m    date := date_trunc('month', current_date)::date;  -- 이 달
  wk   date := date_trunc('week',  current_date)::date;  -- 이번 주 월요일
begin
  select id into uid from auth.users where email = demo_email;

  if uid is null then
    raise exception
      '데모 계정(%)이 없습니다. 앱에서 먼저 그 주소로 회원가입해주세요.', demo_email;
  end if;

  delete from public.items where user_id = uid;
  delete from public.notes where user_id = uid;

  -- ── 표지: 올해의 목표 ─────────────────────────────────────
  insert into public.items (user_id, kind, date, content, color, style) values
  (uid, 'year', y,
   E'☑ 포트폴리오 웹 3개 만들기\n' ||
   E'☑ 알고리즘 문제 200개 풀기\n' ||
   E'☐ 토익 900점\n' ||
   E'☐ 운동 주 3회 습관 들이기\n' ||
   E'☐ 책 12권 읽기\n' ||
   E'☐ 여름에 제주도 한 번',
   '#3A3226', '{}'::jsonb);

  -- ── 월간 왼쪽: 이 달 메모 ─────────────────────────────────
  insert into public.items (user_id, kind, date, content, color, style) values
  (uid, 'month', m,
   E'이번 달은 시험이랑 프로젝트가 겹친다.\n' ||
   E'주말을 통으로 쓰지 말 것.\n\n' ||
   E'☑ 팀플 역할 정하기\n' ||
   E'☐ 발표 자료 초안\n' ||
   E'☐ 교수님 면담 잡기\n\n' ||
   E'생활비 정산 25일',
   '#3A3226', '{}'::jsonb);

  -- ── 달력: 중요한 일정 ────────────────────────────────────
  --  날짜 옆 첫 줄이 그 날 가장 중요한 일정이 된다.
  insert into public.items (user_id, kind, date, content, color, style) values
  (uid, 'event', m + 2,  '동아리 정기모임',                         '#33618F', '{}'::jsonb),
  (uid, 'event', m + 7,  E'과제 마감 23:59\n조교님께 확인 메일',     '#C1453C', '{}'::jsonb),
  (uid, 'event', m + 9,  '치과 예약 15:00',                         '#33618F', '{}'::jsonb),
  (uid, 'event', m + 14, E'중간고사 (자료구조)\n범위: 3~7장',        '#C1453C', '{"bold": true}'::jsonb),
  (uid, 'event', m + 15, '중간고사 (운영체제)',                      '#C1453C', '{"bold": true}'::jsonb),
  (uid, 'event', m + 18, '수빈이 생일',                              '#33618F', '{}'::jsonb),
  (uid, 'event', m + 21, E'팀 프로젝트 발표\n10분 + 질의응답',        '#C1453C', '{"bold": true}'::jsonb),
  (uid, 'event', m + 24, '월세 이체',                                '#3A3226', '{}'::jsonb),
  (uid, 'event', m + 27, '북클럽 — 「미움받을 용기」',                '#33618F', '{}'::jsonb);

  -- ── 주간: 요일별 자잘한 할 일 ─────────────────────────────
  insert into public.items (user_id, kind, date, content, color, style) values
  (uid, 'task', wk,
   E'☑ 강의 3주차 듣기\n☑ 목데이터 연결\n☐ 로그인 화면 손보기\n☐ 장보기 (계란, 우유)',
   '#3A3226', '{}'::jsonb),
  (uid, 'task', wk + 1,
   E'☑ 스터디 자료 읽기\n☐ 백준 3문제\n☐ 세탁물 맡기기',
   '#3A3226', '{}'::jsonb),
  (uid, 'task', wk + 2,
   E'☐ 발표 스크립트 초안\n☐ 자료 조사 30분\n☐ 러닝 3km',
   '#3A3226', '{}'::jsonb),
  (uid, 'task', wk + 3,
   E'☐ 팀원들과 슬랙 정리\n☐ 강의 4주차',
   '#3A3226', '{}'::jsonb),
  (uid, 'task', wk + 4,
   E'☐ 이번 주 회고 쓰기\n☐ 방 청소',
   '#3A3226', '{}'::jsonb),
  (uid, 'task', wk + 5,
   E'☐ 도서관 (오전만)\n☐ 영화 보기',
   '#33618F', '{}'::jsonb);

  -- ── 요일 옆 한 줄 ────────────────────────────────────────
  insert into public.items (user_id, kind, date, content, color, style) values
  (uid, 'daily', wk,     '무리하지 말기',        '#948A75', '{"italic": true}'::jsonb),
  (uid, 'daily', wk + 2, '오늘은 발표 준비만',   '#C1453C', '{}'::jsonb),
  (uid, 'daily', wk + 5, '푹 쉬기',              '#948A75', '{"italic": true}'::jsonb);

  -- ── 스티커 (페이지 크기 대비 %) ───────────────────────────
  insert into public.items (user_id, kind, date, content, style) values
  (uid, 'sticker', m,      'star',   '{"x": 88, "y": 14}'::jsonb),
  (uid, 'sticker', wk,     'circle', '{"x": 92, "y": 8}'::jsonb),
  (uid, 'sticker', y,      'star',   '{"x": 78, "y": 22}'::jsonb);

  -- ── 메모 ────────────────────────────────────────────────
  insert into public.notes (user_id, kind, week_start, content) values
  (uid, 'week', wk,
   E'시험 기간 전에 발표 자료를 끝내두자.\n' ||
   E'주말에 몰아서 하려다 매번 실패했다.\n' ||
   E'하루에 30분씩만.'),
  (uid, 'free', null,
   E'읽고 싶은 책\n' ||
   E'  · 나는 왜 이 일을 하는가\n' ||
   E'  · 클린 코드\n' ||
   E'  · 미드나잇 라이브러리\n\n' ||
   E'가보고 싶은 곳\n' ||
   E'  · 제주 — 9월쯤\n' ||
   E'  · 속초 당일치기\n\n' ||
   E'사고 싶은 것\n' ||
   E'  · 기계식 키보드 (적축)\n' ||
   E'  · 스탠드 조명');

  raise notice '데모 데이터를 채웠습니다. (%)', demo_email;
end $$;
