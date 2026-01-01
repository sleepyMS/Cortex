# 🛠️ 02. 기술 스택 (Tech Stack)

이 문서는 'Project: Cortex'를 구성하는 모든 주요 기술, 라이브러리, 서비스와 그 선택 이유를 기술합니다.

## 1. 프론트엔드 (Frontend)

### Core

- **Framework: Next.js (App Router)**
  - **이유:** React Server Components를 통한 성능 최적화, 파일 기반 라우팅, 강력한 생태계를 바탕으로 현대적인 웹 애플리케이션 개발에 가장 적합합니다.
- **Language: TypeScript**
  - **이유:** 정적 타이핑을 통해 코드의 안정성과 예측 가능성을 높여 장기적인 유지보수에 필수적입니다.
- **Styling: Tailwind CSS**
  - **이유:** 유틸리티 우선 접근 방식은 빠른 개발 속도와 일관된 디자인 시스템 구축을 용이하게 합니다.

### API 데이터 핸들링

- **명명 규칙:** 백엔드 API로부터 받는 모든 데이터는 **`camelCase`** 형식입니다. 따라서 `interface`, `type` 등 모든 타입 정의와 데이터 속성 접근은 `camelCase`를 사용해야 합니다. (예: `result.totalReturnPct`)
- **타입 정의:** API 응답에 대한 타입은 `src/types` 폴더 내에 명확히 정의하여 사용합니다.

### State & Data Fetching

- **State Management: Zustand & TanStack Query**
  - **이유:** 클라이언트 상태(Zustand)와 서버 상태(TanStack Query)를 명확히 분리하여 관리합니다. 두 라이브러리 모두 가볍고 직관적인 사용법을 제공합니다.

### Libraries

- **Form Handling: React Hook Form & Zod**
  - **이유:** 복잡한 폼의 상태 관리와 유효성 검사를 선언적이고 효율적으로 처리하기 위한 최고의 조합입니다.
- **Charting: Lightweight Charts**
  - **이유:** 트레이딩뷰(TradingView)에서 만든 고성능 금융 차트 라이브러리로, 백테스팅 결과 시각화에 가장 적합합니다.

## 2. 백엔드 (Backend)

### Core

- **Framework: FastAPI (Python)**
  - **이유:** 높은 성능, 자동 API 문서 생성, Pydantic을 통한 강력한 데이터 유효성 검사 등 개발 생산성과 실행 성능을 모두 만족시키는 현대적인 비동기 프레임워크입니다.
- **Data Processing: Pandas & Pandas-TA**
  - **이유:** `Pandas`는 데이터 조작의 표준이며, `Pandas-TA`는 수백 가지의 기술적 지표(다이버전스, 캔들스틱 패턴 포함) 계산을 지원하는 가장 성숙한 라이브러리입니다. 이를 통해 복잡한 계산 로직을 안정적으로 구현할 수 있습니다.

### AI/ML (Machine Learning)

- **Deep Learning Framework: PyTorch**
  - **이유:** 동적 계산 그래프, 직관적인 API, 금융 시계열 모델링(LSTM, GRU, TFT)에 적합한 유연성을 제공합니다. 학계와 산업계 모두에서 널리 사용되어 풍부한 레퍼런스를 확보할 수 있습니다.
- **Inference Runtime: ONNX Runtime**
  - **이유:** 학습된 PyTorch 모델을 ONNX 포맷으로 변환하여, 추론 시 Python 런타임 오버헤드 없이 빠르고 경량화된 예측을 가능하게 합니다.
- **Hyperparameter Optimization: Optuna**
  - **이유:** 베이지안 최적화 기반으로 모델 하이퍼파라미터(hidden_size, dropout, learning_rate 등)를 효율적으로 탐색하여 최적의 모델 성능을 도출합니다.
- **ML Utilities: scikit-learn**
  - **이유:** 데이터 전처리(StandardScaler), 평가 지표(Accuracy, F1, Confusion Matrix), 데이터 분할(TimeSeriesSplit) 등 ML 파이프라인 전반에 활용됩니다.

### Database & Auth

- **ORM & Driver: SQLAlchemy (Asyncio) & asyncpg**
  - **이유:** Python 표준 비동기 ORM(SQLAlchemy)과 고성능 비동기 PostgreSQL 드라이버(`asyncpg`) 조합으로, I/O 작업 시 블로킹을 최소화하여 서버의 동시 처리 성능을 극대화합니다.
- **Authentication: Passlib & python-jose**
  - **이유:** 안전한 비밀번호 해싱(Passlib)과 표준 JWT 토큰 처리(python-jose)를 위한 검증된 라이브러리 조합입니다.

### Async & Background Tasks

- **Task Queue: Celery & Redis**
  - **이유:** 백테스팅, AI 모델 학습, 자동매매, 데이터 수집 등 시간이 오래 걸리는 작업을 웹 요청과 분리하여 백그라운드에서 안정적으로 처리하기 위한 Python 표준 조합입니다.
- **Scheduling: Celery Beat**
  - **이유:** Celery에 내장된 스케줄러로, 주기적인 작업(예: 매시간 데이터 수집, AI 모델 자동 재학습)을 별도의 라이브러리 없이 안정적으로 관리할 수 있습니다.
- **Data Fetching: CCXT (async support)**
  - **이유:** 전 세계 대부분의 암호화폐 거래소 API를 표준화된 비동기 방식으로 호출할 수 있게 해주는 필수 라이브러리입니다.

## 3. 데이터베이스 (Database)

- **Primary DB: PostgreSQL**
  - **이유:** 검증된 안정성, 풍부한 기능, 강력한 생태계를 갖춘 오픈소스 관계형 데이터베이스의 표준입니다.
- **Time-Series Extension: TimescaleDB**
  - **이유:** PostgreSQL 확장 프로그램으로, 하나의 DB 내에서 관계형 데이터와 대용량 시계열(OHLCV) 데이터를 모두 최고 성능으로 처리할 수 있어 인프라 관리가 매우 용이합니다.

## 4. 인프라 및 서드파티 (Infrastructure & 3rd Party)

- **Local Environment: Docker**
  - **이유:** `docker-compose`를 통해 로컬 개발 환경(DB, Redis 등)을 코드로 관리하고, 환경 일관성을 보장합니다.
- **Frontend Deployment: Vercel**
  - **이유:** Next.js와 최고의 궁합을 보이며, CI/CD 파이프라인 구축, 글로벌 CDN 등 강력한 기능을 제공합니다.
- **Backend Deployment: Docker on Cloud (e.g., AWS, GCP)**
  - **이유:** Docker 컨테이너를 통해 어떤 클라우드 환경에서든 일관성 있는 서버 배포를 보장합니다.
- **Payment Gateway: Toss Payments**
  - **이유:** 국내 결제 환경에 최적화된 구독 시스템 구현을 위한 결제 연동 서비스입니다.
