# 🗺️ 10. 페이지 디렉토리 (Page Directory)

이 문서는 'Project: Cortex'를 구성하는 모든 페이지의 목록과 각 페이지의 역할, 주요 기능, 그리고 사용되는 핵심 컴포넌트를 정의합니다.

---

## 1. 공개 페이지 (인증 불필요)

### **랜딩 페이지 (`/`)**

- **개발 단계:** `[MVP]`
- **역할:** 서비스의 첫인상. 핵심 가치와 기능을 소개하여 회원가입을 유도합니다.
- **주요 기능 및 컴포넌트:**
  - 서비스 소개 섹션
  - 핵심 기능(백테스팅, 자동매매 등) 요약
  - `Header`, `Footer`

### **가격 정책 페이지 (`/pricing`)**

- **개발 단계:** `[Phase 2]`
- **역할:** 구독 플랜별 기능과 가격을 비교하여 사용자의 구독 결정을 돕습니다.
- **주요 기능 및 컴포넌트:**
  - `PricingTable`: 플랜 비교 테이블
  - FAQ 섹션

### **회원가입 페이지 (`/signup`)**

- **개발 단계:** `[MVP]`
- **역할:** 신규 사용자의 계정을 생성합니다.
- **주요 기능 및 컴포넌트:**
  - `SignupForm`

### **로그인 페이지 (`/login`)**

- **개발 단계:** `[MVP]`
- **역할:** 기존 사용자의 서비스 로그인을 처리합니다.
- **주요 기능 및 컴포넌트:**
  - `LoginForm`

---

## 2. 핵심 애플리케이션 페이지 (인증 필요)

### **메인 대시보드 (`/dashboard`)**

- **개발 단계:** `[Phase 2]`
- **역할:** 로그인 후 사용자가 가장 먼저 마주하는 개인화된 허브입니다.
- **주요 기능 및 컴포넌트:**
  - `AdminDashboardClient` (관리자용): 시스템 전체 통계 요약
  - `UserDashboardClient` (일반 사용자용): 개인 포트폴리오, 봇 현황, 최근 활동 요약
  - `PortfolioOverview`: 자산 현황 요약
  - `ActiveBotCard`: 실행 중인 봇 목록
  - `SubscriptionStatusCard`: 현재 구독 플랜 및 남은 기간 표시
  - `UsageStatsWidget`: 활성 봇 개수 등 표시
  - 최근 백테스팅 결과 바로가기 목록
  - 최근 실행된 자동매매 봇 목록

### **백테스팅 페이지 (`/backtester`)**

- **개발 단계:** `[MVP]`
- **역할:** 사용자가 투자 전략의 과거 성과를 시뮬레이션하는 핵심 기능 페이지입니다.
- **주요 기능 및 컴포넌트:**
  - `BacktestSetupForm`: 백테스팅 조건 설정
  - `BacktestList`: 실행 중인 백테스트 목록과 상태
- **상세 결과 페이지 (`/backtester/:id`)**
  - `BacktestResultSummary`: 성과 지표 요약 (재사용)
  - `EquityChart`: 누적 수익률 곡선 차트 (재사용)
  - `TradeLogTable`: 상세 거래 내역 테이블 (재사용)

### **전략 최적화 목록 페이지 (`/optimization`)**

- **개발 단계:** `[Phase 4]`
- **역할:** 사용자가 실행한 모든 전략 최적화 작업(General, WFO)의 목록과 상태, 요약 결과를 보여줍니다.
- **주요 기능 및 컴포넌트:**
  - `OptimizationJobCard`: 개별 최적화 작업의 요약 정보 카드 (WFO/General 타입 구분 표시).
  - 상태(`statusFilter`), 전략(`strategyFilter`), 타입(`typeFilter`)별 서버사이드 필터링 기능.
  - `useInfiniteQuery`와 `useInView`를 사용한 무한 스크롤.
  - `refetchInterval`을 사용한 '실행중' 작업 상태 자동 갱신(폴링).
  - 새 최적화 생성(`.../new`) 페이지로 이동 버튼.

### **새 최적화 생성 페이지 (`/optimization/new`)**

- **개발 단계:** `[Phase 4]`
- **역할:** 사용자가 새로운 최적화 작업을 설정하고 제출하는 페이지입니다.
- **주요 기능 및 컴포넌트:**
  - `OptimizationSetupForm`: 최적화 설정의 모든 로직을 담당하는 핵심 폼 컴포넌트.
  - `OptimizationParameterTreeView`: 전략 규칙을 시각화하고 최적화할 파라미터 범위를 선택.
  - 'General' / 'WFO' 탭 전환 기능.
  - 비용 견적 API(`POST /optimizations/estimate-cost`) 연동 및 실시간 요약.

### **최적화 상세 결과 페이지 (`/optimization/:id`)**

- **개발 단계:** `[Phase 4]`
- **역할:** 완료된 (또는 실행 중인) 특정 최적화 작업의 상세 결과 전체를 시각화합니다.
- **주요 기능 및 컴포넌트:**
  - `OptimizationHeader`: 작업 상태(WebSocket 실시간 갱신), '새 전략으로 저장' 기능 제공.
  - `ConfigSummaryCard`: 실행 당시의 설정값(기간, 목표, 제약 조건 등) 요약.
  - **(General) `BestResultCard`**: 일반 최적화 시 최고의 Trial 결과 및 파라미터 표시.
  - **[WFO] `OOSPerformanceChart`**: WFO 최적화 시 Out-of-Sample 수익 곡선 차트 표시.
  - **[WFO] `ParameterStabilityChart`**: WFO Fold별 파라미터 안정성 추이 차트.
  - `ParameterImportanceChart`: 파라미터 중요도(영향력) 차트.
  - `ParallelCoordinatesChart`: 전체 Trial의 파라미터-성과 관계 시각화 차트.
  - `TrialsTable`: 서버사이드 페이지네이션/정렬/필터링이 적용된 전체 Trial 목록.

### **전략 허브 목록 페이지 (`/strategies`)**

- **개발 단계:** `[Phase 2]`
- **역할:** 사용자가 생성 및 저장한 모든 커스텀 전략을 관리합니다.
- **주요 기능 및 컴포넌트:**
  - `StrategyCard`: 저장된 전략 목록
  - 새 전략 만들기 버튼
  - 검색, 필터링, 정렬 컨트롤
  - 고급 필터링 컨트롤 (지표, 공개여부 등)

### **전략 빌더 페이지 (`/strategies/new` 또는 `/strategies/:id/edit`)**

- **개발 단계:** `[Phase 2]`
- **역할:** 사용자가 코딩 없이 전략을 생성하고 수정하는 비주얼 편집기입니다.
- **주요 기능 및 컴포넌트:**
  - `IndicatorHub`: 지표 선택 모달
  - `ParameterPopover`: 지표 파라미터 설정
  - `StrategyBuilderCanvas`: 시각적 전략 규칙 편집기
  - `DynamicStrategyChart`: 실시간 신호 피드백 기능이 포함된 인터랙티브 차트
  - `TargetCoinForm`, `TpslForm`
  - **수정 페이지 기능**: 기존 전략 데이터 로딩 및 폼 채우기, `StrategyBacktestHistory` 컴포넌트 통합

### **AI Lab 목록 페이지 (`/ai-lab`)**

- **개발 단계:** `[Phase 5]`
- **역할:** 사용자가 생성한 모든 AI 예측 모델을 관리합니다.
- **주요 기능 및 컴포넌트:**
  - AI 모델 카드 (상태, 정확도, 학습 정보 표시)
  - 새 모델 생성 버튼
  - 상태별 필터링 (학습 중, 완료, 실패)
  - 모델 유형별 필터링 (LSTM, GRU, TFT)

### **새 AI 모델 생성 페이지 (`/ai-lab/new`)**

- **개발 단계:** `[Phase 5]`
- **역할:** 새로운 AI 예측 모델을 설정하고 학습을 시작합니다.
- **주요 기능 및 컴포넌트:**
  - 모델 유형 선택 (LSTM, GRU, TFT)
  - 태스크 유형 선택 (Classification, Regression)
  - 피처 선택 (50+ 기술적 지표)
  - Triple Barrier 라벨링 설정
  - 하이퍼파라미터 설정 (hidden_size, dropout, learning_rate 등)
  - 학습 기간 및 심볼 설정
  - 비용 견적 표시 및 크레딧 잔액 확인

### **AI 모델 상세 페이지 (`/ai-lab/:id`)**

- **개발 단계:** `[Phase 5]`
- **역할:** AI 모델의 상세 정보, 학습 진행 상황, 버전 관리를 제공합니다.
- **주요 기능 및 컴포넌트:**
  - `AIModelFeatureImportance`: 피처 중요도 시각화
  - `AIModelVersionsTable`: 버전 목록 및 롤백 기능
  - `AIModelRetrainDialog`: 수동 재학습 다이얼로그
  - 실시간 학습 진행률 표시 (WebSocket 연동)
  - 예측 테스트 기능 (현재 시점 데이터로 예측 수행)
  - 학습 메트릭 시각화 (Loss 곡선, Accuracy 추이)

---

## 3. 커뮤니티 페이지 (인증 필요)

### **커뮤니티 피드 (`/community`)**

- **개발 단계:** `[Phase 3+]`
- **역할:** 다른 사용자들이 공유한 백테스팅 결과를 탐색하는 공간입니다.
- **주요 기능 및 컴포넌트:**
  - `SharedResultCard`: 공유된 결과 목록
  - 정렬 및 필터링 기능

### **공유 결과 상세 페이지 (`/community/:resultId`)**

- **개발 단계:** `[Phase 3+]`
- **역할:** 특정 공유 결과의 상세 정보와 댓글을 확인하고 소통합니다.
- **주요 기능 및 컴포넌트:**
  - `BacktestResultSummary`, `EquityChart`, `TradeLogTable` (재사용)
  - `CommentSection`

---

## 4. 사용자 설정 페이지 (인증 필요)

### **설정 페이지 레이아웃 (`/settings`)**

- **역할:** 모든 설정 관련 페이지들을 감싸는 공통 레이아웃. (좌측에 설정 메뉴 포함)
- **주요 기능 및 컴포넌트:**
  - 설정 메뉴 네비게이션 (`/profile`, `/subscription`, `/keys` 링크)

### **내 정보 수정 페이지 (`/settings/profile`)**

- **개발 단계:** `[Phase 2]`
- **역할:** 사용자의 계정 기본 정보를 수정합니다.
- **주요 기능 및 컴포넌트:**
  - 닉네임, 비밀번호 변경 폼

### **구독 관리 페이지 (`/settings/subscription`)**

- **개발 단계:** `[Phase 2]`
- **역할:** 구독 플랜을 관리하고 결제 내역을 확인합니다.
- **주요 기능 및 컴포넌트:**
  - `SubscriptionStatus`: 현재 구독 상태 표시
  - 플랜 변경/취소 버튼

### **API 키 관리 페이지 (`/settings/keys`)**

- **개발 단계:** `[Phase 2]`
- **역할:** 자동매매에 사용할 거래소 API 키를 관리합니다.
- **주요 기능 및 컴포넌트:**
  - `ApiKeyManager`

---

## 5. 관리자 페이지 (관리자 전용)

### **관리자 대시보드 (`/admin/dashboard`)**

- **개발 단계:** `[Phase 2]`
- **역할:** 서비스 운영의 핵심 지표를 모니터링합니다.
- **주요 기능 및 컴포넌트:**
  - `AdminDashboardClient`에서 사용되는 `AdminStatCard`
  - 가입자 추이 차트

### **사용자 관리 페이지 (`/admin/users`)**

- **개발 단계:** `[Phase 2]`
- **역할:** 전체 사용자를 조회하고 관리합니다.
- **주요 기능 및 컴포넌트:**
  - `AdminUserTable`: 사용자 목록 및 관리 기능이 포함된 테이블
