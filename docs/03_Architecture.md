# 🏗️ 03. 아키텍처 (Architecture)

이 문서는 'Project: Cortex'의 전체 시스템 구성과 데이터 흐름, 그리고 각 구성 요소의 역할을 정의합니다.

---

## 1. 시스템 구조도 (System Architecture Diagram)


```mermaid
graph TD
    subgraph "Client Layer"
        User["👤 사용자"] --> Browser[/"💻 웹 브라우저 (Next.js)"/]
    end

    Browser -- API Request --> APIGateway[API Gateway]

    subgraph "Cortex Backend (Hybrid MSA)"
        APIGateway -- Route --> WebService["<b>Web & Community Service</b><br>(Well-Structured Monolith)<br>- Authentication<br>- Marketplace<br>- Community"]

        subgraph "Core Quant Engine"
            APIGateway -- Route --> BacktestService["<b>Backtesting Service</b><br>(Microservice)"]
            APIGateway -- Route --> OptimizationService["<b>Optimization Service</b><br>(Microservice)"]
        end

        subgraph "Internal Communication"
            WebService -- Publish Event --> MessageBus[(Message Bus)]
            BacktestService -- Subscribe/Publish --> MessageBus
            OptimizationService -- Subscribe/Publish --> MessageBus
        end
    end

    WebService --> WebDB[(DB for Web Service)]
    BacktestService --> QuantDB[(DB for Quant Engine)]
    OptimizationService --> QuantDB

```
    
```mermaid
graph TD
    subgraph "User's Browser"
        User["👤 사용자"] --> Browser[/"💻 웹 브라우저 (Next.js)"/]
    end

    subgraph "Vercel"
        Browser -- HTTPS Request --> FE[Frontend UI/UX]
    end

    subgraph "Cloud Server (e.g., AWS, GCP)"
        subgraph "API & Web Server"
            FE -- API Call --> BE[<b>FastAPI Backend</b><br>Store, Marketplace, Credit, Settlement Services]
            Browser -- WebSocket --> BE
        end

        subgraph "Database"
            BE --> DB[(PostgreSQL w/ TimescaleDB)]
            Celery[Celery Workers] --> DB
        end

        subgraph "Async Task Queue & Event Bus"
            BE -- Enqueue Job / Publish Event --> Redis[Redis]
            Redis -- Dequeue Job / Subscribe Event --> Celery
        end
    end

    subgraph "Third-Party Services"
        Browser -- Checkout --> PaymentGW["💳 Toss Payments"]
        PaymentGW -- Webhook --> BE
        Celery -- Exchange API Call --> CCXT["CCXT Library<br>via Exchange"]
        Celery -- Email Send --> EmailSvc["📧 이메일 서비스<br>(e.g., SendGrid)"]
    end
```

---

## 2. 구성 요소 역할 및 데이터 흐름

### 2.1. 기본 API 요청 흐름

1.  **사용자 (User):** 브라우저를 통해 프론트엔드(Next.js)와 상호작용합니다.
2.  **프론트엔드 (Next.js on Vercel):** 사용자의 요청에 따라 UI를 렌더링하고, 백엔드(FastAPI)에 API를 호출하여 데이터를 주고받습니다.
3.  **백엔드 (FastAPI on Cloud):** API 요청을 받아 인증, 비즈니스 로직 처리 후 데이터베이스와 통신하여 결과를 프론트엔드에 반환합니다.

### 2.2. 플랫폼 경제 및 비동기 처리 흐름

플랫폼의 경제 시스템은 **'크레딧 충전(B2C)'**과 **'전략 구매(P2P)'**라는 두 가지 핵심 흐름으로 구성되며, 안정적인 처리를 위해 이벤트 기반 비동기 방식을 적극적으로 활용합니다.

#### **2.2.1. 크레딧 충전 (B2C 현금 거래)**

1.  **충전 요청:** 사용자가 프론트엔드에서 '크레딧 팩' 구매를 요청하면, 백엔드 **Store Service**는 **Toss Payments 결제**에 필요한 정보를 프론트엔드에 전달합니다.
2.  **Webhook 수신:** 결제가 성공하면, **Toss Payments가 백엔드의 Webhook 엔드포인트로 비동기 알림**을 보냅니다.
3.  **이벤트 발행 (Publish):** Webhook 엔드포인트는 `payment.credit_charge.succeeded`와 같은 명확한 '이벤트'를 Redis(메시지 버스)에 발행하고 즉시 `200 OK`로 응답하여 Toss Payments와의 통신을 종료합니다.
4.  **이벤트 처리 (Consume):** 별도의 Celery 워커가 이벤트를 구독하고 있다가, `CreditService`를 호출하여 사용자에게 `source_type='PURCHASE'`인 **'유료 크레딧'을 지급**하고 `credits_ledgers`에 내역을 기록하는 후속 작업을 비동기적으로 처리합니다.

#### **2.2.2. 전략 구매 및 정산 (P2P 크레딧 거래)**

1.  **구매 요청:** 사용자가 마켓플레이스에서 다른 사용자의 전략을 **크레딧**으로 구매 요청합니다.
2.  **동기 처리:** 이 거래는 동기적으로 처리됩니다. **Marketplace Service**는 다음 로직을 **하나의 DB 트랜잭션** 내에서 실행합니다.
    a. **Credit Service 호출:** 구매자의 **'유료 크레딧'** 잔액을 확인하고 차감합니다. (무료 크레딧은 사용 불가)
    b. **Settlement Service 호출:** 판매 수수료를 계산하여 `settlements` 테이블에 판매자에 대한 **'정산 예정액(KRW)'**을 기록합니다.
    c. `marketplace_orders` 생성 및 아이템 지급(e.g., `user_unlocked_items` 추가)을 처리합니다.
3.  **결과 응답:** 트랜잭션이 성공적으로 완료되면, 사용자에게 즉시 구매 성공을 알립니다.
4.  **정산 실행:** 매월 정산일에, 관리자는 별도의 백오피스 기능을 통해 `settlements` 테이블 기록을 바탕으로 판매자에게 **실제 현금**을 이체합니다.

### 2.3. 비동기 백테스팅 흐름

1.  **비용 견적 및 크레딧 차감:** 사용자가 백테스팅을 요청하면, FastAPI 서버는 **CostCalculationService**를 통해 소모 크레딧을 계산하고, **CreditService**를 통해 사용자의 **모든 크레딧(무료+유료)**을 차감합니다.
2.  **Job Enqueue:** 크레딧 차감이 성공하면, DB에 `Backtest` 객체를 `pending` 상태로 생성하고 **Celery에 작업(`run_backtest`)을 등록(Enqueue)**한 뒤, 사용자에게는 "요청이 접수되었습니다"라고 즉시 응답합니다.
3.  **Job Dequeue & Execution:** 별도의 서버에서 대기하던 **Celery Worker**가 Redis를 통해 작업을 전달받아 실제 백테스팅 시뮬레이션을 실행합니다.
4.  **Execution & Result:** Celery Worker는 시세 데이터를 조회하고, 복잡한 계산을 수행한 뒤, 최종 결과를 데이터베이스에 저장하고 `Backtest` 객체의 상태를 `completed` 또는 `failed`로 업데이트합니다.

### 2.4. 실시간 통신 흐름 (WebSocket)

1.  **Connection:** 사용자가 백테스팅 결과 페이지에 접속하면, 프론트엔드는 `/ws/backtest/{backtest_id}`로 WebSocket 연결을 요청합니다.
2.  **Subscription:** FastAPI 서버는 Redis의 Pub/Sub 채널(`ws:backtest:{backtest_id}`)을 구독합니다.
3.  **Real-time Update:** 백그라운드 Celery 워커에서 실행되는 백테스팅 작업은 진행률이 바뀔 때마다 Redis 채널로 상태 메시지를 발행(Publish)합니다.
4.  **Message Push:** FastAPI 서버는 Redis 채널에서 메시지를 수신하는 즉시, 연결된 WebSocket 클라이언트에게 해당 메시지를 실시간으로 전달합니다.

---

## 3. 프로젝트 폴더 구조 (Project Folder Structure)

```text
Cortex/
│
├── .gitignore
├── README.md
├── PROJECT_ROADMAP.md
├── docker-compose.yml
│
├── docs/ # 모든 기획 및 설계 문서 (00~10번)
│
├── backend/ # FastAPI 백엔드 프로젝트 루트
│ ├── .venv/
│ ├── .env
│ ├── main.py
│ ├── requirements.txt
│ ├── app/ # 백엔드 소스코드 폴더
│ ├── routers/ # API 엔드포인트 라우터 (e.g., users.py, marketplace.py)
│ ├── services/ # 비즈니스 로직 (e.g., user_service.py, marketplace_service.py)
│ ├── gateways/ # 외부 서비스 API 클라이언트 (e.g., toss_payments_client.py)
│ ├── models/ # DB 테이블 모델 (SQLAlchemy)
│ ├── templates/ # 이메일 템플릿 (Jinja2)
│ ├── schemas.py # 데이터 유효성 검사 스키마 (Pydantic)
│ ├── dependencies.py # 의존성 주입 (DB 세션, 사용자 인증 등)
│ ├── event_bus.py # 이벤트 발행 로직
│ ├── tasks.py # Celery 백그라운드 작업 정의
│ └── celery_app.py # Celery 앱 설정
│
├── frontend/ # Next.js 프론트엔드 프로젝트 루트
│ ├── .next/
│ ├── node_modules/
│ ├── public/
│ ├── src/ # 핵심 소스 코드
│ │ ├── app/
│ │ │ ├── [locale]/
│ │ │ ├── layout.tsx
│ │ │ ├── page.tsx
│ │ │ └── ... (dashboard/, backtester/, marketplace/ 등 페이지 폴더)
│ │ ├── components/
│ │ │ ├── ui/
│ │ │ ├── layout/
│ │ │ └── domain/
│ │ ├── lib/
│ │ │ ├── apiClient.ts
│ │ │ └── utils.ts
│ │ ├── hooks/
│ │ ├── messages/ # 다국어 지원 텍스트 (en.json, ko.json)
│ │ ├── store/ # Zustand 전역 상태 관리
│ │ └── middleware.ts
│ │
│ ├── i18n.ts
│ ├── .env.local # 프론트엔드 환경 변수
│ ├── next.config.ts # Next.js 메인 설정
│ └── tsconfig.json # TypeScript 설정
```
