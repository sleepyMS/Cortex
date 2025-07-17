# 🛠️ 02. 기술 스택 (Tech Stack)

이 문서는 'Project: Cortex'를 구성하는 모든 주요 기술, 라이브러리, 서비스와 그 선택 이유를 기술합니다.

## 1. 프론트엔드 (Frontend)

### Core

- **Framework: Next.js (App Router)**
  - **이유:** React Server Components를 통한 성능 최적화, 파일 기반 라우팅, 강력한 생태계를 바탕으로 현대적인 웹 애플리케이션 개발에 가장 적합합니다.
- **Language: TypeScript**
  - **이유:** 정적 타이핑을 통해 코드의 안정성과 예측 가능성을 높여 장기적인 유지보수에 필수적입니다.
- **Styling: Tailwind CSS**
  - **이유:** 빌드 시점 생성으로 런타임 오버헤드가 없으며, 유틸리티 우선 접근 방식은 빠른 개발 속도와 일관된 디자인 시스템 구축을 용이하게 합니다.

### State & Data Fetching

- **State Management: Zustand & TanStack Query**
  - **이유:** 클라이언트 상태(Zustand)와 서버 상태(TanStack Query)를 명확히 분리하여 관리합니다. 두 라이브러리 모두 가볍고 직관적인 사용법을 제공합니다.

### Libraries

- **Form Handling: React Hook Form & Zod**
  - **이유:** 복잡한 폼의 상태 관리와 유효성 검사를 선언적이고 효율적으로 처리하기 위한 최고의 조합입니다.
- **Charting: Lightweight Charts**
  - **이유:** 트레이딩뷰(TradingView)에서 만든 고성능 금융 차트 라이브러리로, 백테스팅 결과 시각화에 가장 적합합니다.
- **Data Grid: TanStack Table**
  - **이유:** 거래 로그, 사용자 목록 등 복잡한 테이블을 헤드리스(UI 분리) 방식으로 구현하여 높은 자유도와 성능을 제공합니다.
- **Date Picker: React Day Picker**
  - **이유:** 날짜 및 기간 선택 UI를 손쉽게 구현할 수 있는 검증되고 접근성 높은 라이브러리입니다.

## 2. 백엔드 (Backend)

### Core

- **Framework: FastAPI (Python)**
  - **이유:** 높은 성능, 자동 API 문서 생성, Pydantic을 통한 강력한 데이터 유효성 검사 등 개발 생산성과 실행 성능을 모두 만족시킵니다.
- **Data Processing: Polars**
  - **이유:** 대용량 백테스팅 데이터 처리 시 Pandas 대비 월등한 성능을 보이며, 멀티코어 활용 및 메모리 효율성이 뛰어납니다.

### Database & Auth

- **ORM & Driver: SQLAlchemy & Psycopg2**
  - **이유:** Python 진영의 표준 ORM(SQLAlchemy)과 PostgreSQL 드라이버(Psycopg2)로 안정성과 생태계가 검증되었습니다.
- **Authentication: Passlib & python-jose**
  - **이유:** 안전한 비밀번호 해싱(Passlib)과 표준 JWT 토큰 처리(python-jose)를 위한 검증된 라이브러리 조합입니다.

### Async & Background Tasks

- **Task Queue: Celery & Redis**
  - **이유:** 전략 최적화, 데이터 수집 등 시간이 오래 걸리는 작업을 웹 요청과 분리하여 백그라운드에서 안정적으로 처리하기 위한 Python 표준 조합입니다. Redis는 메시지 브로커 역할을 합니다.
- **Data Fetching: CCXT**
  - **이유:** 전 세계 대부분의 암호화폐 거래소 API를 표준화된 방식으로 호출할 수 있게 해주는 필수 라이브러리입니다.
- **Scheduling: APScheduler**
  - **이유:** 주기적인 데이터 수집과 같은 스케줄링 작업을 애플리케이션 내에서 쉽게 구현할 수 있습니다.

## 3. 데이터베이스 (Database)

- **Primary DB: PostgreSQL**
  - **이유:** 검증된 안정성, 풍부한 기능, 강력한 생태계를 갖춘 오픈소스 관계형 데이터베이스의 표준입니다.
- **Time-Series Extension: TimescaleDB**
  - **이유:** PostgreSQL 확장 프로그램으로, 하나의 DB 내에서 관계형 데이터와 대용량 시계열(OHLCV) 데이터를 모두 최고 성능으로 처리할 수 있어 인프라 관리가 매우 용이합니다.

## 4. 인프라 및 서드파티 (Infrastructure & 3rd Party)

- **Local Environment: Docker**
  - **이유:** `docker-compose`를 통해 로컬 개발 환경(DB, Redis 등)을 코드로 관리하고, 환경 일관성을 보장합니다.
- **Frontend Deployment: Vercel**
  - **이유:** Next.js와 최고의 궁합을 보이며, CI/CD 파이프라인 구축, 글로벌 CDN, 미리보기 배포 등 강력한 기능을 제공합니다.
- **Backend Deployment: Docker on Cloud (e.g., AWS, GCP)**
  - **이유:** Docker 컨테이너를 통해 어떤 클라우드 환경에서든 일관성 있는 서버 배포를 보장합니다.
- **Payment Gateway: Stripe / I'mport (아임포트)**
  - **이유:** 구독 시스템 구현을 위한 결제 연동 서비스입니다. 해외는 Stripe, 국내는 아임포트가 개발자 친화적인 문서와 강력한 기능을 제공합니다.
