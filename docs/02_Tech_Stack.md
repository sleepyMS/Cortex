# 🛠️ 02. 기술 스택 (Tech Stack)

이 문서는 프로젝트에서 사용하는 모든 주요 기술과 그 선택 이유를 기술합니다.

## 1. 프론트엔드 (Frontend)

- **Framework: Next.js (App Router)**
  - **이유:** React Server Components를 통한 성능 최적화, 파일 기반 라우팅의 편의성, 강력한 생태계를 바탕으로 현대적인 웹 애플리케이션 개발에 가장 적합합니다.
- **Styling: Tailwind CSS**
  - **이유:** 빌드 시점에 모든 스타일을 생성하여 런타임 오버헤드가 없습니다. 유틸리티 우선 접근 방식은 빠른 개발 속도와 일관된 디자인 시스템 구축을 용이하게 합니다.
- **State Management: Zustand & TanStack Query**
  - **이유:** 클라이언트 상태(Zustand)와 서버 상태(TanStack Query)를 명확히 분리하여 관리합니다. 두 라이브러리 모두 가볍고 직관적인 사용법을 제공하여 보일러플레이트 없이 상태 관리가 가능합니다.
- **Language: TypeScript**
  - **이유:** 정적 타이핑을 통해 개발 단계에서 오류를 사전에 방지하고, 코드의 안정성과 예측 가능성을 높여 장기적인 유지보수에 필수적입니다.

## 2. 백엔드 (Backend)

- **Framework: FastAPI (Python)**
  - **이유:** 높은 성능, 자동 API 문서 생성, Pydantic을 통한 강력한 데이터 유효성 검사 등 개발 생산성과 실행 성능을 모두 만족시킵니다. 비동기 처리에 강점이 있어 실시간성이 중요한 애플리케이션에 적합합니다.
- **Data Processing: Polars**
  - **이유:** 대용량 백테스팅 데이터 처리 시 Pandas 대비 월등한 성능을 보입니다. 멀티코어를 적극적으로 활용하고 메모리 효율성이 뛰어나, 복잡한 데이터 연산의 병목 현상을 해결합니다.
- **ORM & Auth:** SQLAlchemy, Passlib, python-jose
  - **이유:** 표준적인 DB 통신(SQLAlchemy), 안전한 비밀번호 해싱(Passlib), JWT 토큰 처리(python-jose)를 위한 검증된 라이브러리 조합입니다.

## 3. 데이터베이스 (Database)

- **DB: PostgreSQL + TimescaleDB extension**
  - **이유:** 관계형 데이터(사용자, 전략)와 시계열 데이터(가격)를 하나의 DB에서 효율적으로 관리할 수 있습니다. 별도의 시계열 DB를 운영하는 복잡성을 피하고 인프라를 단순화하며, 익숙한 SQL로 모든 데이터를 통합 조회할 수 있는 것이 가장 큰 장점입니다.

## 4. 인프라 (Infrastructure)

- **Local Dev: Docker**
  - **이유:** `docker-compose`를 통해 로컬 개발 환경(DB 등)을 코드로 관리하고, 팀원 간 또는 다른 머신에서의 환경 일관성을 보장합니다.
- **Deployment: Vercel (Frontend), Docker on Cloud (Backend)**
  - **이유:** Vercel의 강력한 CI/CD 및 글로벌 CDN을 통해 프론트엔드 배포를 자동화하고 최적의 성능을 제공합니다. 백엔드는 Docker를 통해 어떤 클라우드 환경에서든 일관성 있는 배포를 보장합니다.
