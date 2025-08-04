# 🎨 09. 컴포넌트 라이브러리 (Component Library)

이 문서는 'Project: Cortex'의 프론트엔드 UI를 구성하는 모든 재사용 가능한 컴포넌트를 정의하고 설명합니다. 모든 컴포넌트는 재사용성, 독립성, 단일 책임 원칙을 기반으로 설계됩니다.

## 1. 개발 철학: 아토믹 디자인 (Atomic Design)

컴포넌트는 세 가지 계층으로 구분하여 관리하며, 이는 아토믹 디자인의 원자(Atoms), 분자(Molecules), 유기체(Organisms) 개념에 해당합니다.

- **`ui` (원자/분자):** 가장 작고 재사용성이 높은 기본 단위.
- **`layout` (템플릿):** 페이지의 전체적인 골격을 구성.
- **`domain` (유기체):** 특정 기능이나 도메인을 위해 `ui` 컴포넌트들을 조합하여 만든 복합 단위.

---

## 2. `components/ui` (범용 UI 컴포넌트)

> 프로젝트의 디자인 시스템 역할을 하는 가장 기본적인 UI 요소들입니다.

- **`Badge.tsx`**: 상태를 나타내는 라벨용 뱃지 (e.g., `New`, `Beta`).
- **`Button.tsx`**: 클릭 가능한 버튼. 다양한 `variant` 및 `size` 지원.
- **`Calendar.tsx`**: 날짜 선택용 달력 UI. `react-day-picker` 기반.
- **`Card.tsx`**: 내용 블록을 감싸는 기본 카드 컴포넌트.
- **`Checkbox.tsx`**: 이진 입력용 체크박스.
- **`DatePickerCustom.tsx`**: 날짜 범위 선택을 위한 커스텀 날짜 선택기.
- **`Dialog.tsx`**: 모달 대화상자. 확인/취소 인터페이스로 활용.
- **`DropdownMenu.tsx`**: Radix 기반의 드롭다운 메뉴 컴포넌트 세트.
- **`Form.tsx`**: `react-hook-form` 래퍼로, 폼 상태 관리와 유효성 검사를 담당.
- **`HorizontalScrollArea.tsx`**: 수평 스크롤 전용 레이아웃 컨테이너.
- **`IconButton.tsx`**: 아이콘 전용 버튼. 접근성 대응 (`aria-label` 필수).
- **`Input.tsx`**: 단일 입력 필드 컴포넌트.
- **`Label.tsx`**: 폼 요소에 대한 텍스트 라벨.
- **`Logo.tsx`**: 프로젝트 로고를 렌더링하는 컴포넌트.
- **`Popover.tsx`**: 클릭 트리거로 떠오르는 팝오버 UI.
- **`ScrollArea.tsx`**: 커스텀 스크롤바 영역을 제공하는 컴포넌트.
- **`Select.tsx`**: 사용자 정의 옵션을 선택할 수 있는 셀렉트 박스.
- **`Separator.tsx`**: 수평/수직 시각적 구분선.
- **`Spinner.tsx`**: 비동기 작업 중 로딩 상태를 나타내는 인디케이터.
- **`Table.tsx`**: 정형 데이터 출력용 테이블 UI.
- **`Tabs.tsx`**: 콘텐츠를 탭으로 나누어 렌더링.
- **`Textarea.tsx`**: 다중 줄 텍스트 입력 필드.

---

## 3. `components/layout` (레이아웃 컴포넌트)

> 애플리케이션의 전체적인 페이지 구조를 정의합니다.

- **`Header.tsx`**: 상단 고정 헤더. 로고, 메뉴, 사용자 드롭다운 포함.
- **`Footer.tsx`**: 페이지 하단 정보 영역.
- **`Sidebar.tsx`**: 인증 후 사용 가능한 사이드 네비게이션 바.
- **`PageWrapper.tsx`**: 최대 너비, 여백 등을 담당하는 콘텐츠 컨테이너.

---

## 4. `components/domain` (도메인 특화 컴포넌트)

> 기능 단위로 구성된 고수준 컴포넌트입니다.

### 4.1. 인증 (Authentication)

- **`SignupForm.tsx`**: 회원가입 폼.
- **`LoginForm.tsx`**: 로그인 폼.

### 4.2. 백테스팅 (Backtesting)

- **`BacktestSetupForm.tsx`**, **`BacktestResultSummary.tsx`**
- **`EquityChart.tsx`**, **`TradeLogTable.tsx`**, **`BacktestList.tsx`**
- **`DateRangePicker.tsx`**, **`TickerSelector.tsx`**

### 4.3. 전략 (Strategy)

- **`StrategyBuilderCanvas.tsx`**, **`IndicatorHub.tsx`**
- **`ParameterPopover.tsx`**, **`RuleBlock.tsx`**
- **`StrategyCard.tsx`**, **`StrategyBacktestHistory.tsx`**

### 4.4. 커뮤니티 (Community)

- **`SharedResultCard.tsx`**, **`CommentSection.tsx`**

### 4.5. 구독 및 설정 (Subscription & Settings)

- **`PricingTable.tsx`**, **`ApiKeyManager.tsx`**, **`SubscriptionStatus.tsx`**

### 4.6. 관리자 (Admin)

- **`AdminStatCard.tsx`**, **`AdminUserTable.tsx`**

---

## 5. `components/providers` (Provider 계층)

> 앱 전체에서 전역 상태나 설정을 주입합니다.

- **`Providers.tsx`**  
  다음 세 가지 핵심 기능을 래핑합니다:
  - `ThemeProvider` (다크/라이트 모드)
  - `QueryClientProvider` (`react-query`)
  - `NextIntlClientProvider` (다국어/타임존 지원)  
    내부에서 `useReAuth()`를 호출하여 인증 토큰 만료 시 자동 재인증을 시도합니다.

---

## 6. `hooks/` (사용자 정의 훅)

> 글로벌 상태, API 연동, SSR 대응 등을 위한 재사용 훅.

- **`useHasHydrated.ts`**  
  클라이언트가 hydration 완료됐는지를 판단하여 CSR 조건부 렌더링에 활용.

- **`useReAuth.ts`**  
  액세스 토큰 만료 시 자동으로 갱신하거나 리프레시하는 인증 유지 훅. `Providers.tsx`에서 초기 진입 시 실행됩니다.

- **`useStrategyState.ts`**  
  전략 편집기(StrategyBuilder)에서 사용되는 상태를 전역적으로 관리.

- **`useUserSubscription.ts`**  
  유저의 구독 상태 및 플랜 정보를 가져오고 캐싱합니다. 요금제 변경 로직에도 연동 가능.

---

## 7. `lib/apiClient.ts` (API 클라이언트)

> Axios 인스턴스를 구성하고, JWT 토큰 기반 인증 및 응답 에러 처리를 포함합니다.  
> 주요 기능:

- baseURL: "http://127.0.0.1:8000/api"
- 인증 토큰 자동 첨부 (Interceptor)
- 401 응답 시 리프레시 또는 로그아웃 처리
- 공통 에러 핸들링 (e.g., alert, toast)

---

## ✅ 요약

- UI 컴포넌트는 작게, 재사용 가능하게.
- 도메인 컴포넌트는 기능 단위로 명확하게.
- Provider와 Hook은 앱 전역에서 사용하는 핵심 인프라 코드로 분리.
- 모든 요소는 디자인 시스템과 상태 관리 일관성을 기준으로 설계됨.
