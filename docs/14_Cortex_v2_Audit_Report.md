# 🔍 Cortex v2.0 — 리빌드 계획서 감사 보고서 (Audit Report)

> **목적**: `13_Cortex_v2_Rebuild_Plan.md`의 기술 결정들을 비판적으로 검토하여, 기존 프로토타입에서 **무비판적으로 답습한 의사결정**과 **누락된 핵심 요소**를 식별한다.

---

## 요약: 발견된 문제 23건

| 심각도              | 건수 | 핵심 내용                                      |
| :------------------ | :--- | :--------------------------------------------- |
| 🔴 **CRITICAL**     | 7건  | 기술 선택 오류, 아키텍처 누락 — 즉시 수정 필요 |
| 🟡 **IMPORTANT**    | 9건  | 성능/DX/품질 개선 — 강력 권장                  |
| 🟢 **NICE-TO-HAVE** | 7건  | 경쟁력 향상 기능 — 여유 시 추가                |

---

## 🔴 CRITICAL — 즉시 수정 필요 (7건)

### 1. Next.js 14 → Next.js 16 업그레이드

| 항목          | 기존 계획             | 변경 권장                 |
| :------------ | :-------------------- | :------------------------ |
| **Framework** | Next.js 14 + React 18 | **Next.js 16 + React 19** |

**문제**: Next.js 14는 2023년 10월 출시. 리빌드 완료 시점에 3년 이상 된 버전이 됨.

**Next.js 16 + React 19의 핵심 이점**:

- **Turbopack** (stable): 개발 서버 10배 빠른 시작, HMR 대폭 개선
- **Cache Components**: 정적 셸 + 동적 콘텐츠 결합으로 최적 성능
- **React 19**: `useActionState`, `use()` 훅, Server Actions 개선, 자동 배치 최적화
- **부분 사전 렌더링 (PPR)**: 대시보드 같은 복합 페이지에서 극적인 LCP 개선
- **MCP 내장 지원**: AI 개발 도구 네이티브 통합

**영향 범위**: Sprint 1 프론트엔드 초기화 시 즉시 적용

---

### 2. Tailwind CSS 3 → v4 업그레이드

| 항목    | 기존 계획       | 변경 권장          |
| :------ | :-------------- | :----------------- |
| **CSS** | TailwindCSS 3.x | **TailwindCSS v4** |

**문제**: 기존 프로토타입의 `tailwind.config.js` (8.9KB)를 그대로 이전하려는 관성.

**Tailwind v4의 근본적 변화**:

- **CSS-First 설정**: `tailwind.config.js` 삭제, CSS `@theme` 디렉티브로 설정
- **Lightning CSS 엔진**: 빌드 속도 대폭 향상
- **자동 콘텐츠 탐지**: content 경로 설정 불필요
- **CSS 네이티브 변수 활용**: 런타임 테마 전환 더 쉬워짐
- **Cascade Layers**: 스타일 우선순위 명확화

---

### 3. 백테스팅 엔진 성능: Numba JIT 도입

| 항목          | 기존 계획               | 변경 권장                           |
| :------------ | :---------------------- | :---------------------------------- |
| **엔진 코어** | 순수 Python 이벤트 루프 | **Numba JIT 컴파일 + 벡터화 NumPy** |

**문제**: 순수 Python for 루프는 수백만 캔들 처리 시 **10~100배 느림**. 최적화 작업에서 수백~수천 백테스트를 병렬 실행할 때 치명적 병목.

**해결 방안**:

```python
# Before: 순수 Python (느림)
for candle in candles:
    signal = evaluate_rules(candle)
    process_order(signal)

# After: Numba JIT (10-100x 빠름)
@numba.jit(nopython=True, cache=True)
def run_backtest_loop(prices, signals, params):
    # C 수준 속도로 실행
    ...
```

**적용 범위**:

- 지표 계산: **벡터화 NumPy/pandas-ta** (이미 일부 적용)
- 이벤트 루프 코어: **Numba JIT** (핵심 개선)
- 성과 지표 계산: **Numba JIT**

**기대 효과**: 5년 1시간봉 백테스트 **10초 → 0.5초** 이하

---

### 4. 통합 WebSocket 아키텍처 설계

| 항목            | 기존 계획               | 변경 권장                                  |
| :-------------- | :---------------------- | :----------------------------------------- |
| **실시간 통신** | 기능별 산발적 WebSocket | **통합 WebSocket Gateway + Redis Pub/Sub** |

**문제**: 백테스트 진행률, AI 학습 로그, 봇 PnL, 알림이 각각 독립적으로 WebSocket을 구현. 연결 관리, 인증, 재연결 로직이 중복됨.

**설계안**:

```
Exchange WS → Redis Pub/Sub → WebSocket Gateway → Client
                  ↑
Celery Workers → Redis Pub/Sub (progress, results)
```

| 채널                        | 용도                 |
| :-------------------------- | :------------------- |
| `/ws/trading/{bot_id}`      | 봇 PnL, 거래, 상태   |
| `/ws/backtest/{job_id}`     | 진행률, 부분 결과    |
| `/ws/optimization/{job_id}` | 진행률, 현재 최적값  |
| `/ws/ai-training/{job_id}`  | 에폭 로그, 손실 커브 |
| `/ws/market/{symbol}`       | 실시간 가격          |
| `/ws/notifications`         | 사용자 알림          |

**Sprint 1에 통합 인프라로 설계**, 이후 Sprint에서 채널만 추가.

---

### 5. 오브젝트 스토리지 (S3 / Cloudflare R2) 추가

| 항목          | 기존 계획                | 변경 권장                 |
| :------------ | :----------------------- | :------------------------ |
| **파일 저장** | 로컬 파일시스템 (암묵적) | **S3 또는 Cloudflare R2** |

**문제**: AI 모델 가중치, 사용자 아바타, PDF 리포트, ONNX 파일 등이 로컬 디스크에 저장됨. 서버 재배포 시 데이터 손실, 수평 확장 불가.

**저장 대상**:
| 파일 유형 | 크기 범위 | 접근 패턴 |
|:---|:---|:---|
| AI 모델 가중치 (.pt, .onnx) | 10MB ~ 500MB | 학습 후 저장, 추론 시 로드 |
| 사용자 아바타 | 50KB ~ 5MB | CDN 캐시 |
| 백테스트 PDF 리포트 | 500KB ~ 5MB | Pre-signed URL 다운로드 |
| 전략 JSON 내보내기 | 1KB ~ 100KB | Pre-signed URL |

**Cloudflare R2 권장**: S3 호환 API, **이그레스 비용 무료**, 글로벌 배포.

---

### 6. API 버저닝 `/api/v1/` 도입

**문제**: 기존 계획에 API 버저닝이 전혀 없음. SaaS 제품은 향후 API 변경 시 하위 호환성 보장이 필수.

**적용**: 모든 엔드포인트에 `/api/v1/` 프리픽스. FastAPI의 `APIRouter(prefix="/api/v1")` 활용.

---

### 7. 감사 추적 시스템 (Audit Trail)

**문제**: **금융 플랫폼에서 감사 로그가 없는 것은 치명적**. 보안 사고, 분쟁 해결, 법적 요구사항에 대응 불가.

**추적 대상**:
| 행위 | 중요도 |
|:---|:---|
| API 키 CRUD | 🔴 필수 |
| 봇 시작/중지 | 🔴 필수 |
| 크레딧 충전/차감 | 🔴 필수 |
| 비밀번호/MFA 변경 | 🔴 필수 |
| 전략 공유 설정 변경 | 🟡 권장 |
| 마켓플레이스 구매/판매 | 🟡 권장 |

**구현**: `audit_logs` 테이블 + 이벤트 버스 비동기 기록 (성능 영향 최소화)

---

## 🟡 IMPORTANT — 강력 권장 (9건)

### 8. Recharts → Apache ECharts 교체

| 비교          | Recharts        | ECharts                         |
| :------------ | :-------------- | :------------------------------ |
| 번들 크기     | ~200KB          | ~100KB (트리셰이킹 시)          |
| 대용량 데이터 | 느림 (DOM 기반) | 빠름 (Canvas)                   |
| 차트 종류     | 기본            | 히트맵, 등고선, 산키, 트리맵 등 |
| 금융 차트     | 부족            | K-line, 캔들 내장               |
| 상호작용      | 기본            | 브러시, 줌, 연동                |

최적화 결과의 **등고선 차트**, 월별 수익 **히트맵**, 드로다운 **영역 차트** 등에 ECharts가 월등.

라이브러리: `echarts-for-react` (React wrapper)

---

### 9. npm → pnpm 전환

- **설치 속도**: pnpm이 3배 빠름
- **디스크 효율**: 하드 링크로 패키지 공유
- **엄격한 의존성**: 유령 의존성(phantom dependencies) 방지
- **기존 `package-lock.json`**: 327KB → pnpm의 `pnpm-lock.yaml`로 대체

---

### 10. ESLint + Prettier → Biome 통합

- **속도**: Rust 기반, ESLint 대비 **10~100배 빠름**
- **일관성**: Lint + Format을 하나의 도구로
- **설정 간소화**: `biome.json` 하나로 통합

---

### 11. PyTorch → PyTorch Lightning 적용

**문제**: 기존 프로토타입의 raw PyTorch 학습 루프는 보일러플레이트가 많고 에러 발생 확률 높음.

**PyTorch Lightning 이점**:

- 구조화된 학습 코드 (`LightningModule`)
- 내장 로깅 (TensorBoard, W&B)
- 분산 학습, Mixed Precision 자동 처리
- 체크포인트 자동 관리
- 콜백 시스템 (Early Stopping, LR Scheduling)

---

### 12. MLflow — AI 실험 추적 시스템

**문제**: 현재 AI 메트릭을 DB의 JSONB 컬럼에 저장. 실험 비교, 모델 레지스트리, 아티팩트 관리 기능이 없음.

**MLflow 도입 시**:

- 실험 추적: 하이퍼파라미터, 메트릭, 아티팩트 자동 기록
- 모델 레지스트리: 버전별 모델 관리, 스테이지 전환 (Staging → Production)
- Self-hosted 가능 (Docker 배포)

---

### 13. OpenAPI → TypeScript 타입 자동 생성

**문제**: 백엔드 Pydantic 스키마와 프론트엔드 TypeScript 타입을 **수동으로 이중 관리**. 타입 불일치 위험.

**해결**: `openapi-typescript` CLI로 FastAPI의 OpenAPI 스키마에서 TypeScript 타입 자동 생성.

```bash
# CI/CD에서 자동 실행
npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.d.ts
```

---

### 14. 배포 인프라 재설계

| 구분         | 기존 계획                  | 변경 권장                              | 이유                        |
| :----------- | :------------------------- | :------------------------------------- | :-------------------------- |
| **Backend**  | AWS ECS                    | **Railway** (초기) → ECS (스케일링 시) | DevOps 오버헤드 90% 감소    |
| **Database** | AWS RDS + 자체 TimescaleDB | **Timescale Cloud**                    | 관리형 TimescaleDB 네이티브 |
| **Redis**    | AWS ElastiCache            | **Railway Redis** 또는 **Upstash**     | 서버리스, 과금 효율         |

**Railway 장점**: Dockerfile 기반 원클릭 배포, 자동 스케일링, 내장 모니터링. 초기 SaaS에 이상적.

---

### 15. 명시적 캐싱 전략 수립

| 계층   | 위치        | TTL             | 용도                                  |
| :----- | :---------- | :-------------- | :------------------------------------ |
| **L1** | React Query | 5분 (staleTime) | 클라이언트 캐시                       |
| **L2** | Redis       | 1시간~24시간    | 시세 데이터, 계산된 지표, 사용자 설정 |
| **L3** | PostgreSQL  | 영구            | 원본 데이터                           |

**캐시 무효화**: 이벤트 기반 (전략 수정 → 관련 캐시 무효화)

---

### 16. 커서 기반 페이지네이션 표준화

**문제**: 기존 프로토타입은 Offset 기반 페이지네이션. 대량 데이터 (거래 로그 100만건+)에서 성능 저하.

**커서 기반 장점**:

- 일관된 성능 (O(1) vs O(n))
- 실시간 데이터 삽입 시에도 누락/중복 없음
- 무한 스크롤 UI에 최적

---

## 🟢 NICE-TO-HAVE — 경쟁력 향상 (7건)

### 17. PWA (Progressive Web App) 지원

- 푸시 알림 (거래 실행, 가격 알림) — **시간 민감 정보에 필수**
- 홈 화면 설치
- 오프라인 기본 기능 (대시보드 캐시 조회)

### 18. 마켓 데이터 스크리너/탐색 페이지

- 실시간 가격 보드, 히트맵
- 거래량 분석
- 기술 지표 오버레이 실시간 차트
- **전략 대상 코인 발견** 용도

### 19. 백테스팅 샌드박스 (비회원 체험)

- 회원가입 없이 제한된 백테스트 실행 (1 페어, 1개월)
- 전환율 향상 목적
- 랜딩 페이지에 임베드

### 20. Property-Based Testing (Hypothesis)

- 백테스트 엔진 엣지 케이스 자동 발견
- 수학적 불변식 검증 (PnL = Entry - Exit ± Commission)
- 기존 라이브러리(Backtrader, Vectorbt) 결과와 교차 검증

### 21. 시각적 회귀 테스트 (Playwright Screenshot)

- UI 변경 시 의도치 않은 시각적 변경 탐지
- Playwright 내장 스크린샷 비교 (추가 비용 없음)

### 22. IP 화이트리스트

- API 키 사용 시 특정 IP만 허용
- 거래소 API 키 보안 강화

### 23. 통합 에러 처리 패턴

- 백엔드: 표준화된 에러 응답 포맷
- 프론트엔드: 라우트 세그먼트별 Error Boundary + Toast
- `error.tsx`, `loading.tsx` 모든 라우트에 배치

---

## 📊 변경 적용 후 기술 스택 비교

| 분야          | 기존 계획                     | 감사 후 확정                        |
| :------------ | :---------------------------- | :---------------------------------- |
| Frontend      | Next.js 14 + React 18         | **Next.js 16 + React 19**           |
| CSS           | Tailwind 3                    | **Tailwind v4**                     |
| 차트          | Recharts + Lightweight Charts | **ECharts + Lightweight Charts**    |
| 패키지 매니저 | npm                           | **pnpm**                            |
| Lint/Format   | ESLint + Prettier             | **Biome**                           |
| 타입 생성     | 수동                          | **openapi-typescript 자동**         |
| AI 학습       | Raw PyTorch                   | **PyTorch Lightning**               |
| AI 추적       | DB JSONB                      | **MLflow**                          |
| 엔진 성능     | Pure Python                   | **Numba JIT + 벡터화 NumPy**        |
| 배포 (BE)     | AWS ECS                       | **Railway → ECS**                   |
| DB 호스팅     | AWS RDS                       | **Timescale Cloud**                 |
| 파일 스토리지 | 로컬 디스크                   | **Cloudflare R2**                   |
| 실시간 통신   | 산발적 WebSocket              | **통합 WS Gateway + Redis Pub/Sub** |
| API 버저닝    | 없음                          | **`/api/v1/`**                      |
| 감사 로그     | 없음                          | **`audit_logs` 테이블**             |
| 캐싱          | 없음                          | **L1/L2/L3 계층 전략**              |
| 페이지네이션  | Offset                        | **Cursor 기반**                     |

---

## ✅ 변경 불필요 (최적 확인)

다음 기술 선택은 **현재 계획이 최적**임을 확인:

- ✅ **FastAPI + Pydantic v2**: 비동기 API, 자동 문서화, 타입 검증
- ✅ **Celery + Redis**: 분산 태스크 (+ Flower 모니터링 추가)
- ✅ **SQLAlchemy 2.0 async**: 복잡한 금융 관계형 쿼리에 최적 (SQLModel보다 유연)
- ✅ **PostgreSQL + TimescaleDB**: 관계형 + 시계열 최적 조합
- ✅ **PyTorch + ONNX + Optuna**: 딥러닝 학습/추론/최적화 표준
- ✅ **shadcn/ui + Framer Motion**: 커스터마이징 + 애니메이션
- ✅ **React Query + Zustand**: 서버/클라이언트 상태 분리 (Zustand 범위만 축소)
- ✅ **Sentry**: 에러 추적 표준
- ✅ **Docker + Vercel (FE)**: 컨테이너화 + Next.js 최적 배포
