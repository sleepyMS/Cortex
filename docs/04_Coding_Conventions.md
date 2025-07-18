# 📜 04. 코딩 컨벤션 (Coding Conventions)

이 문서는 'Project: Cortex'의 코드 일관성과 가독성, 유지보수성을 높이기 위한 규칙들을 정의합니다.

## 1. 공통 컨벤션

### Git Branch Strategy

- **`main`**: 프로덕션(배포) 브랜치. 오직 `develop` 또는 `hotfix` 브랜치만 merge 가능합니다.
- **`develop`**: 개발의 기준이 되는 메인 브랜치. 모든 기능 개발은 이 브랜치로부터 시작됩니다.
- **`feature/기능-이름`**: 새로운 기능 개발 브랜치. (e.g., `feature/login-page`, `feature/backtest-engine`)
- **`fix/수정-내용`**: 버그 수정을 위한 브랜치.
- **`docs/문서-이름`**: 문서 추가 및 수정을 위한 브랜치.

### Commit Message Convention

> 커밋 메시지는 변경 내용을 명확히 알 수 있도록 타입과 제목으로 구성합니다.

- **`feat:`**: 새로운 기능 추가
- **`fix:`**: 버그 수정
- **`docs:`**: 문서 수정
- **`style:`**: 코드 포맷팅, 세미콜론 누락, 공백 등 (코드 로직 변경 없음)
- **`refactor:`**: 코드 리팩토링
- **`test:`**: 테스트 코드 추가/수정
- **`chore:`**: 빌드, 패키지 매니저 설정 등 기타 작업

**예시:** `feat: JWT 기반 로그인 API 구현`

## 2. 프론트엔드 (Next.js)

### 기본 원칙

- **컴포넌트 기반 아키텍처:** 모든 UI 요소는 독립적이고 재사용 가능한 컴포넌트로 분리합니다. 각 컴포넌트는 단일 책임을 지향합니다.
- **관심사 분리:** UI(JSX), 로직(Hooks), 스타일(Tailwind)을 명확하게 분리합니다.
- **apiClient:** 백엔드와 통신할 중앙 API 클라이언트를 설정하여 관리해야 합니다.

### 폴더 구조

- **/app**: 라우팅 단위 페이지 및 레이아웃 (`page.tsx`, `layout.tsx`)
- **/components**: 재사용 가능한 컴포넌트
  - **/ui**: 버튼, 인풋, 모달 등 프로젝트 전반에서 사용되는 범용 컴포넌트
  - **/domain**: 특정 도메인(e.g., 백테스팅, 대시보드)에 종속된 복합 컴포넌트
- **/hooks**: 여러 컴포넌트에서 재사용되는 커스텀 훅 (e.g., `useAuth`, `useMediaQuery`)
- **/lib**: 유틸리티 함수, API 클라이언트 인스턴스 등
- **/store**: Zustand를 사용한 전역 상태 관리 로직
- **/styles**: `globals.css` 등 전역 스타일 정의

### 명명 규칙

- **컴포넌트:** `PascalCase` (e.g., `SubmitButton.tsx`, `UserProfile.tsx`)
- **훅:** `use` 접두사를 사용한 `camelCase` (e.g., `useAuth.ts`)
- **기타 파일:** `camelCase` (e.g., `apiClient.ts`, `formatDate.ts`)

### 상태 관리

- **서버 상태 (Server State):** `TanStack Query` (`useQuery`, `useMutation`)를 사용하여 API 데이터의 fetching, caching, synchronization을 관리합니다.
- **전역 클라이언트 상태 (Global Client State):** `Zustand`를 사용하여 여러 페이지/컴포넌트에서 공유해야 하는 상태(e.g., 사용자 정보, 테마 모드)를 관리합니다.
- **컴포넌트 지역 상태 (Local Component State):** `useState`, `useReducer`를 사용하여 단일 컴포넌트 내에서만 유효한 상태를 관리합니다.

## 3. 백엔드 (FastAPI)

### 폴더 구조

- 기능/도메인 단위로 폴더를 분리합니다. (e.g., `/auth`, `/backtests`, `/strategies`)
- 각 도메인 폴더는 일반적으로 다음 파일들을 포함합니다:
  - `router.py`: API 엔드포인트 정의
  - `service.py`: 핵심 비즈니스 로직
  - `schemas.py`: Pydantic 스키마 (데이터 유효성 검사 및 형태 정의)
  - `models.py`: SQLAlchemy 모델 (DB 테이블 정의)

### 코드 스타일

- **의존성 주입 (Dependency Injection):** FastAPI의 `Depends`를 적극적으로 활용하여 비즈니스 로직(service)과 라우터(router)를 분리합니다. 이는 코드의 재사용성과 테스트 용이성을 높입니다.
- **스키마 활용:** 모든 API 요청(Request Body)과 응답(Response Model)은 Pydantic 스키마를 사용하여 타입을 명시합니다. 이는 데이터의 유효성을 보장하고, API 문서를 자동으로 생성하는 데 필수적입니다.
- **명명 규칙:** 모든 변수, 함수, 파일명은 PEP 8에 따라 `snake_case`를 사용합니다.
