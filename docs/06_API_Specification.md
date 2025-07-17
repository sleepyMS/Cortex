# 🔗 06. API 명세서 (API Specification)

이 문서는 'Project: Cortex'의 모든 API 엔드포인트와 데이터 형식을 정의합니다.

- **Base URL:** `/api`
- **Content-Type:** `application/json`
- **Authorization:** 인증이 필요한 모든 요청은 `Authorization` 헤더에 `Bearer <access_token>` 을 포함해야 합니다.

---

## 1. 인증 (Authentication)

### `POST /auth/signup`

- **Description:** 새로운 사용자를 등록합니다.
- **Authorization:** `Public`
- **Request Body:** `{ "email": "string", "password": "string" }`
- **Success Response (201 Created):** `{ "id": "integer", "email": "string" }`

### `POST /auth/login`

- **Description:** 이메일과 비밀번호로 로그인하여 JWT 액세스 토큰을 발급받습니다.
- **Authorization:** `Public`
- **Request Body:** `(Content-Type: application/x-www-form-urlencoded)`
  - `username`: "user@example.com"
  - `password`: "password123"
- **Success Response (200 OK):** `{ "access_token": "string", "token_type": "bearer" }`

---

## 2. 사용자 (Users)

### `GET /users/me`

- **Description:** 현재 로그인된 사용자의 상세 정보를 반환합니다.
- **Authorization:** `Required (User)`
- **Success Response (200 OK):** `{ "id": "integer", "email": "string", "role": "string", "subscription": { ... } }`

---

## 3. 백테스팅 (Backtesting)

### `POST /backtests`

- **Description:** 새로운 백테스팅을 실행하고 그 결과를 즉시 반환합니다.
- **Authorization:** `Required (User)`
- **Request Body:**

  ```json
  {
    "ticker": "BTC/KRW",
    "strategy_name": "sma_cross",
    "start_date": "2024-01-01",
    "end_date": "2024-12-31",
    "parameters": { "short_window": 5, "long_window": 20 }
  }
  ```

- **Success Response (200 OK):** `{ "id": "integer", "result_summary": { ... }, "trade_log": [ ... ] }`

### `GET /backtests`

- **Description:** 현재 사용자가 실행했던 과거 백테스팅 결과 목록을 조회합니다.
- **Authorization:** `Required (User)`
- **Success Response (200 OK):** `[ { "id": "integer", "executed_at": "datetime", "result_summary": { ... } } ]`

---

## 4. 전략 (Strategies)

### `POST /strategies`

- **Description:** 사용자 정의 전략을 생성하고 저장합니다.
- **Authorization:** `Required (User)`
- **Request Body:** `{ "name": "string", "description": "string", "rules": { ... } }`
- **Success Response (201 Created):** `{ "id": "integer", "name": "string", ... }`

### `GET /strategies`

- **Description:** 현재 사용자가 저장한 모든 전략 목록을 조회합니다.
- **Authorization:** `Required (User)`
- **Success Response (200 OK):** `[ { "id": "integer", "name": "string", ... } ]`

---

## 5. 구독 및 결제 (Subscriptions & Payments)

### `GET /subscriptions/plans`

- **Description:** 모든 구독 플랜(Free, Pro, Master)의 목록과 정보를 조회합니다.
- **Authorization:** `Public`
- **Success Response (200 OK):** `[ { "id": "integer", "name": "string", "price": "float", "features": { ... } } ]`

### `POST /subscriptions/checkout`

- **Description:** 특정 플랜을 구독하기 위한 결제 세션을 생성하고, 결제 페이지 URL을 반환합니다.
- **Authorization:** `Required (User)`
- **Request Body:** `{ "plan_id": "integer" }`
- **Success Response (200 OK):** `{ "checkout_url": "string" }`

### `POST /webhooks/payment`

- **Description:** 결제 게이트웨이(Stripe, 아임포트 등)로부터 구독 상태 변경(결제 성공, 실패, 취소 등)에 대한 알림(Webhook)을 수신하는 엔드포인트입니다.
- **Authorization:** `Webhook (IP Whitelist)`
- **Request Body:** (결제 게이트웨이에서 정의한 형식)
- **Success Response (200 OK):** `{ "status": "ok" }`

---

## 6. 커뮤니티 (Community)

### `POST /community/posts`

- **Description:** 자신의 백테스팅 결과를 커뮤니티에 공유(게시)합니다.
- **Authorization:** `Required (User)`
- **Request Body:** `{ "backtest_result_id": "integer", "title": "string", "content": "string" }`
- **Success Response (201 Created):** `{ "id": "integer", "title": "string", ... }`

### `GET /community/posts`

- **Description:** 커뮤니티 피드의 모든 게시물 목록을 조회합니다. (페이지네이션 적용)
- **Authorization:** `Public`
- **Success Response (200 OK):** `[ { "id": "integer", "title": "string", "author": { ... }, ... } ]`

### `POST /community/posts/{post_id}/comments`

- **Description:** 특정 게시물에 댓글을 작성합니다.
- **Authorization:** `Required (User)`
- **Request Body:** `{ "content": "string" }`
- **Success Response (201 Created):** `{ "id": "integer", "content": "string", ... }`

---

## 7. 관리자 (Admin)

### `GET /admin/users`

- **Description:** 모든 사용자 목록을 조회합니다.
- **Authorization:** `Required (Admin)`
- **Success Response (200 OK):** `[ { "id": "integer", "email": "string", "role": "string", ... } ]`

### `PUT /admin/users/{user_id}`

- **Description:** 특정 사용자의 정보(역할, 계정 상태 등)를 수정합니다.
- **Authorization:** `Required (Admin)`
- **Request Body:** `{ "role": "string", "is_active": "boolean" }`
- **Success Response (200 OK):** `{ "id": "integer", ... }`
