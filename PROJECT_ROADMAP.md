# 🗺️ Project: Cortex - 최종 개발 로드맵

이 문서는 'Project: Cortex'의 전체 개발 계획을 담고 있는 마스터 체크리스트입니다. 각 항목을 완료할 때마다 `- [ ]`를 `- [x]`로 변경하여 진행 상황을 추적합니다.

---

### 🏗️ Phase 0: 프로젝트 기반 공사 (Foundation & CI/CD)

> **목표:** 코딩을 시작하기 전, 개발과 배포를 위한 모든 인프라와 환경을 완벽하게 구축한다.

- [x] **GitHub 저장소 생성 및 `docs` 초기화**
  - [x] `Cortex` 저장소 생성
  - [x] `docs` 폴더 및 00~10번까지의 모든 기획/설계 문서 추가
- [x] **로컬 개발 환경 구축**
  - [x] `docker-compose.yml`을 이용한 PostgreSQL/TimescaleDB 컨테이너 실행
  - [x] `backend` 폴더 FastAPI 프로젝트 초기 설정
  - [x] `frontend` 폴더 Next.js 프로젝트 초기 설정
- [ ] **초기 배포 및 CI/CD 파이프라인 설정**
  - [ ] 프론트엔드 프로젝트를 Vercel에 연결
  - [ ] 백엔드 프로젝트를 위한 Dockerfile 작성
  - [ ] 백엔드를 배포할 클라우드 플랫폼(e.g., AWS, GCP) 초기 설정

---

### 🚀 Phase 1: MVP (Minimum Viable Product) - 핵심 가치 검증

> **목표:** 사용자가 회원가입/로그인 후, 기본 제공 전략으로 백테스팅을 실행하고 결과를 확인할 수 있다.

- **Pages**
  - [x] **랜딩 페이지 (`/`)**: 서비스의 핵심 가치를 소개하는 첫 화면.
  - [x] **회원가입 페이지 (`/signup`)**: 신규 사용자 등록.
  - [x] **로그인 페이지 (`/login`)**: 기존 사용자 로그인.
  - [ ] **백테스팅 페이지 (`/backtester`)**
    - [ ] (1) 백테스팅 조건 설정 폼 구현
    - [ ] (2) 결과 요약 지표(수익률, MDD 등) 표시
    - [ ] (3) 누적 수익률 곡선 차트 표시
    - [ ] (4) 상세 거래 내역 테이블 표시
- **Core Components**
  - [x] **UI Kit (`/ui`)**: `Button`, `Input`, `Card`, `Spinner` 등 기본 컴포넌트 개발
  - [x] **Layout (`/layout`)**: `Header`, `Footer` 등 레이아웃 컴포넌트 개발
  - [ ] **Domain (`/domain`)**: `-SignupForm-`, `-LoginForm-`, `BacktestResultSummary`, `EquityChart` 등 MVP용 도메인 컴포넌트 개발
- **Backend & Infrastructure**
  - [x] **사용자 인증**: 회원가입 및 JWT 기반 로그인/인증 API 개발
  - [ ] **기본 백테스팅 엔진**: Long-only, 수수료/슬리피지 로직이 포함된 V1 엔진 개발
  - [ ] **백테스팅 API**: 백테스팅 실행 요청을 받아 결과를 반환하는 API 엔드포인트 개발

---

### 💰 Phase 2: Monetization & Core Expansion - 수익 모델 및 기능 확장

> **목표:** 구독 시스템을 도입하고, 대시보드와 상세 분석 기능을 추가하여 사용자 경험을 향상시킨다.

- **Pages**
  - [ ] **가격 정책 페이지 (`/pricing`)**
  - [ ] **메인 대시보드 (`/dashboard`)**
  - [ ] **사용자 설정 페이지 (`/settings`)**: 프로필, 구독, API 키 관리 탭 포함
  - [ ] **관리자 페이지 (`/admin`)**: 대시보드 및 사용자 관리 기능 포함
- **Core Components**
  - [ ] `PricingTable`
  - [ ] `SubscriptionStatus`, `ApiKeyManager`
  - [ ] `PortfolioOverview`, `ActiveBotCard`
  - [ ] `AdminStatCard`, `AdminUserTable`
- **Backend & Infrastructure**
  - [ ] **구독 시스템**: `plans`, `subscriptions` DB 테이블 설계 및 로직 구현
  - [ ] **결제 게이트웨이**: Stripe 또는 아임포트 연동 및 Webhook 처리
  - [ ] **권한 관리**: 플랜별 기능 접근을 제어하는 미들웨어 구현
  - [ ] **기본 자동매매**: 저장된 전략으로 자동매매를 실행하는 V1 엔진 개발
  - [ ] **관리자 API**: 사용자 및 구독 정보 관리를 위한 API 개발

---

- **UI/UX 및 플랫폼 공통 기능**
  - [ ] **다국어 지원 (i18n)**: 영어/한국어 전환 기능 구현
    - [ ] `next-intl` 라이브러리 설정
    - [ ] `messages` 파일 (en.json, ko.json) 작성
    - [ ] 언어 전환 스위치 컴포넌트 개발
  - [ ] **다크/라이트 모드 지원**: 전체 테마 전환 기능 구현
    - [ ] `tailwind.config.js`에 다크 모드 설정 추가
    - [ ] 테마 전환 토글 버튼 컴포넌트 개발

---

### 👥 Phase 3: Community & Customization - 플랫폼으로의 진화

> **목표:** 사용자가 직접 전략을 만들고 커뮤니티와 소통하게 하여 플랫폼 생태계를 구축한다.

- **Pages**
  - [ ] **나의 전략 목록 페이지 (`/strategies`)**
  - [ ] **전략 빌더 페이지 (`/strategies/new`)**
  - [ ] **커뮤니티 피드 (`/community`)**
  - [ ] **공유 결과 상세 페이지 (`/community/:resultId`)**
  - [ ] **공개 프로필 페이지 (`/profile/:username`)**
- **Core Components**
  - [ ] `StrategyBuilder` (가장 핵심적인 복합 컴포넌트)
  - [ ] `StrategyCard`
  - [ ] `SharedResultCard`
  - [ ] `CommentSection`
- **Backend & Infrastructure**
  - [ ] **커스텀 전략 엔진**: JSON 기반의 전략 규칙을 해석하고 실행하는 V2 엔진 개발
  - [ ] **커뮤니티 기능**: 공유, 댓글, 좋아요 관련 DB 스키마 및 API 개발
  - [ ] **백테스팅 엔진 고도화**: Long/Short 포지션, 레버리지, 고급 성과 지표(샤프 지수 등) 계산 로직 추가

---

### 🧙‍♂️ Phase 4: Pro Features - 전문가를 위한 기능

> **목표:** 전문 투자자들을 위한 고급 기능들을 추가하여 서비스의 깊이를 더한다.

- **Pages**
  - [ ] **페이퍼 트레이딩 페이지 (`/paper-trading`)**
  - [ ] **전략 최적화 페이지 (`/optimization`)**
- **Backend & Infrastructure**
  - [ ] **페이퍼 트레이딩 엔진**: 실시간 시세 기반 모의 거래 엔진 개발
  - [ ] **전략 최적화 로직**: 대규모 병렬 백테스팅을 위한 비동기 태스크 큐(Celery) 도입
  - [ ] **알림 서비스**: 이메일, 웹 푸시 등 알림 시스템 연동
