# 📔 08. 개발 일지 (Development Log)

이 문서는 프로젝트 진행 중 발생한 주요 기술적 결정, 문제 해결 과정, 그리고 중요한 변경 사항들을 시간 순서(최신순)로 기록합니다. 왜 그런 결정을 내렸는지에 대한 맥락을 보존하여, 미래의 유지보수 및 협업에 도움을 주는 것을 목표로 합니다.

---

### 2025-07-24

- **주제:** 전략 빌더 페이지 레이아웃 및 스크롤 처리 개선
- **내용:**
  - **문제:** `AND` 조건이 깊게 중첩될 때, `Card` 컴포넌트의 너비가 고정되어 내용물이 캔버스 영역을 벗어나 잘리는 문제 발생. 또한, `AND` 라벨의 디자인 및 긴 세로선의 필요성에 대한 논의 진행.
  - **원인 분석:** `RuleBlock.tsx`의 최상위 `div`가 `w-full` 속성을 가져 부모의 너비에 고정되고, `RecursiveRuleRenderer`의 들여쓰기(`pl-8`)가 누적되면서 `Card` 내부 콘텐츠가 오버플로우됨.
  - **해결:**
    - `RuleBlock.tsx`의 최상위 `div`에서 `w-full` 클래스를 제거하고, `Card` 컴포넌트에 `min-w-max` 클래스를 추가하여 내부 콘텐츠의 최소 너비에 따라 `Card` 자체가 확장되도록 함.
    - `StrategyBuilderCanvas.tsx`의 "매수 조건" 및 "매도 조건" 영역을 감싸는 `div`에 `overflow-x-auto` 클래스를 추가하여, 내용물이 넘칠 경우 좌우 스크롤이 가능하도록 처리함.
    - `AND` 라벨 디자인을 더 미니멀하게 개선하고, `RuleBlock`의 `border-l-2`와 `AND` 라벨만으로 시각적 계층을 표현하기 위해 `RecursiveRuleRenderer`에서 불필요한 긴 세로선을 제거하거나 단순화함 (이는 `RuleBlock.tsx`에서 `paddingLeft` 제거 및 `RecursiveRuleRenderer`의 `pl-8`로 들여쓰기 제어로 이어짐).

---

### 2025-07-23

- **주제:** 전략 빌더 페이지의 전반적인 레이아웃 및 디자인 시스템 적용
- **내용:**
  - `StrategyBuilderCanvas.tsx`의 "매수 조건"과 "매도 조건" 영역에 `rounded-xl`, `shadow-xl`, `border border-border`, `transition-all`, `hover:shadow-2xl`, `hover:border-primary/50` 클래스를 적용하여 시각적으로 돋보이는 패널 형태로 개선함.
  - 각 영역 헤더에 `border-b pb-4 mb-4 border-border/50`를 추가하여 제목과 내용 구분을 명확히 함.
  - `RuleBlock.tsx`의 `Card` 디자인을 `p-3 rounded-lg shadow-sm` 등으로 개선하고, `depth`에 따른 `bg-*` 및 `border-l-2 border-primary/*` 스타일을 동적으로 적용하여 시각적 계층 구조를 강화함.
  - `ConditionSlot`의 비어있는 슬롯, 값 슬롯, 지표 슬롯의 스타일을 개선하여 직관성과 트렌디함을 높임.
  - `ParameterPopover.tsx`에 현재 지표 이름 표시 및 '지표 변경' 버튼(`RefreshCcw` 아이콘 포함)을 추가하여 사용자 편의성을 높임.
  - `page.tsx` (`frontend/src/app/[locale]/strategies/new/page.tsx`)의 `AuthGuard` 내부에 `container mx-auto max-w-5xl px-4 py-8` 클래스를 직접 적용하여 페이지 콘텐츠의 일관된 중앙 정렬 및 패딩을 확보함. (이후 `py-8` 제거, `PageWrapper` 재조정)
  - 매수/매도 조건이 PC에서도 위아래로 표시되도록 `StrategyBuilderCanvas.tsx`에서 `lg:grid-cols-2` 클래스를 제거함.

---

### 2025-07-22

- **주제:** `useStrategyState` 훅 활용 및 상태 관리 중앙화
- **내용:**
  - `frontend/src/app/[locale]/strategies/new/page.tsx`에서 `useStrategyState` 훅을 사용하여 `buyRules`, `sellRules` 및 관련 상태 관리 로직(`addRule`, `deleteRule`, `updateRuleData`, `updateBlockCondition`)을 중앙 집중화함.
  - `StrategyBuilderCanvas` 컴포넌트는 더 이상 자체적으로 상태를 관리하지 않고, `page.tsx`로부터 필요한 상태와 핸들러 함수들을 `props`로 전달받는 표현 컴포넌트(Presentational Component) 역할을 하도록 구조를 변경함.
  - 이를 위해 `StrategyBuilderCanvas.tsx`의 `props` 인터페이스를 명확하게 정의하고, 내부 `renderRuleList` 함수 및 버튼 `onClick` 핸들러에서 전달받은 `props` 함수들을 호출하도록 수정함.

---

### 2025-07-21

- **주제:** 지표 허브(IndicatorHub) 모달 반응형 레이아웃 및 UI 개선
- **내용:**
  - `IndicatorHub.tsx`의 `DialogContent` 클래스를 `w-[calc(100%-2rem)] md:w-full md:max-w-4xl`로 설정하고, 내부 요소의 `px-6` 패딩을 `px-4 sm:px-6`으로 조정하여 모바일에서 모달이 화면을 벗어나지 않고 적절한 여백을 갖도록 시도함.
  - `DialogHeader`에 `border-border/50`를 추가하고 `Input`, `TabsList`, 지표 아이템(`div`)의 스타일을 개선하여 시각적 일관성과 트렌디함을 높임.
  - `Dialog.tsx` 파일 내 `DialogContent`의 기본 스타일(특히 `p-6`, `border`, `shadow-lg`)이 `w-full`과 충돌하여 모달 너비가 뷰포트를 초과하는 근본적인 문제 진단.
  - `Dialog.tsx`에서 `DialogContent`의 기본 `p-0 border-0 shadow-none`으로 오버라이드하고, `w-[calc(100vw-2rem)]` 및 반응형 `max-w`를 적용하여 모달 자체의 너비 제어를 강화하는 방향으로 수정 결정.

---

### 2025-07-20

- **주제:** `RuleBlock`의 시각적 계층 구조 및 지표 설정 UI 개선
- **내용:**
  - `RuleBlock.tsx`의 `paddingLeft` 속성을 제거하고, `RecursiveRuleRenderer`에서 `pl-` 클래스를 통해 들여쓰기를 전적으로 담당하도록 변경하여 중첩 깊이에 따른 레이아웃 오버플로우 문제를 해결함.
  - `RuleBlock.tsx`의 `Card` 배경색 제어를 `depthStyles`에 완전히 위임하고, `Card` 컴포넌트 자체에 `min-w-max`를 추가하여 내용물에 따라 너비가 확장되도록 함.
  - `ConditionSlot` 내부의 '추가' 버튼 텍스트를 언어팩(`next-intl`)으로 처리할 계획을 수립하고, '유효하지 않은 지표', '알 수 없는 지표' 등의 메시지를 다국어 처리하도록 함.
  - `indicators.ts`의 `IndicatorDefinition` 및 `IndicatorParameter` 타입을 `nameKey`, `descriptionKey` 기반으로 변경하여 지표 이름 및 파라미터 이름의 다국어 지원을 위한 기반을 마련함.

---

### 2025-07-19

- **주제:** 전략 빌더 페이지 초기 디자인 및 구조화
- **내용:**
  - `StrategyBuilderCanvas.tsx`, `RuleBlock.tsx`, `ParameterPopover.tsx`, `IndicatorHub.tsx` 등 핵심 컴포넌트의 초기 구조를 설계하고 구현을 시작함.
  - 아토믹 디자인 철학에 따라 `ui`, `layout`, `domain` 컴포넌트 계층을 정의하고, `StrategyBuilder` 관련 컴포넌트들을 `domain` 계층에 위치시킴.
  - `RecursiveRuleRenderer`를 통해 중첩된 전략 규칙을 시각적으로 표현하는 기본 로직을 구현함.
  - `RuleBlock` 간의 논리 연산자(`AND`/`OR`)를 시각적으로 구분하는 아이디어를 구상하고 구현 시작.

---

### 2025-07-18

- **주제:** 프로젝트 전체 문서 구조 최종 확정 및 템플릿 완성
- **내용:**
  - `docs` 폴더 내에 00번부터 10번까지, 그리고 최상위 폴더에 `PROJECT_ROADMAP.md`를 포함하는 체계적인 문서 구조를 최종적으로 확정함.
  - 각 문서의 템플릿을 완성하여 향후 개발의 명확한 가이드라인으로 삼기로 결정함.
  - 이 문서들을 기반으로 본격적인 기능 개발에 착수할 모든 준비를 마침.

---

### 2025-07-17

- **주제:** 데이터베이스 기술 스택 최종 결정
- **결정:** PostgreSQL + TimescaleDB 확장 기능 사용
- **이유:**
  - 두 개의 DB(PostgreSQL+InfluxDB)를 관리하는 복잡성을 피하고, 단일 DB에서 관계형 데이터와 시계열 데이터를 모두 처리하기 위함.
  - 인프라 단순화와 표준 SQL을 사용한 통합 쿼리의 이점을 고려하여 최종 결정.

---
