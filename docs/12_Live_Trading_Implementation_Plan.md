# 자동매매 (Live Trading) 구현 계획

## 1. 개요

이 문서는 Cortex 프로젝트에서 검증된 전략을 실제 거래소(Exchange)와 연동하여 자동으로 매매를 수행하는 **Live Trading** 기능의 구현 계획을 기술합니다.

## 2. 시스템 아키텍처 (Architecture)

자동매매 시스템은 크게 **Bot Runner**, **Exchange Gateway**, **Data Feeder** 세 가지 핵심 컴포넌트로 구성됩니다.

```mermaid
graph TD
    User[사용자] -->|봇 생성/시작| API[Backend API]
    API -->|봇 정보 저장| DB[(PostgreSQL)]
    API -->|실행 명령| Broker[Bot Runner (Worker)]

    subgraph "Live Trading Engine"
        Broker -->|1. 봇 상태 로드| DB
        Broker -->|2. 시장 데이터 요청| Feeder[Data Feeder]
        Broker -->|3. 전략 실행| Strategy[Strategy Logic]
        Broker -->|4. 주문 전송| Gateway[Exchange Gateway]
    end

    Gateway -->|API 호출| Exchange[암호화폐 거래소 (Binance/Upbit 등)]
    Gateway -->|체결 결과| Broker
    Broker -->|거래 기록/로그| DB
```

### 2.1. 배포 전략: DIY Autoscaling on Lightsail (Option E) 🏆

비용 효율성과 성능 격리를 모두 만족하는 **Queue 기반 DIY 오토스케일링** 아키텍처를 채택합니다.

- **Core Server (Lightsail $20/mo)**
  - **사양**: 4GB RAM, 2 vCPU
  - **역할**:
    - `Backend API`: 사용자 요청 처리.
    - `PostgreSQL`: 데이터 저장 (봇 상태, 거래 기록).
    - `Redis`: 작업 큐 (Celery Broker) 및 실시간 데이터 캐싱.
    - `I/O Worker`: 거래소 주문 실행 (고정 IP 필요).
    - **`Autoscaler Script`**: Redis Queue를 모니터링하며 Worker 인스턴스를 관리.
- **Worker Instances (Lightsail $3.5/mo x N)**
  - **사양**: 512MB RAM, 1 vCPU (Ephemeral)
  - **역할**: `CPU Worker` (백테스팅 등 CPU 집약적 작업 수행).
  - **수명 주기**: 작업이 쌓이면 생성되고, 작업이 없으면 즉시 삭제됨.

### 2.2. 왜 Boto3인가? (Graceful Shutdown의 핵심)

사용자님의 우려대로 **Render나 일반적인 오토스케일링은 "어떤 인스턴스를 끌지" 지정하기 어렵습니다.** (랜덤 종료 위험)
하지만 **Boto3(AWS SDK)**를 사용하면 **"작업이 없는 녀석만 골라서"** 정확하게 종료할 수 있습니다.

1.  **상태 보고 (Heartbeat)**:
    - 모든 Worker는 작업 시작 시 Redis에 `worker:{id}:status = busy`를 기록.
    - 작업 종료 시 `worker:{id}:status = idle`로 변경.
2.  **저격 종료 (Sniper Termination)**:
    - `Autoscaler Script`는 Scale-In(축소)이 필요할 때, Redis에서 **Status가 `idle`인 Worker의 ID**를 찾음.
    - **`boto3.client('lightsail').delete_instance(instanceName=target_id)`** 명령어로 **해당 인스턴스만 콕 집어서 삭제.**
3.  **결론**:
    - **Render**: 랜덤 종료 -> 작업 중단 위험 🚨
    - **Lightsail + Boto3**: **Idle 인스턴스만 타겟팅 종료 -> 작업 안전 보장 ✅**
    - **K8s 대비**: 복잡한 설정 없이 파이썬 스크립트 50줄이면 구현 가능하므로 **훨씬 가볍고 빠름.**

---

## 3. 구현 단계 (Implementation Phases)

### Phase 0: 프론트엔드 & UX 구현 (Frontend First) 🆕

사용자 경험(UX)을 먼저 정의하고, 이에 맞춰 백엔드 API를 설계하는 **애자일(Agile) 방식**으로 진행합니다.

1.  **메뉴 및 라우팅**:

    - 사이드바에 `Live Bots` 메뉴 추가.
    - 라우트: `/bots` (목록), `/bots/new` (생성), `/bots/[botId]` (상세).

2.  **봇 생성 마법사 (Bot Creation Wizard)**:

    - **Step 1: 전략 선택**: 검증된 전략 목록에서 선택.
    - **Step 2: 파라미터 설정**: 전략 파라미터(Timeframe, Symbol 등) 조정.
    - **Step 3: 자금 및 거래소**: API Key 선택, 운용 자금(Initial Capital), 레버리지 설정.
    - **Step 4: 리스크 관리**: TP/SL, 일일 최대 손실 한도(Kill Switch) 설정.
    - **Step 5: 최종 확인**: 설정 요약 및 '봇 생성' 버튼.

3.  **봇 대시보드 (Bot List)**:

    - 실시간 PnL(수익률), 상태(Running/Stopped), 현재 포지션 요약 카드 UI.
    - 전체 봇의 총 자산 및 일일 수익 그래프.

4.  **봇 상세 페이지 (Bot Detail)**:
    - **Real-time Chart**: TradingView 차트에 진입/청산 마커 실시간 표시.
    - **Live Logs**: 봇의 동작 로그(Redis Pub/Sub) 실시간 스트리밍.
    - **Control Panel**: 시작/중지, **포지션 강제 종료(Panic Button)**, 봇 삭제.
    - **Trade History**: 체결 내역 및 수익 실현 현황 테이블.

### Phase 1: 거래소 연동 (Exchange Integration)

1.  **`ccxt` 라이브러리 설치**: `pip install ccxt`
2.  **Exchange Client 구현**:
    - `ApiKey` 테이블의 암호화된 키를 복호화하여 `ccxt` 인스턴스를 생성하는 팩토리 패턴 구현.
    - 공통 인터페이스 정의: `fetch_balance()`, `fetch_ohlcv()`, `create_order()`, `get_current_price()`.
    - **Paper Trading 모드**: 실제 주문을 내지 않고 DB에만 기록하는 '모의 투자' 옵션 구현.
3.  **IP 화이트리스트 대응**:
    - **Core Server**의 고정 IP를 바이낸스 API 키에 등록하도록 UI에서 안내.
    - 모든 매매 요청은 Core Server의 `I/O Worker`를 통해서만 나감.

### Phase 2: 봇 엔진 (Bot Engine) 구현

1.  **Bot Runner (Background Worker)**:
    - Celery Task로 구현 (`run_bot_cycle`).
    - 1분/5분/1시간 등 설정된 주기에 따라 실행 (Scheduler 연동).
2.  **Signal Processor**:
    - 기존 백테스팅 엔진(`BacktestEngine`)의 로직을 재사용하여 실시간 데이터(`OHLCV`)에 대한 매매 신호 생성.
3.  **Data Feeder**:
    - `ccxt`를 통해 실시간 캔들 데이터를 가져와서 전략에 주입.

### Phase 3: 주문 관리 시스템 (Order Management System)

1.  **진입(Entry) 로직**:
    - 매수 신호 발생 -> 가용 자산 조회 -> 수량 계산(Risk Management) -> 주문 전송.
2.  **청산(Exit) 로직**:
    - 매도 신호 발생 -> 보유 수량 조회 -> 주문 전송 -> 포지션 종료.
3.  **로그 기록**:
    - 모든 주문 및 체결 내역을 `TradeLog` 테이블에 저장.

### Phase 4: 안전 장치 및 알림 (Safety & Notifications)

1.  **예외 처리**: API 타임아웃, 점검 중, 잔고 부족 등의 에러 처리.
2.  **알림 시스템**: 매매 체결 시 Telegram/Email 알림.
3.  **Kill Switch**: 연속 손실 발생 시 봇 강제 중지.

---

## 4. 비용 및 전략 비교 (Cost & Strategy Comparison)

| 항목            | Hybrid (Render+AWS) | **DIY Autoscaling (Option E)** 🏆  |
| :-------------- | :------------------ | :--------------------------------- |
| **Core Server** | Render ($24+)       | **Lightsail 4GB ($20)**            |
| **Worker**      | Render (Auto)       | **Lightsail Ephemeral ($3.5 x N)** |
| **Autoscaling** | CPU 기반 (Render)   | **Queue 기반 (Custom Script)**     |
| **월 비용**     | ~$27.5+             | **~$20 + α (쓴 만큼만)**           |
| **장점**        | 관리 편함           | **비용 최저, 성능 격리, 확장성**   |
| **단점**        | 비용이 조금 더 듦   | **직접 구현 난이도 있음**          |

> **최종 결론**: **Option E (DIY Autoscaling)**로 진행합니다.
>
> - **Core Server**: 4GB 램으로 DB/API를 안정적으로 구동.
> - **Autoscaler**: Python 스크립트로 Redis Queue를 감시하다가 Lightsail 인스턴스를 동적으로 생성/삭제.
