{
"id": "project-cortex",
"type": "project",
"category": "backend",
"label": "Cortex-Backend",
"connections": [
"me",
"skill-python",
"skill-pytorch",
"skill-celery",
"skill-redis",
"skill-timescaledb",
"skill-docker",
"skill-postgresql",
"project-cortex-fe"
],
"details": {
"description": "개인 투자자를 위한 데이터 기반 퀀트 투자 및 자동매매 플랫폼입니다. 단순한 CRUD API가 아닌, '실시간 금융 연산을 안정적으로 처리하면서 수백만 건의 시계열 데이터를 밀리초 단위로 조회'하는 것이 핵심 과제였습니다. GRU/LSTM 기반 AI 예측 모델 학습 파이프라인과 ONNX 추론 시스템을 구축하고, CPU/IO 워커 분리, 베이지안 최적화, 복식부기 크레딧 시스템 등 엔터프라이즈급 아키텍처를 적용했습니다.",
"technologies": [
"FastAPI",
"PyTorch",
"ONNX Runtime",
"Optuna",
"Celery",
"Redis",
"TimescaleDB",
"PostgreSQL",
"Docker",
"Python 3.11"
],
"coreFeatures": [
"🤖 AI 예측 모델 파이프라인: GRU/LSTM 기반 시계열 분류(BUY/HOLD/SELL), Triple Barrier 라벨링, Optuna TPE로 하이퍼파라미터 자동 최적화, PyTorch→ONNX 변환으로 추론 30% 가속",
"⚡ 벡터 연산 백테스팅: NumPy/Pandas로 45초→0.8초(98% 단축), Generator 기반 step-by-step 실행으로 Optuna 중간 Pruning 가능",
"🔧 CPU/IO 워커 물리적 분리: cpu_queue(prefork)+io_queue(gevent)로 백테스팅 중에도 매매 주문 밀리초 체결 보장",
"📊 TimescaleDB 시계열 최적화: 수억 건 OHLCV를 자동 청크 파티셔닝, (ticker, time DESC) 복합 인덱스로 조회 성능 유지",
"💰 복식부기 크레딧 시스템: Ledger(생성)/Transaction(소비) 분리, 우선순위 FIFO 알고리즘(만료임박→무료→유료), UNION ALL로 통합 이력 조회",
"🧠 WFO + Optuna 베이지안 최적화: Expanding Window 분할, TPE 샘플러로 유망 파라미터 집중 탐색, MedianPruner로 하위 50% 조기 중단"
],
"techStackDocs": [
{
"name": "PyTorch + ONNX Runtime",
"description": "Why PyTorch for training, ONNX for inference? PyTorch의 유연한 동적 그래프로 실험하고, 학습 완료 후 ONNX로 변환하여 Python 의존성 없이 빠른 추론을 제공합니다. onnxruntime은 PyTorch 대비 약 30% 빠른 추론 속도를 보여줍니다."
},
{
"name": "Optuna + Captum",
"description": "Why Optuna over Grid Search? TPE(Tree-structured Parzen Estimator)로 유망한 하이퍼파라미터 영역을 집중 탐색하고, MedianPruner로 하위 Trial을 조기 중단하여 탐색 효율 5배 향상. Captum의 Integrated Gradients로 피처 중요도를 정량적으로 분석합니다."
},
{
"name": "FastAPI",
"description": "Why FastAPI over Django/Flask? Pydantic을 통한 엄격한 런타임 데이터 검증과 Native Async 지원이 필수적이었습니다. 금융 데이터의 정합성을 보장하면서도 High Concurrency를 처리하기 위한 최적의 선택입니다."
},
{
"name": "Celery + Redis",
"description": "Why Distributed Task Queue? 긴 실행 시간을 가지는 백테스팅 작업을 HTTP 요청 주기 내에서 처리하는 것은 불가능합니다. 작업을 큐에 넣고(Fire-and-Forget), 워커가 비동기로 처리하며, 진행률을 Pub/Sub으로 중계하는 패턴을 구축했습니다."
},
{
"name": "TimescaleDB",
"description": "Why not standard PostgreSQL? 수억 건의 캔들(OHLCV) 데이터 조회 시 B-Tree 인덱스만으로는 한계가 있습니다. 시간 기반 파티셔닝(Chunking)을 자동으로 관리해주는 TimescaleDB로 쿼리 속도를 유지했습니다."
},
{
"name": "Docker",
"description": "Why Single Image? API 서버, CPU 워커, I/O 워커가 동일한 코드베이스를 공유하되 실행 명령어(CMD)만 다르게 가져가는 전략으로, 빌드 시간을 단축하고 버전 불일치 문제를 해결했습니다."
}
],
"link": "https://github.com/sleepyMS/Cortex",
"features": [
{
"title": "AI 모델 아키텍처 (Deep Learning Models)",
"items": [
"GRU/LSTM 시계열 분류기: BUY/HOLD/SELL 3클래스 분류 + 가격 수익률 회귀 2가지 Task Type 지원. LSTM 대비 파라미터 수가 적은 GRU를 기본으로 채택하여 학습 속도 향상",
"Triple Barrier 라벨링: Marcos López de Prado의 금융 ML 표준 라벨링 방법론 구현. Take Profit/Stop Loss/Horizon 세 장벽 중 먼저 도달하는 것으로 라벨 결정",
"MC Dropout 불확실성 추정: 회귀 모델의 95% 신뢰구간 제공. Monte Carlo Dropout으로 N번 forward pass하여 예측 분포 추정",
"50+ 기술적 지표 피처 추출: SMA, EMA, MACD, RSI, Bollinger Bands 등 FeatureEngineer 클래스로 일괄 처리. RobustScaler로 이상치에 강건한 정규화"
]
},
{
"title": "AI 학습 파이프라인 자동화 (ML Pipeline Automation)",
"items": [
"End-to-End 파이프라인: 데이터 로딩 → 피처 추출 → 라벨링 → 학습 → ONNX 변환까지 TrainingPipelineConfig로 일괄 관리",
"Optuna 하이퍼파라미터 최적화: hidden_size, num_layers, dropout, learning_rate, batch_size 자동 탐색. TPE 샘플러로 유망 영역 집중 탐색",
"Integrated Gradients 피처 중요도: Captum 라이브러리로 모델 예측에 가장 영향력 있는 피처 정량 분석. XAI(Explainable AI)로 블랙박스 해소",
"실시간 학습 진행률: 에포크/Trial마다 Redis Pub/Sub → WebSocket으로 UI 실시간 업데이트. 진행률, 손실값, 메트릭 표시"
]
},
{
"title": "하이브리드 암호화 및 보안 전략 (Hybrid Cryptography)",
"items": [
"Dual Hashing Strategy: 비밀번호는 `Bcrypt`(느림, 강력함)로 해싱하여 무차별 대입 공격을 방어하고, 빈번한 인증이 필요한 토큰은 `HMAC-SHA256`(빠름, 안전함)으로 서명하여 보안과 성능의 균형을 맞췄습니다. (backend/app/security.py)",
"Fernet Symmetric Encryption: DB에 저장되는 민감한 API Key는 `Fernet` 대칭키 알고리즘으로 암호화하여, 데이터 유출 시에도 복호화 키 없이는 사용할 수 없도록 보호했습니다.",
"Why this mix? 모든 데이터를 Bcrypt로 처리하면 인증 부하가 커지고, 단순 해싱만으로는 원본 복구가 불가능한 API Key 저장 요구사항을 충족할 수 없어 용도별 최적의 알고리즘을 선택했습니다."
]
},
{
"title": "비동기 분산 처리 시스템 (Async Distributed System)",
"items": [
"Layered Architecture: Router → Service → Repository(DB) 구조로 책임을 명확히 분리하여 유지보수성 향상",
"Resource Isolation: 단일 Docker 이미지를 공유하지만 실행 CMD를 달리하여 워커 노드를 특성별(API/CPU/I/O)로 분리",
"Message Broker: Redis를 브로커로 사용하여 서비스 간 결합도를 낮추고 비동기 작업 큐 관리"
]
},
{
"title": "대용량 시계열 데이터 처리 (TimescaleDB)",
"items": [
"Hypertables 적용: 데이터를 시간 단위 청크(Chunk)로 자동 파티셔닝하여 디스크 I/O 최소화",
"복합 인덱싱: (ticker, time DESC) 인덱스를 구성하여 최신 시세 조회 쿼리 속도 최적화"
]
},
{
"title": "전략 최적화 고도화 (WFO + Optuna)",
"items": [
"WFO(Walk-Forward Optimization): 데이터를 Train/Test 구간으로 슬라이딩하며 검증하여 과최적화 방지",
"베이지안 최적화(TPE): Optuna를 도입, 이전 파라미터의 성과를 학습하여 유망한 파라미터 영역 집중 탐색",
"Aggressive Pruning: 각 Fold 검증 중 수익률이 하위 50% 미만이면 즉시 연산 중단(Early Stopping)",
"성과: WFO로 10배 늘어난 연산 시간을 Pruning으로 1/5 수준으로 단축, 안정성과 속도 모두 확보"
]
},
{
"title": "고급 분석 지표 및 시각화 데이터 처리 (Advanced Analytics)",
"items": [
"금융 지표 계산: Sharpe Ratio, Sortino Ratio, MDD, Win Rate, Profit Factor, CAGR 등 10여 가지 핵심 지표를 벡터 연산으로 고속 처리",
"파라미터 중요도 분석: Optuna의 fANOVA (Functional Analysis of Variance) 알고리즘으로 수익률에 가장 큰 영향을 미친 파라미터를 정량적으로 추출하여 API로 제공",
"평행좌표플롯 데이터 서빙: 수천 건의 Trial 데이터(params JSONB + metrics JSONB)를 고차원 시각화 포맷에 맞게 직렬화하고, 불필요한 필드를 제외하는 DTO 최적화로 전송량 절감",
"파라미터 안정성 추이(Stability) 분석: WFO 수행 시 각 Fold별로 최적 파라미터가 어떻게 변해가는지 추적하여 전략의 과최적화 여부를 판단할 수 있는 시계열 데이터 제공"
]
},
{
"title": "크레딧 경제 시스템 (Double-Entry Logic)",
"items": [
"Credits Ledger (원장): 크레딧의 '생성'을 기록하며, 각 레코드별로 만료일(expires*at)을 개별 관리",
"Credits Transaction: 크레딧의 '소비'를 기록하고, transaction_details로 원장별 차감 내역 추적",
"우선순위 알고리즘: [만료 임박 > 무료(보너스) > 유료] 순서로 자동 차감되는 FIFO 변형 로직"
]
},
{
"title": "실시간 진행률 피드백 (Redis Pub/Sub + WebSocket)",
"items": [
"Celery 워커가 작업 진행 중 Redis Pub/Sub 채널로 진행률 메시지 발행",
"FastAPI 서버가 해당 채널을 구독하고, 메시지 수신 즉시 WebSocket 클라이언트로 푸시",
"폴링(Polling) 없이 실시간으로 부드러운 Progress UI 제공 및 서버 부하 감소"
]
}
],
"optimizations": [
{
"title": "ONNX Runtime으로 프로덕션 추론 30% 가속화",
"items": [
"Why: PyTorch 모델은 Python 런타임 의존성으로 배포 복잡도 증가. 매 API 호출마다 모델 로드하면 지연 발생.",
"How: 학습 완료 후 `torch.onnx.export()`로 ONNX 변환. `onnxruntime.InferenceSession`으로 최적화된 추론. CPU 환경에서도 효율적 동작.",
"Impact: PyTorch 대비 추론 속도 30% 향상. AIModelRegistry로 모델 캐싱하여 중복 로드 방지."
]
},
{
"title": "Algorithm Vectorization으로 98% 성능 향상",
"items": [
"Why: Python For 루프로 수십만 캔들을 순회하며 지표 계산 시 수 분 소요. 사용자가 백테스트 버튼 클릭 후 멍하니 기다려야 하는 최악의 UX.",
"How: Pandas/NumPy 벡터 연산으로 루프 제거, `np.where`로 조건문 벡터화, 컬럼 단위 일괄 처리. `df['signal'] = np.where((df['sma_short'] > df['sma_long']), 1, 0)` 패턴 적용.",
"Impact: 1년 치 백테스팅 45초→0.8초로 98% 단축. 사용자가 '실시간'으로 여러 전략을 비교할 수 있는 경험 제공."
]
},
{
"title": "Generator 기반 Step-by-Step 실행으로 중간 Pruning 가능",
"items": [
"Why: Optuna 최적화 시 Trial 중간에 수익률이 하위권이면 끝까지 실행할 필요 없음. 기존 run() 메서드는 '올-오어-낫씽'이라 조기 중단 불가.",
"How: `run_step_by_step()` Generator 메서드 추가. 각 타임스텝마다 yield로 중간 결과 반환, 외부에서 `trial.should_prune()` 체크 후 중단 가능.",
"Impact: WFO 10-Fold × 100 Trial = 1000회 실행 중 하위 50%를 중간에 중단하여 총 연산 시간 1/5로 단축."
]
},
{
"title": "CPU/IO 워커 물리적 분리로 Starvation 해결",
"items": [
"Why: 백테스팅이 CPU 100%를 점유하면 같은 워커의 매매 주문 Task가 큐에서 대기. 급변하는 시장에서 주문 지연은 치명적 손실로 직결.",
"How: `cpu_bound_queue`(prefork Pool, 프로세스 격리)와 `io_bound_queue`(gevent Pool, 코루틴 동시성)로 워커 이원화. Docker Compose로 별도 컨테이너 배포.",
"Impact: 백테스팅 진행 중에도 매매 주문은 밀리초 단위 즉시 체결 보장."
]
},
{
"title": "Eager Loading으로 N+1 쿼리 10배 개선",
"items": [
"Why: 전략 목록 조회 시 ORM Lazy Loading으로 백테스트, 파라미터 등 연관 데이터를 N번 추가 쿼리. 10개 전략에 100개 쿼리 발생하여 1.2초 지연.",
"How: `selectinload(Strategy.backtests)`, `joinedload(Strategy.parameters)` 명시. 단 1회 JOIN 쿼리로 모든 연관 데이터 프리로딩.",
"Impact: 전략 목록 API 응답 1.2s→0.1s로 10배 이상 개선."
]
},
{
"title": "bulk_insert_mappings로 대량 데이터 저장 최적화",
"items": [
"Why: 최적화 Trial 1000개 결과를 개별 INSERT하면 1000회 DB 왕복. 네트워크 지연이 누적되어 저장만 수십 초 소요.",
"How: SQLAlchemy `bulk_insert_mappings()`로 딕셔너리 리스트 일괄 삽입. ORM 오버헤드 없이 단일 트랜잭션 처리.",
"Impact: Trial 저장 시간 30초→2초로 15배 단축."
]
}
],
"challenges": [
{
"title": "금융 시계열 라벨링의 한계와 Triple Barrier 도입",
"problem": "단순 '다음 봉 방향(Up/Down)' 라벨링은 가격 잡음에 민감하고, 실제 트레이딩 P&L과 연결되지 않았습니다. 라벨 불균형이 심하고 모델이 의미 없는 패턴을 학습하는 문제가 발생했습니다.",
"solution": "Marcos López de Prado의 Triple Barrier Method를 구현했습니다. Take Profit(+2%), Stop Loss(-1%), Time Horizon(24시간) 세 가지 장벽 중 먼저 도달하는 것으로 라벨을 결정합니다. 실제 트레이딩 시나리오(손절/익절/타임아웃)를 라벨에 반영하여 모델이 P&L과 연관된 패턴을 학습하도록 했습니다."
},
{
"title": "AI 학습 중 실시간 진행률 모니터링 시스템",
"problem": "AI 모델 학습은 수십 분~수 시간이 소요됩니다. 사용자는 진행 상황을 알 수 없어 '작업이 멈춘 건지 진행 중인지' 불안해했고, 브라우저를 닫으면 상태를 확인할 방법이 없었습니다.",
"solution": "학습 콜백 함수를 통해 에포크/Trial마다 Redis Pub/Sub 채널로 진행률 메시지를 발행합니다. FastAPI 서버가 구독하여 WebSocket으로 클라이언트에 푸시합니다. 현재 에포크, 손실값, 정확도, 남은 시간 추정치를 실시간으로 제공하여 투명한 학습 모니터링을 구현했습니다."
},
{
"title": "동기식 연산으로 인한 웹 서버 '동결' (The Frozen Server)",
"problem": "초기에는 백테스팅을 FastAPI 엔드포인트 내부에서 직접 실행했습니다. Pandas 연산이 CPU를 점유하자 async 이벤트 루프가 멈춰버려, 헬스 체크를 포함한 모든 API 요청이 타임아웃되어 로드밸런서가 서버를 '죽은 것'으로 판단, 트래픽을 차단하는 치명적 장애가 발생했습니다.",
"solution": "아키텍처를 근본적으로 변경했습니다. Celery를 도입하여 연산 작업을 별도 프로세스로 위임(Fire-and-Forget)하고, FastAPI는 '요청 접수 → 작업 ID 반환 → 진행률 조회'만 담당하도록 역할을 분리했습니다. Redis Pub/Sub으로 진행률을 WebSocket에 중계하여 폴링 없이 실시간 피드백을 구현했습니다."
},
{
"title": "부동 소수점 연산 오차로 인한 거래소 API 오류",
"problem": "Python `float`로 `0.1 BTC × 3 = 0.30000000000000004`가 되어 거래소 API에서 '잔액 부족' 또는 '정밀도 초과' 오류가 반환되었습니다. 특히 소수점 8자리까지 정밀도가 요구되는 암호화폐에서 이 문제는 실거래 손실로 직결될 수 있었습니다.",
"solution": "모든 금전/수량 연산을 `Decimal` 타입으로 전환했습니다. DB 스키마(`Numeric(20, 8)`), Pydantic 모델(`condecimal`), 비즈니스 로직까지 일관된 정밀도를 적용하여 1사토시(0.00000001 BTC)의 오차도 허용하지 않았습니다."
},
{
"title": "Celery Task 생성 전 DB 조회 시 Race Condition",
"problem": "API에서 `backtest.delay(backtest_id)` 호출 직후 Celery 워커가 DB를 조회하면 아직 트랜잭션이 커밋되지 않아 'Backtest not found' 에러가 발생했습니다. 로컬에서는 발생하지 않다가 프로덕션에서만 간헐적으로 발생하여 디버깅이 어려웠습니다.",
"solution": "워커 내부에 재시도 로직을 추가했습니다. `for attempt in range(5): ... time.sleep(1)` 패턴으로 DB 커밋을 기다리고, 여전히 없으면 명확한 에러 메시지와 함께 실패 처리합니다. 추가로 Celery의 `acks_late=True` 옵션으로 Task 완료 전 워커 충돌 시에도 재시도가 보장되도록 설정했습니다."
},
{
"title": "크레딧 차감 시 원장 추적 불가 문제",
"problem": "단순히 `user.credit_balance -= amount`로 차감하면 '어디서 획득한 크레딧이 어디에 사용되었는지' 추적이 불가능했습니다. 고객 환불 요청이나 감사(Audit) 시 근거 자료를 제시할 수 없는 심각한 비즈니스 리스크였습니다.",
"solution": "복식부기(Double-Entry) 원칙을 적용했습니다. `CreditLedger`(생성 원장)와 `CreditTransaction`(소비 기록)을 분리하고, `CreditTransactionDetail`로 어떤 원장에서 얼마가 차감되었는지 추적합니다. 우선순위 알고리즘(만료임박→이벤트쿠폰→구매)으로 자동 차감하고, `UNION ALL`로 획득/사용 이력을 통합 조회하는 API를 제공합니다."
}
],
"learnings": [
{
"title": "ML Ops의 첫걸음: 학습-추론 파이프라인 분리",
"content": "처음에는 PyTorch 모델을 그대로 API 서버에 로드하려 했으나, CUDA 의존성과 무거운 라이브러리 때문에 배포가 복잡해졌습니다. 학습(Training)과 추론(Inference)을 물리적으로 분리하여, 학습은 GPU 환경에서 PyTorch로, 추론은 CPU 환경에서 ONNX Runtime으로 수행하는 아키텍처를 설계했습니다. AIModelRegistry로 모델을 캐싱하고, 버전 관리를 통해 A/B 테스트도 가능하게 했습니다. '학습한 모델을 어떻게 프로덕션에 안전하게 배포할 것인가'라는 ML Ops의 핵심 질문에 대한 첫 번째 해결책을 경험했습니다."
},
{
"title": "MSA로 가는 징검다리: 모듈러 모놀리스",
"content": "처음부터 MSA로 시작하면 인프라 복잡도(서비스 디스커버리, 분산 트랜잭션, 로그 통합)에 압도당합니다. 코드베이스는 하나로 유지하되 Auth/Backtest/Trade/Credit 등 도메인 간 직접 import를 금지하고, services/ 레이어를 통해서만 통신하는 규칙을 세웠습니다. 덕분에 필요 시 서비스를 '떼어내기만 하면' MSA로 전환할 수 있는 유연한 구조를 만들었습니다."
},
{
"title": "CPU-bound vs I/O-bound: 물리적 격리의 필요성",
"content": "`async/await`는 I/O 대기를 효율화할 뿐, CPU를 점유하는 연산은 결국 이벤트 루프를 블로킹합니다. 백테스팅(CPU)과 거래소 API 호출(I/O)을 논리적 분리(Queue)가 아닌 물리적 분리(별도 컨테이너)해야 진정한 격리가 가능함을 배웠습니다. prefork(멀티프로세스)와 gevent(코루틴)의 차이를 실제 장애를 통해 체득했습니다."
},
{
"title": "금융 시스템에서 데이터 정합성은 타협 불가",
"content": "전략 수정 후 과거 백테스트 결과가 바뀌면 사용자 신뢰가 무너집니다. 백테스트 실행 시점의 전략을 JSON 스냅샷으로 저장하여 불변성을 보장하고, Decimal 타입으로 연산 오차를 제거하며, 복식부기로 모든 크레딧 흐름을 추적합니다. '귀찮아서 나중에'가 아닌 '처음부터 정확하게'가 금융 시스템의 기본임을 배웠습니다."
},
{
"title": "이벤트 기반 아키텍처의 유연함",
"content": "`publish_event('backtest.completed', payload)` → `dispatch_event` Task가 구독자 Task들을 호출하는 Pub/Sub 패턴을 구현했습니다. 새로운 기능(예: 슬랙 알림) 추가 시 기존 코드 수정 없이 구독자만 등록하면 됩니다. 모듈 간 결합도를 낮추고 확장성을 높이는 설계 원칙을 체득했습니다."
},
{
"title": "측정 없는 최적화는 추측에 불과하다",
"content": "처음엔 '모든 쿼리에 인덱스를 걸어야 한다'고 생각했으나, 실제 프로파일링 결과 병목은 TimescaleDB의 시간 범위 쿼리와 N+1 문제뿐이었습니다. `EXPLAIN ANALYZE`와 SQLAlchemy 쿼리 로깅으로 실제 병목을 측정한 후 집중 개선하니 10배 성능 향상을 달성했습니다. '추측이 아닌 측정'이 엔지니어링의 기본임을 깨달았습니다."
}
],
"codeExamples": [
{
"title": "Triple Barrier 라벨링 (금융 ML 표준 방법론)",
"category": "ai",
"description": "Why Triple Barrier? 단순 Up/Down 라벨링은 잡음에 민감하고 P&L과 괴리됩니다. TP/SL/Horizon 세 장벽 중 먼저 도달하는 것으로 라벨을 결정하여 실제 트레이딩 시나리오를 반영합니다.",
"filePath": "backend/app/ai/labeling/triple_barrier.py",
"githubLink": "https://github.com/sleepyMS/Cortex/blob/main/backend/app/ai/labeling/triple_barrier.py",
"snippet": "# 상단 장벽 (Take Profit) 도달 시점\ntp_hits = np.where(returns >= self.config.profit_target)[0]\ntp_time = tp_hits[0] if len(tp_hits) > 0 else np.inf\n\n# 하단 장벽 (Stop Loss) 도달 시점\nsl_hits = np.where(returns <= -self.config.stop_loss)[0]\nsl_time = sl_hits[0] if len(sl_hits) > 0 else np.inf\n\n# 먼저 도달한 장벽으로 라벨 결정\nif tp_time < sl_time: return Label.BUY\nelif sl_time < tp_time: return Label.SELL\nelse: return Label.HOLD # 시간 만료"
},
{
"title": "Optuna TPE + MedianPruner 하이퍼파라미터 최적화",
"category": "ai",
"description": "Why TPE over Grid Search? 베이지안 최적화로 유망한 파라미터 영역을 집중 탐색하고, MedianPruner로 하위 Trial을 조기 중단하여 5배 빠른 탐색을 달성했습니다.",
"filePath": "backend/app/ai/training/optimizer.py",
"githubLink": "https://github.com/sleepyMS/Cortex/blob/main/backend/app/ai/training/optimizer.py",
"snippet": "# Optuna Objective 함수에서 파라미터 샘플링\nhidden_size = trial.suggest_int(\"hidden_size\", 32, 256, step=16)\nnum_layers = trial.suggest_int(\"num_layers\", 1, 4)\ndropout = trial.suggest_float(\"dropout\", 0.1, 0.5, step=0.05)\nlr = trial.suggest_float(\"learning_rate\", 1e-4, 1e-2, log=True)\n\n# 중간 결과 보고 (Pruning용)\ntrial.report(val_loss, epoch)\nif trial.should_prune():\n raise optuna.exceptions.TrialPruned()"
},
{
"title": "Integrated Gradients 피처 중요도 분석 (XAI)",
"category": "ai",
"description": "Why Explainability? 블랙박스 모델은 신뢰하기 어렵습니다. Captum의 Integrated Gradients로 어떤 피처가 예측에 가장 큰 영향을 미쳤는지 정량적으로 분석하여 모델 해석 가능성을 확보했습니다.",
"filePath": "backend/app/ai/training/optimizer.py",
"githubLink": "https://github.com/sleepyMS/Cortex/blob/main/backend/app/ai/training/optimizer.py",
"snippet": "from captum.attr import IntegratedGradients\n\n# Integrated Gradients 인스턴스\nig = IntegratedGradients(model.model)\nbaseline = torch.zeros_like(X_sample)\n\n# 중요도 계산 (Target: BUY class)\nattributions, delta = ig.attribute(\n inputs=X_sample, baselines=baseline,\n target=2, # BUY class\n return_convergence_delta=True\n)\n\n# 집계: 절대값 → 배치 평균 → 시퀀스 평균\nimportances = torch.mean(torch.abs(attributions), dim=0)\nimportances = torch.mean(importances, dim=0)"
},
{
"title": "MC Dropout 불확실성 추정 (회귀 모델)",
"category": "ai",
"description": "Why Uncertainty? 점 추정만으로는 예측의 신뢰도를 알 수 없습니다. Monte Carlo Dropout으로 여러 번 forward pass하여 예측 분포를 추정하고, 95% 신뢰구간을 제공합니다.",
"filePath": "backend/app/ai/models/gru.py",
"githubLink": "https://github.com/sleepyMS/Cortex/blob/main/backend/app/ai/models/gru.py",
"snippet": "def predict_with_uncertainty(self, X: np.ndarray, n_iter: int = 10):\n self.model.train() # Dropout 활성화\n predictions = []\n \n for * in range(n*iter):\n with torch.no_grad():\n pred = self.model(X_tensor)\n predictions.append(pred.cpu().numpy())\n \n preds = np.stack(predictions, axis=0) # (n_iter, batch, 1)\n mean = np.mean(preds, axis=0)\n std = np.std(preds, axis=0)\n \n return {\n 'mean': mean,\n 'std': std,\n 'lower_bound': mean - 1.96 * std, # 95% CI\n 'upper*bound': mean + 1.96 * std\n }"
},
{
"title": "Generator 기반 Step-by-Step 백테스팅 (Pruning 가능)",
"category": "performance",
"description": "Why Generator? 최적화 시 수익률 하위권 Trial을 끝까지 돌리면 시간 낭비입니다. yield로 각 스텝마다 중간 결과를 반환하고, 외부에서 Optuna `trial.should_prune()` 체크 후 중단하여 연산 시간 1/5로 단축했습니다.",
"filePath": "backend/app/engine/backtesting_engine.py",
"githubLink": "https://github.com/sleepyMS/Cortex/blob/main/backend/app/engine/backtesting_engine.py",
"snippet": "def run_step_by_step(self):\n for timestamp, group in self.merged_df.groupby(level=0):\n self.process_single_step(timestamp, group)\n if self.step_count % 100 == 0:\n yield {'is_intermediate': True, 'score': self.calc_score()}\n yield self.calc_summary_stats()"
},
{
"title": "이벤트 기반 Pub/Sub 디스패처",
"category": "architecture",
"description": "Why Event-Driven? 백테스트 완료 시 이메일/슬랙/푸시 알림을 추가할 때마다 기존 코드를 수정하면 유지보수가 악몽이 됩니다. 이벤트 발행 후 구독자 Task만 등록하면 되는 느슨한 결합으로 확장성을 확보했습니다.",
"filePath": "backend/app/tasks.py",
"githubLink": "https://github.com/sleepyMS/Cortex/blob/main/backend/app/tasks.py",
"snippet": "@celery_app.task(name='dispatch_event', queue='io_bound_queue')\ndef dispatch_event(event_name: str, payload: dict):\n EVENT_SUBSCRIBERS = {\n 'backtest.completed': ['send_backtest_notification_task'],\n 'optimization.completed': ['send_optimization_notification_task'],\n 'payment.succeeded': ['fulfill_order_task'],\n }\n if task_names := EVENT_SUBSCRIBERS.get(event_name):\n for task_name in task_names:\n celery_app.send_task(task_name, args=[payload])"
},
{
"title": "복식부기 크레딧 차감 (우선순위 FIFO)",
"category": "business",
"description": "Why Double-Entry? 단순 `balance -= amount`는 '어디서 온 크레딧이 어디에 사용됐는지' 추적 불가. 환불/감사 시 근거 자료가 없으면 비즈니스 리스크입니다. Ledger별 차감 내역을 TransactionDetail로 기록하여 완전한 추적성을 확보했습니다.",
"filePath": "backend/app/services/credit_service.py",
"githubLink": "https://github.com/sleepyMS/Cortex/blob/main/backend/app/services/credit_service.py",
"snippet": "# 우선순위: 만료임박 > 이벤트쿠폰 > 구매\npriority_order = {'EVENT_COUPON': 1, 'ATTENDANCE': 2, 'PURCHASE': 3}\navailable_ledgers.sort(key=lambda l: (priority_order.get(l.source_type, 99), l.expires_at))\n\nfor ledger in available_ledgers:\n if remaining <= 0: break\n deduct = min(ledger.remaining_amount, remaining)\n ledger.remaining_amount -= deduct\n # 어떤 원장에서 얼마 차감했는지 상세 기록\n transaction_details.append({'ledger_id': ledger.id, 'amount': deduct})"
},
{
"title": "Celery 큐 분리로 CPU/I/O 격리",
"category": "async",
"description": "Why Segregation? CPU 100%를 쓰는 백테스팅 때문에 같은 워커의 매매 주문이 지연되면 급변하는 시장에서 치명적 손실입니다. 물리적으로 워커를 분리하여 백테스팅 중에도 주문은 밀리초 즉시 체결을 보장했습니다.",
"filePath": "backend/app/tasks.py",
"githubLink": "https://github.com/sleepyMS/Cortex/blob/main/backend/app/tasks.py",
"snippet": "@celery_app.task(name='run_backtest', queue='cpu_bound_queue', acks_late=True)\ndef run_backtest(backtest_id: str):\n # prefork Pool: 멀티프로세스 → CPU 격리\n ...\n\n@celery_app.task(name='execute_live_trade', queue='io_bound_queue')\ndef execute_live_trade(bot_id: str):\n # gevent Pool: 코루틴 → I/O 동시성\n ..."
},
{
"title": "Optuna + WFO 베이지안 최적화 + MedianPruner",
"category": "optimization",
"description": "Why TPE+Pruning? Grid Search는 모든 조합을 탐색하여 비효율적입니다. TPE(Tree-structured Parzen Estimator)로 유망 영역을 집중 탐색하고, MedianPruner로 중간 성과가 하위 50%면 즉시 중단하여 10배 늘어난 WFO 연산을 1/5로 단축했습니다.",
"filePath": "backend/app/tasks.py",
"githubLink": "https://github.com/sleepyMS/Cortex/blob/main/backend/app/tasks.py",
"snippet": "sampler = optuna.samplers.TPESampler(seed=42)\npruner = optuna.pruners.MedianPruner(n_startup_trials=5, n_warmup_steps=10)\nstudy = optuna.create_study(direction='maximize', sampler=sampler, pruner=pruner)\n\nfor intermediate in engine.run_step_by_step():\n if intermediate.get('is_intermediate'):\n trial.report(intermediate['backtest_score'], step=step)\n if trial.should_prune():\n raise optuna.TrialPruned() # 조기 중단"
},
{
"title": "벡터 연산으로 백테스팅 98% 가속화",
"category": "performance",
"description": "Why Vectorization? Python For 루프로 수십만 캔들을 순회하면 수 분 소요. `np.where`로 조건문을 벡터화하고 컬럼 단위로 일괄 처리하여 45초→0.8초로 98% 단축했습니다.",
"filePath": "backend/app/engine/backtesting_engine.py",
"githubLink": "https://github.com/sleepyMS/Cortex/blob/main/backend/app/engine/backtesting_engine.py",
"snippet": "# For 루프 대신 벡터 연산\ndf['signal'] = np.where(\n (df['sma_short'] > df['sma_long']) & \n (df['sma_short'].shift(1) <= df['sma_long'].shift(1)),\n 1, # 골든크로스: 매수\n np.where(df['sma_short'] < df['sma_long'], -1, 0) # 데드크로스: 매도\n)"
},
{
"title": "Race Condition 방지: Task 내 재시도 로직",
"category": "troubleshooting",
"description": "Why Retry? API에서 commit 전에 Celery가 DB 조회하면 'Not Found'. 로컬에서는 안 생기다가 프로덕션에서만 간헐적 발생하여 디버깅이 악몽이었습니다. 워커 내부에서 5회 재시도하고, `acks_late=True`로 워커 충돌 시에도 재실행을 보장했습니다.",
"filePath": "backend/app/tasks.py",
"githubLink": "https://github.com/sleepyMS/Cortex/blob/main/backend/app/tasks.py",
"snippet": "@celery_app.task(bind=True, acks_late=True)\ndef run_backtest(self, backtest_id: str):\n # 커밋 대기를 위한 재시도 로직\n for attempt in range(5):\n backtest = session.query(Backtest).filter_by(id=uuid).one_or_none()\n if backtest: break\n time.sleep(1) # 트랜잭션 커밋 대기\n if not backtest:\n raise ValueError(f'Backtest {backtest_id} not found after 5 retries')"
},
{
"title": "N+1 쿼리 문제 해결: Eager Loading",
"category": "troubleshooting",
"description": "Why Eager? ORM Lazy Loading으로 10개 전략 조회 시 100개 쿼리 발생하여 1.2초 지연. `selectinload`로 연관 데이터를 단 1회 쿼리로 프리로딩하여 0.1초로 10배 개선했습니다.",
"filePath": "backend/app/routers/strategies.py",
"githubLink": "https://github.com/sleepyMS/Cortex/blob/main/backend/app/routers/strategies.py",
"snippet": "# Before: N+1 문제 (1.2s, 100+ queries)\nstrategies = await db.execute(select(Strategy))\n\n# After: Eager Loading (0.1s, 2 queries)\nstrategies = await db.execute(\n select(Strategy)\n .options(selectinload(Strategy.backtests))\n .options(selectinload(Strategy.parameters))\n)"
},
{
"title": "bulk_insert로 대량 데이터 15배 빠른 저장",
"category": "performance",
"description": "Why Bulk? Trial 1000개 결과를 개별 INSERT하면 1000회 DB 왕복으로 수십 초 소요. `bulk_insert_mappings`로 딕셔너리 리스트를 단일 트랜잭션으로 일괄 삽입하여 30초→2초로 15배 단축했습니다.",
"filePath": "backend/app/tasks.py",
"githubLink": "https://github.com/sleepyMS/Cortex/blob/main/backend/app/tasks.py",
"snippet": "# 개별 INSERT 대신 Bulk Insert\ntrial_objects = []\nfor t in study.trials:\n trial_objects.append({\n 'job_id': job_uuid, 'trial_id': t.number,\n 'params': t.params, 'metrics': t.user_attrs.get('metrics'),\n 'state': 'COMPLETE' if t.state == TrialState.COMPLETE else 'PRUNED'\n })\nsession.bulk_insert_mappings(OptimizationTrial, trial_objects)"
},
{
"title": "Decimal 타입으로 금융 정밀도 보장",
"category": "troubleshooting",
"description": "Why Decimal? `float`로 `0.1 BTC × 3 = 0.30000000000000004`가 되어 거래소 API에서 '잔액 부족' 오류. DB부터 Pydantic까지 `Decimal(20, 8)`로 통일하여 1사토시 오차도 허용하지 않습니다.",
"filePath": "backend/app/schemas.py",
"githubLink": "https://github.com/sleepyMS/Cortex/blob/main/backend/app/schemas.py",
"snippet": "from pydantic import condecimal\n\nclass OrderCreate(BaseModel):\n quantity: condecimal(max_digits=20, decimal_places=8)\n price: condecimal(max_digits=20, decimal_places=8)\n # float 대신 Decimal로 정밀도 보장\n # 0.1 + 0.2 == Decimal('0.3') # True"
},
{
"title": "UNION ALL로 통합 이력 효율적 조회",
"category": "database",
"description": "Why UNION? 획득(Ledger)과 사용(Transaction) 이력을 앱 레벨에서 합치면 두 번 쿼리 + 메모리 정렬이 필요합니다. DB 레벨에서 `UNION ALL`로 합치고 정렬/페이징하여 단일 쿼리로 처리했습니다.",
"filePath": "backend/app/services/credit_service.py",
"githubLink": "https://github.com/sleepyMS/Cortex/blob/main/backend/app/services/credit_service.py",
"snippet": "gains_query = select(Ledger.created_at, Ledger.initial_amount.label('amount'), ...)\nusages_query = select(Transaction.created_at, (-Transaction.amount).label('amount'), ...)\n\n# DB에서 통합 + 정렬 + 페이징\nunified = union_all(gains_query, usages_query).alias('unified')\nfinal = select(unified).order_by(desc(unified.c.created_at)).offset(offset).limit(limit)"
}
]
},
"color": "#f97316"
}
