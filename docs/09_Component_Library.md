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

- **`Button.tsx`**: 클릭 가능한 모든 버튼 요소. (variant: primary, secondary, danger, ghost 등)
- **`Input.tsx`**: 텍스트, 이메일, 비밀번호 등 모든 종류의 입력 필드.
- **`Card.tsx`**: 콘텐츠를 감싸는 기본 카드 레이아웃. (그림자, 둥근 모서리, 패딩 등)
- **`Modal.tsx`**: 사용자에게 추가 정보를 제공하거나 확인을 요구하는 팝업 대화상자.
- **`Spinner.tsx`**: 데이터 로딩 중임을 나타내는 스피너 또는 스켈레톤 UI.
- **`Tooltip.tsx`**: UI 요소 위에 마우스를 올렸을 때 추가 정보를 보여주는 말풍선.
- **`Badge.tsx`**: 'Pro', 'Active', 'New' 등 작은 상태 정보를 표시하는 뱃지.
- **`Select.tsx`**: 드롭다운 형태의 선택 메뉴.
- **`DatePicker.tsx`**: 날짜 및 기간 선택을 위한 캘린더 컴포넌트. (`react-day-picker` 라이브러리의 래퍼)
- **`Table.tsx`**: `<table>`, `<thead>`, `<tbody>` 등 테이블 관련 태그에 일관된 스타일을 적용한 컴포넌트 세트.

---

## 3. `components/layout` (레이아웃 컴포넌트)

> 애플리케이션의 전체적인 페이지 구조를 정의합니다.

- **`Header.tsx`**: 모든 페이지 상단에 위치하는 헤더. (로고, 네비게이션 메뉴, 사용자 프로필 드롭다운 포함)
- **`Footer.tsx`**: 모든 페이지 하단에 위치하는 푸터. (서비스 정보, 관련 링크 등)
- **`Sidebar.tsx`**: 인증 후 사용되는 핵심 페이지들의 좌측 또는 우측 네비게이션 바.
- **`PageWrapper.tsx`**: 메인 콘텐츠 영역을 감싸며 일관된 여백과 최대 너비를 적용하는 컨테이너.

---

## 4. `components/domain` (도메인 특화 컴포넌트)

> 특정 기능이나 페이지를 위해 `ui` 및 `layout` 컴포넌트들을 조합하여 만든 기능 단위 컴포넌트들입니다.

#### 4.1. 인증 (Authentication)

- **`SignupForm.tsx`**: 회원가입 페이지에서 사용될 이메일, 비밀번호 입력 및 제출 로직을 포함한 폼.
- **`LoginForm.tsx`**: 로그인 페이지에서 사용될 이메일, 비밀번호 입력 및 제출 로직을 포함한 폼.

#### 4.2. 백테스팅 (Backtesting)

- **`BacktestSetupForm.tsx`**: 백테스팅 조건(기간, 코인, 전략 파라미터 등)을 설정하는 전체 폼 컴포넌트.
- **`BacktestResultSummary.tsx`**: 백테스팅 완료 후 수익률, MDD, 샤프 지수 등 핵심 지표를 요약하여 보여주는 섹션.
- **`EquityChart.tsx`**: 자산 변화 곡선을 그리는 `lightweight-charts`를 활용한 차트 컴포넌트.
- **`TradeLogTable.tsx`**: 모든 거래 내역을 보여주는 `TanStack Table`을 활용한 상세 테이블.

#### 4.3. 전략 (Strategy)

- **`StrategyBuilder.tsx`**: 조건과 지표를 조합해 사용자가 직접 전략을 만드는 비주얼 편집기 인터페이스.
- **`StrategyCard.tsx`**: '나의 전략 목록' 페이지에서 저장된 개별 전략의 요약 정보를 보여주는 카드.

#### 4.4. 커뮤니티 (Community)

- **`SharedResultCard.tsx`**: 커뮤니티 피드에 표시될 공유된 백테스팅 결과 요약 카드.
- **`CommentSection.tsx`**: 댓글 목록과 새 댓글 입력 폼을 포함하는 전체 댓글 영역.

#### 4.5. 구독 및 설정 (Subscription & Settings)

- **`PricingTable.tsx`**: 가격 정책 페이지의 플랜별 기능 비교 테이블.
- **`ApiKeyManager.tsx`**: 거래소 API 키 목록을 보여주고 추가/삭제하는 기능이 포함된 컴포넌트.
- **`SubscriptionStatus.tsx`**: 사용자의 현재 구독 상태와 결제 정보를 관리하는 컴포넌트.

#### 4.6. 관리자 (Admin)

- **`AdminStatCard.tsx`**: 관리자 대시보드의 핵심 지표(e.g., 총 가입자 수)를 보여주는 요약 카드.
- **`AdminUserTable.tsx`**: 사용자 검색, 필터링, 역할 변경 등의 기능이 포함된 사용자 관리 테이블.
