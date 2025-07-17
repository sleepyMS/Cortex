# 03. 화면 정의서 (Screen Definition)

## [Screen-01] 메인 대시보드

- **Path:** `/dashboard`
- **역할:** 로그인 후 가장 먼저 보게 될 페이지. 자산 현황과 실행 중인 봇의 요약 정보를 보여준다.
- **필요 API:**
  - `GET /api/assets`
  - `GET /api/bots/status`

## [Screen-02] 백테스터 페이지

- **Path:** `/backtester`
- **역할:** 사용자가 전략을 선택하고 조건을 입력하여 백테스팅을 실행하고 결과를 확인하는 페이지.
- **주요 컴포넌트:**
  - `StrategySelector`: 전략 선택 드롭다운
  - `ParameterForm`: 전략 파라미터 입력 폼
  - `ResultChart`: 결과 시각화 차트
  - `ResultTable`: 결과 지표 테이블
- **필요 API:**
  - `GET /api/strategies` (전략 목록 가져오기)
  - `POST /api/backtests` (백테스팅 실행)
