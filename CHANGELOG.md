# 변경 이력

이 파일의 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를,
버전 번호는 [유의적 버전(SemVer)](https://semver.org/lang/ko/)을 따릅니다.

분류: `추가` · `변경` · `수정`(버그) · `제거` · `보안`

---

## [작업 중]

### 추가 예정
- 월간 페이지 (달력 칸에서 일정 입력)
- 주간 페이지 (요일별 할 일 + 하단 메모)
- 오른쪽 인덱스 탭 (표지 · 1~12월 · free note)
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
