# 🏗️ 03. 아키텍처 (Architecture)

이 문서는 'Project: Cortex'의 전체 시스템 구성과 데이터 흐름, 그리고 각 구성 요소의 역할을 정의합니다.

---

## 1. 시스템 구조도 (System Architecture Diagram)

```mermaid
graph TD
    subgraph "User's Browser"
        User["👤 사용자"] --> Browser[/"💻 웹 브라우저 (Next.js on Vercel)"/]
    end

    subgraph "Cloud Infrastructure (e.g., AWS, Render)"
        Browser -- HTTPS Request --> ALB[Load Balancer]

        subgraph "Application Services (Auto-scaled)"
            ALB -- HTTP --> API[<b>API Service (FastAPI)</b><br>api.cortex.com<br><i>I/O Bound, 1-N Instances</i>]
            ALB -- WebSocket --> API
        end

        subgraph "Background Services (Decoupled)"
            CPU_Worker[<b>CPU Worker (Celery)</b><br><i>CPU Bound, 1-N Instances</i>]
            IO_Worker[<b>I/O Worker (Celery)</b><br><i>I/O Bound, 1-N Instances</i>]
            Beat[<b>Beat Scheduler (Celery)</b><br><i>Singleton, 1 Instance</i>]
        end

        subgraph "Core Infrastructure"
            API -- 작업 발행 (Publish) --> Redis[(<b>Managed Redis</b><br>Celery Broker & Pub/Sub)]
            CPU_Worker -- `cpu_bound_queue` 구독 --> Redis
            IO_Worker -- `io_bound_queue` 구독 --> Redis
            Beat -- 작업 스케줄링 --> Redis

            API -- CRUD --> DB[(<b>Managed DB</b><br>PostgreSQL w/ TimescaleDB)]
            CPU_Worker -- 결과 저장 --> DB
            IO_Worker -- 상태 업데이트 --> DB
        end
    end

    subgraph "Third-Party Services"
        Browser -- 결제 요청 --> PaymentGW["💳 Toss Payments"]
        PaymentGW -- Webhook --> API
        IO_Worker -- 데이터 수집 --> CCXT["Exchanges (CCXT)"]
        IO_Worker -- 알림 발송 --> EmailSvc["📧 Email Service"]
    end
```

---

## 2. 구성 요소 역할 및 데이터 흐름

Cortex 백엔드는 **리소스 유형별로 분리된 마이크로서비스 아키텍처(MSA)**를 따릅니다. 모든 서비스는 동일한 Docker 이미지를 공유하지만, 실행 시점의 명령어(`CMD`)와 리소스 할당(CPU/Memory), 오토스케일링 정책을 다르게 적용합니다.

### 2.1. 핵심 서비스 컴포넌트

1.  **API Service (FastAPI)**

    - **역할:** 사용자의 즉각적인 HTTP 요청(로그인, 전략 조회 등)과 WebSocket 연결을 처리하는 **대면 서비스**입니다.
    - **특징 (I/O Bound):** 대부분의 시간을 DB 조회나 외부 API 응답 대기(I/O)에 사용합니다.
    - **작업 처리:** 무거운 작업(백테스트, 최적화)을 직접 처리하지 않고, Redis에 작업을 등록(`Enqueue`)한 뒤 사용자에게 즉시 응답합니다.
    - **스케일링:** CPU/메모리 사용량(트래픽)에 따라 1대에서 N대로 확장됩니다.

2.  **CPU-Bound Worker (Celery)**

    - **역할:** `cpu_bound_queue`를 구독하며, **백테스트(`run_backtest`)** 및 **전략 최적화(`run_optimization`)**처럼 CPU를 100% 사용하는 무거운 계산 작업을 전담합니다.
    - **특징 (CPU Bound):** 시스템의 다른 서비스에 영향을 주지 않도록 격리된 환경에서 실행됩니다.
    - **스케일링:** API 트래픽과 무관하게, `cpu_bound_queue`의 작업량(또는 워커의 CPU 부하)에 따라 1대에서 N대로 확장됩니다.

3.  **I/O-Bound Worker (Celery)**

    - **역할:** `io_bound_queue`를 구독하며, **빠르지만 실패 가능성이 있는** 외부 통신 작업을 전담합니다. (예: 데이터 수집 `fetch_and_store_ohlcv`, 자동매매 봇 `run_all_active_bots`, 이벤트 처리 `dispatch_event`, 이메일 발송 등)
    - **특징 (I/O Bound):** 작업 대부분을 외부 API 응답 대기에 사용하므로, 높은 동시성(`concurrency`)으로 여러 작업을 동시에 처리합니다.
    - **장점 (장애 격리):** 이 워커가 거래소 API 오류로 중단되더라도, API Service나 CPU Worker는 전혀 영향을 받지 않습니다.

4.  **Beat Scheduler (Celery)**
    - **역할:** `celery_beat.py`에 정의된 스케줄(예: "매시간 데이터 수집")에 맞춰 Redis에 주기적으로 작업을 등록합니다.
    - **특징 (Singleton):** 작업 중복 등록을 방지하기 위해 항상 **단 1대**만 실행되어야 합니다.

### 2.2. 비동기 최적화/백테스팅 흐름

1.  **Job Request (API Service):** 사용자가 최적화/백테스트를 요청하면, `api` 서비스가 크레딧을 차감하고 DB에 `OptimizationJob`을 `pending` 상태로 생성합니다.
2.  **Enqueue (Redis):** `api` 서비스가 `run_optimization` 작업을 `cpu_bound_queue`에 등록하고, 사용자에게는 "접수되었습니다"라고 즉시 응답합니다.
3.  **Execution (CPU Worker):** `cpu-worker`가 큐에서 작업을 가져와, `backtesting_engine.py`을 사용하여 무거운 계산을 수행합니다.
4.  **Result (DB):** 작업 완료 후, `cpu-worker`가 `OptimizationJob`의 상태를 `completed`로 업데이트하고 결과를 DB에 저장합니다.

### 2.3. 실시간 통신 흐름 (WebSocket)

1.  **Connection (API Service):** 사용자가 최적화 상세 페이지에 진입하면, `WS /ws/optimization/{job_id}`로 `api` 서비스에 웹소켓 연결을 요청합니다.
2.  **Subscription (API Service):** `api` 서비스는 Redis의 Pub/Sub 채널(예: `ws:optimization:{job_id}`)을 구독합니다.
3.  **Publish (CPU Worker):** `cpu-worker`가 최적화 작업을 수행하던 중(`tasks.py`), `WebSocketManager`를 통해 현재 진행률(예: "5/100 완료")을 Redis 채널에 발행(Publish)합니다.
4.  **Push (API Service):** `api` 서비스가 Redis로부터 메시지를 수신하는 즉시, 연결된 사용자 웹소켓으로 해당 진행률 데이터를 푸시합니다.

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
