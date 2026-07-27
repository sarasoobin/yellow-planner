# 변경 이력

이 파일의 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를,
버전 번호는 [유의적 버전(SemVer)](https://semver.org/lang/ko/)을 따릅니다.

분류: `추가` · `변경` · `수정`(버그) · `제거` · `보안`

---

## [작업 중]

### 추가
- 노트 껍데기 레이아웃 — 책상 위에 노란 공책이 놓인 구조, 모든 페이지 공통
- 인덱스 탭 14개 (표지 · 1~12월 · 메모)
  데스크톱은 오른쪽 세로, 모바일은 위쪽 가로 스크롤
- `DESIGN.md` 색을 Tailwind 토큰으로 등록 (`bg-paper`, `text-ink` 등)
- 월간 페이지 (`/month/2026-07`) — 왼쪽 이 달 할 일 + 오른쪽 달력 격자,
  중요 일정 색 띠, 자잘한 할 일 개수 점, 주차 이동 버튼 `›`
- 주간 페이지 (`/week/2026-07-20`) — 월~일 7칸, 각 칸 위에 그 날 중요 일정,
  아래 자잘한 할 일, 하단 주간 메모
- Free Note (`/note`) — 괘선 있는 자유 메모 한 장
- 正자 집계 컴포넌트 — 완료 5개마다 正 한 글자 (획을 SVG로 그림)
- 메모 저장 액션 (`saveNote`) — 주간 메모와 Free Note 공용
- 날짜 유틸 (`src/lib/dates.ts`) — 월요일 시작 주, 달력 격자 계산

- 도구 막대 — 펜 색(검정·빨강·파랑), 굵게, 기울임, 형광펜, 스티커
- 스티커를 직접 추가할 수 있는 `public/stickers/` 폴더와 안내 문서
- 달력 칸을 누르면 날짜 옆에서 바로 일정 입력
- 줄마다 체크박스를 붙이거나 뗄 수 있음 — 자유롭게 적다가 필요할 때만
- 할 일 순서를 드래그로 변경

### 변경
- 로그인·랜딩 화면을 노트 테마로 정리
- 완료 표시를 빨간 색연필 체크와 빨간 취소선으로. 흐려지는 효과는 종이에 없어서 뺌
- 이 달 메모는 체크리스트 대신 자유롭게 적는 칸으로

### 추가 예정
- 달력 칸을 눌러 그 자리에서 일정 입력 (지금은 보기만 가능)
- 표지의 월별 완료율
- 데모 계정 및 예시 데이터

---

## [0.1.0] - 2026-07-27

Day 1. 로그인부터 항목 CRUD까지, 데이터가 실제로 저장되고 계정별로 격리되는 지점까지.

### 추가
- Supabase 연동 — 브라우저 / 서버 / 세션 갱신용 클라이언트 분리
- `proxy.ts` 기반 인증 가드 — 비로그인 시 `/cover`, `/month`, `/week`, `/note` 접근 차단
- 데이터베이스 스키마 (`profiles`, `items`, `notes`) 및 RLS 정책
- 가입 시 프로필을 자동 생성하는 트리거
- 이메일 회원가입 / 로그인 / 로그아웃
- 항목 CRUD Server Action — `createItem`, `toggleItem`, `updateItem`, `deleteItem`
- 표지 페이지 (`/cover`) — 올해의 목표 입력 및 달성 개수 표시
- 재사용 CRUD 컴포넌트 `ItemList` — `kind`와 `date`만 바꿔 월간 · 주간에서도 사용
- 기획 문서 `PRODUCT.md`, `DESIGN.md`

### 수정
- 항목 글자를 눌러도 수정 모드가 열리지 않던 문제
  StrictMode가 effect를 두 번 실행해 수정 모드가 열리자마자 닫히고 있었습니다.

### 보안
- 권한 검사를 앱이 아닌 DB(RLS)에 위임 — 앱 코드에 버그가 있어도 타인 데이터 접근 불가
- 세션 검증에 `getUser()` 사용 (`getSession()`은 쿠키를 그대로 신뢰해 위조 가능)
- 로그인 실패 메시지를 통일해 계정 존재 여부가 드러나지 않도록 처리
- `?next=` 파라미터를 내부 경로로 제한 — 오픈 리다이렉트 방지
- 입력값을 Zod로 검증하고 DB의 `check` 제약과 길이 제한을 일치시킴

---

## [0.0.1] - 2026-07-26

### 추가
- Next.js 16 프로젝트 초기 설정 (App Router, TypeScript, Tailwind CSS 4)
- GitHub 저장소 및 Vercel 자동 배포 연결

[작업 중]: https://github.com/sarasoobin/yellow-planner/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/sarasoobin/yellow-planner/releases/tag/v0.1.0
[0.0.1]: https://github.com/sarasoobin/yellow-planner/commits/main
