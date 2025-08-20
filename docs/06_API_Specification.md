# 🔗 06. API 명세서 (API Specification)

이 문서는 'Project: Cortex'의 모든 API 엔드포인트와 데이터 형식을 정의합니다.

- **Base URL:** `/api`
- **Data Types:** 모든 ID 필드는 `string (UUID)` 형식입니다.
- **Content-Type:** `application/json`
- **Authorization:** 인증이 필요한 모든 요청은 `Authorization` 헤더에 `Bearer <access_token>` 을 포함해야 합니다.

---

## 1. 인증 (Authentication)

### `POST /auth/signup`

- **Description:** 새로운 사용자를 등록합니다.
- **Authorization:** `Public`
- **Request Body:** `json { "email": "string", "password": "string", "username": "string" } `
- **Success Response (201 Created):** `json { "id": "integer", "email": "string", "username": "string", "is_email_verified": "boolean" } `

### `POST /auth/login`

- **Description:** 이메일과 비밀번호로 로그인하여 JWT 액세스 토큰과 리프레시 토큰을 발급받습니다.
- **Authorization:** `Public`
- **Request Body:** `(Content-Type: application/x-www-form-urlencoded)`
  - `username`: "user@example.com"
  - `password`: "password123"
- **Success Response (200 OK):** `json { "access_token": "string", "token_type": "bearer", "refresh_token": "string" } `

### `POST /auth/refresh`

- **Description:** 리프레시 토큰을 사용하여 새로운 액세스 토큰과 리프레시 토큰을 발급받습니다.
- **Authorization:** `Required (Refresh Token)`
- **Request Body:** `json { "refresh_token": "string" } `
- **Success Response (200 OK):** `json { "access_token": "string", "token_type": "bearer", "refresh_token": "string" } `

### `POST /auth/logout`

- **Description:** 사용자의 리프레시 토큰을 무효화하여 로그아웃합니다.
- **Authorization:** `Required (Refresh Token)`
- **Request Body:** `json { "refresh_token": "string" } `
- **Success Response (204 No Content):** (No content)

### `POST /auth/callback/{provider}`

- **Description:** 소셜 로그인 제공자의 OAuth2 콜백을 처리합니다.
- **Authorization:** `Public`
- **Path Parameters:** `provider`: `google` | `kakao` | `naver`
- **Request Body:** `json { "code": "string", "state": "string" } `
- **Success Response (200 OK):** `json { "access_token": "string", "token_type": "bearer", "refresh_token": "string" } `

### `POST /auth/request-email-verification`

- **Description:** 사용자 이메일로 계정 활성화(이메일 인증) 링크를 발송합니다.
- **Authorization:** `Public`
- **Request Body:** `json { "email": "string" } `
- **Success Response (202 Accepted):** `json { "message": "string" } `

### `POST /auth/verify-email`

- **Description:** 이메일 인증 토큰을 확인하고, 유효한 경우 사용자의 이메일 인증 상태를 활성화합니다.
- **Authorization:** `Public`
- **Request Body:** `json { "token": "string" } `
- **Success Response (200 OK):** `json { "id": "integer", "email": "string", "username": "string", "is_email_verified": "boolean" } `

### `POST /auth/request-password-reset`

- **Description:** 사용자 이메일로 비밀번호 재설정 링크를 발송합니다.
- **Authorization:** `Public`
- **Request Body:** `json { "email": "string" } `
- **Success Response (202 Accepted):** `json { "message": "string" } `

### `POST /auth/reset-password`

- **Description:** 비밀번호 재설정 토큰을 확인하고, 유효한 경우 사용자의 비밀번호를 새 비밀번호로 업데이트합니다.
- **Authorization:** `Public`
- **Request Body:** `json { "token": "string", "new_password": "string" } `
- \*\*Success Response (200 OK):` `json { "id": "integer", "email": "string", "username": "string" } `

---

## 2. 사용자 (Users)

### `GET /users/me`

- **Description:** 현재 로그인된 사용자의 프로필 정보를 반환합니다.
- **Authorization:** `Required (User)`
- **Success Response (200 OK):** `json { "id": "integer", "email": "string", "username": "string", "role": "string", "is_email_verified": "boolean" } `

### `PUT /users/me/profile`

- **Description:** 현재 로그인된 사용자의 프로필 정보(예: username)를 업데이트합니다.
- **Authorization:** `Required (User)`
- **Request Body:** `json { "username": "string" } `
- **Success Response (200 OK):** `json { "id": "integer", "email": "string", "username": "string", ... } `

### `PUT /users/me/password`

- **Description:** 현재 로그인된 사용자의 비밀번호를 업데이트합니다.
- **Authorization:** `Required (User)`
- **Request Body:** `json { "current_password": "string", "new_password": "string" } `
- **Success Response (200 OK):** `json { "id": "integer", "email": "string", ... } `

### `GET /users/me/dashboard_summary`

- **Description:** 현재 로그인한 사용자의 대시보드 요약 정보를 조회합니다.
- **Authorization:** `Required (User)`
- **Success Response (200 OK):** `json { "email": "string", "username": "string", "user_id": "integer", "created_at": "datetime", "is_email_verified": "boolean", "current_plan_name": "string", "current_plan_price": "float", "subscription_end_date": "datetime | null", "subscription_is_active": "boolean", "max_backtests_per_day": "integer", "concurrent_bots_limit": "integer", "allowed_timeframes": "list[string]", "total_backtests_run_by_user": "integer", "successful_backtests_by_user": "integer", "total_live_bots_by_user": "integer", "active_live_bots_by_user": "integer", "latest_backtests": "list[schemas.Backtest]", "latest_live_bots": "list[schemas.LiveBot]" } `

---

## 3. 대시보드 (Dashboard)

### `GET /dashboard/summary`

- **Description:** 로그인한 사용자의 대시보드 요약 정보를 반환합니다.
- **Authorization:** `Required (User)`
- **Success Response (200 OK):** `json { "activeBotsCount": "integer", "totalProfitLoss": "float" } `

---

## 4. 백테스팅 (Backtesting)

### `POST /backtests`

- **Description:** 새로운 백테스팅 작업을 비동기적으로 요청합니다.
- **Authorization:** `Required (User)`
- **Request Body:**
  ```json
  {
    "strategy_id": "string(uuid)",
    "start_date": "string(datetime)",
    "end_date": "string(datetime)",
    "initial_capital": "float"
  }
  ```
- **Success Response (2022 Accepted):** `json { "id": "string(uuid)", ... }`

---

### `GET /backtests`

- **Description:** 현재 사용자가 실행했던 과거 백테스팅 결과 목록을 조회합니다.
- **Authorization:** `Required (User)`
- **Query Parameters:** `skip` (integer), `limit` (integer), `status_filter` (string), `strategy_id_filter` (integer)
- **Success Response (200 OK):** `json [ { "id": "integer", "executed_at": "datetime", "result_summary": "object" } ] `

### `GET /backtests/{backtest_id}`

- **Description:** 특정 백테스팅 작업의 상세 정보 및 결과를 조회합니다.
- **Authorization:** `Required (User)`
- **Path Parameters:** `backtest_id`: `integer`
- **Success Response (200 OK):** `json { "id": "integer", "user_id": "integer", "strategy_id": "integer", "status": "string", "result_summary": "object | null", "trade_log": "array | null", "created_at": "datetime", "completed_at": "datetime | null" } `

### `GET /backtests/{backtest_id}/trade_logs`

- **Description:** 특정 백테스트의 상세 거래 기록 목록을 조회합니다.
- **Authorization:** `Required (User)`
- **Path Parameters:** `backtest_id`: `integer`
- **Success Response (200 OK):** `json [ { "entry_id": "integer", "backtest_id": "integer", "timestamp": "datetime", "type": "string", "price": "float", "amount": "float", "balance": "float" } ] `

### `POST /backtests/{backtest_id}/cancel`

- **Description:** 진행 중인 백테스팅 작업을 취소하도록 요청합니다.
- **Authorization:** `Required (User)`
- **Path Parameters:** `backtest_id`: `integer`
- **Success Response (202 Accepted):** `json { "message": "string" } `

---

## 5. 전략 (Strategies)

### `POST /strategies`

- **Description:** 사용자 정의 전략을 생성하고 저장합니다.
- **Authorization:** `Required (User)`
- **Request Body:** `json { "name": "string", "description": "string", "rules": "object", "is_public": "boolean" } `
- **Success Response (201 Created):** `json { "id": "integer", "name": "string", "description": "string", "is_public": "boolean", "created_at": "datetime", "updated_at": "datetime" } `

### `GET /strategies`

- **Description:** 현재 사용자가 저장한 모든 전략 목록을 조회합니다.
- **Authorization:** `Required (User)`
- **Query Parameters:** `skip` (integer), `limit` (integer), `search_query` (string), `sort_by` (string), `is_public_filter` (string)
- **Success Response (200 OK):** `json [ { "id": "integer", "name": "string", "description": "string", "is_public": "boolean", "created_at": "datetime", "updated_at": "datetime" } ] `

### `GET /strategies/{strategy_id}`

- **Description:** 특정 ID의 전략 상세 정보를 조회합니다.
- **Authorization:** `Required (User)`
- **Path Parameters:** `strategy_id`: `integer`
- **Success Response (200 OK):** `json { "id": "integer", "user_id": "integer", "name": "string", "description": "string", "rules": "object", "is_public": "boolean", "created_at": "datetime", "updated_at": "datetime" } `

### `PUT /strategies/{strategy_id}`

- **Description:** 특정 ID의 전략을 업데이트합니다.
- **Authorization:** `Required (User)`
- **Path Parameters:** `strategy_id`: `integer`
- **Request Body:** `json { "name": "string", "description": "string", "rules": "object", "is_public": "boolean" } `
- **Success Response (200 OK):** `json { "id": "integer", "name": "string", ... } `

### `DELETE /strategies/{strategy_id}`

- **Description:** 특정 ID의 전략을 삭제합니다.
- **Authorization:** `Required (User)`
- **Path Parameters:** `strategy_id`: `integer`
- **Success Response (204 No Content):** (No content)

### `POST /strategies/calculate-indicators`

- **Description:** 전략 편집기 차트에 표시할 기술적 지표들을 계산합니다.
- **Authorization:** `Required (User)`
- **Request Body:**
  ```json
  {
    "ticker": "string",
    "timeframe": "string",
    "indicators": [
      {
        "indicatorKey": "string",
        "values": "object",
        "outputs": ["string"]
      }
    ]
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "results": {
      "EMA_20": [{ "time": "integer", "value": "float" }, ...],
      "RSI_14": [{ "time": "integer", "value": "float" }, ...]
    },
    "ohlcv": [{ "time": "integer", "open": "float", ... }, ...]
  }
  ```

### `POST /strategies/calculate-signals`

- **Description:** 전략 편집기 차트에 표시할 매매 신호를 실시간으로 계산합니다.
- **Authorization:** `Required (User)`
- **Request Body:** `json { "ticker": "string", "timeframe": "string", "longEntryRules": "object", ... }`
- **Success Response (200 OK):** `json { "signals": [ { "time": "integer", "signalType": "string" }, ... ] }`

---

## 6. 라이브 봇 (Live Bots)

### `POST /live_bots`

- **Description:** 새로운 자동매매 봇을 배포하고 시작합니다.
- **Authorization:** `Required (User)`
- **Request Body:** `json { "strategy_id": "integer", "api_key_id": "integer", "exchange": "string", "symbol": "string", "interval": "string", "initial_balance": "float" } `
- **Success Response (201 Created):** `json { "id": "integer", "user_id": "integer", "strategy_id": "integer", "api_key_id": "integer", "status": "string", "exchange": "string", "symbol": "string", "interval": "string", "start_balance": "float", "current_balance": "float", "started_at": "datetime", "stopped_at": "datetime | null", "last_run_at": "datetime | null" } `

### `GET /live_bots`

- **Description:** 현재 로그인된 사용자의 실시간 자동매매 봇 목록을 조회합니다.
- **Authorization:** `Required (User)`
- **Query Parameters:** `skip` (integer), `limit` (integer), `status_filter` (string), `strategy_id_filter` (integer)
- **Success Response (200 OK):** `json [ { "id": "integer", "user_id": "integer", "status": "string", "exchange": "string", "symbol": "string", "start_balance": "float", "current_balance": "float" } ] `

### `GET /live_bots/{bot_id}`

- **Description:** 특정 ID의 라이브 봇 상세 정보를 조회합니다.
- **Authorization:** `Required (User)`
- **Path Parameters:** `bot_id`: `integer`
- **Success Response (200 OK):** `json { "id": "integer", "user_id": "integer", "strategy_id": "integer", "api_key_id": "integer", "status": "string", "exchange": "string", "symbol": "string", "interval": "string", "start_balance": "float", "current_balance": "float", "started_at": "datetime", "stopped_at": "datetime | null", "last_run_at": "datetime | null" } `

### `PUT /live_bots/{bot_id}`

- **Description:** 특정 ID의 라이브 봇 상태를 업데이트합니다.
- **Authorization:** `Required (User)`
- **Path Parameters:** `bot_id`: `integer`
- **Request Body:** `json { "status": "string" } `
- **Success Response (200 OK):** `json { "id": "integer", "user_id": "integer", "status": "string", "started_at": "datetime", "stopped_at": "datetime" } `

### `DELETE /live_bots/{bot_id}`

- **Description:** 특정 ID의 라이브 봇을 삭제합니다.
- **Authorization:** `Required (User)`
- **Path Parameters:** `bot_id`: `integer`
- **Success Response (204 No Content):** (No content)

---

## 7. API 키 (API Keys)

### `POST /api_keys`

- **Description:** 새로운 암호화폐 거래소 API 키를 등록합니다.
- **Authorization:** `Required (User)`
- **Request Body:** `json { "api_key_name": "string", "exchange": "string", "api_key": "string", "secret_key": "string" } `
- **Success Response (201 Created):** `json { "id": "integer", "user_id": "integer", "api_key_name": "string", "exchange": "string", "created_at": "datetime", "updated_at": "datetime" } `

### `GET /api_keys`

- **Description:** 현재 사용자의 등록된 API 키 목록을 조회합니다.
- **Authorization:** `Required (User)`
- **Query Parameters:** `skip` (integer), `limit` (integer)
- **Success Response (200 OK):** `json [ { "id": "integer", "user_id": "integer", "api_key_name": "string", "exchange": "string", "created_at": "datetime", "updated_at": "datetime" } ] `

### `DELETE /api_keys/{api_key_id}`

- **Description:** 특정 ID의 API 키를 삭제합니다.
- **Authorization:** `Required (User)`
- **Path Parameters:** `api_key_id`: `integer`
- **Success Response (204 No Content):** (No content)

---

## 8. 구독 및 결제 (Subscriptions & Payments)

### `GET /plans`

- **Description:** 서비스에서 제공하는 모든 구독 플랜의 목록과 상세 정보를 조회합니다. 이 엔드포인트는 인증이 필요하지 않습니다.
- **Authorization:** `Public`
- **Success Response (200 OK):** `json [ { "id": "integer", "name": "string", "price": "float", "features": "object" } ] `

### `GET /subscriptions/me`

- **Description:** 현재 로그인된 사용자의 구독 상세 정보를 조회합니다.
- **Authorization:** `Required (User)`
- **Success Response (200 OK):** `json { "id": "integer", "user_id": "integer", "plan_id": "integer", "status": "string", "current_period_end": "datetime", "payment_gateway_sub_id": "string", "created_at": "datetime", "updated_at": "datetime", "plan": "object" } `

### `POST /subscriptions/checkout`

- **Description:** 특정 플랜을 구독하기 위한 결제 세션을 생성하고, 결제 페이지 URL을 반환합니다.
- **Authorization:** `Required (User)`
- **Request Body:** `json { "plan_id": "integer" } `
- **Success Response (200 OK):** `json { "checkout_url": "string" } `

### `POST /webhooks/payment/{payment_gateway}`

- **Description:** 결제 게이트웨이(Stripe, 아임포트 등)로부터 구독 상태 변경 알림(Webhook)을 수신합니다.
- **Authorization:** `Webhook (IP Whitelist)`
- **Path Parameters:** `payment_gateway`: `stripe` | `iamport`
- **Request Body:** (결제 게이트웨이에서 정의한 형식)
- **Success Response (200 OK):** `json { "status": "ok" } `

---

## 9. 커뮤니티 (Community)

### `POST /community/posts`

- **Description:** 자신의 백테스팅 결과를 커뮤니티에 공유(게시)합니다.
- **Authorization:** `Required (User)`
- **Request Body:** `json { "backtest_result_id": "integer", "title": "string", "content": "string", "is_public": "boolean" } `
- **Success Response (201 Created):** `json { "id": "integer", "title": "string", "content": "string", "author": "object", "backtest_result_id": "integer", "is_public": "boolean", "likes_count": "integer", "created_at": "datetime", "updated_at": "datetime" } `

### `GET /community/posts`

- **Description:** 커뮤니티 피드의 모든 게시물 목록을 조회합니다. (페이지네이션 적용)
- **Authorization:** `Public`
- **Query Parameters:** `skip` (integer), `limit` (integer), `search_query` (string), `sort_by` (string), `author_id` (integer)
- **Success Response (200 OK):** `json [ { "id": "integer", "title": "string", "author": "object", "likes_count": "integer", "comments_count": "integer", ... } ] `

### `GET /community/posts/{post_id}`

- **Description:** 특정 게시물의 상세 정보를 조회합니다.
- **Authorization:** `Public | Required (User if private post)`
- **Path Parameters:** `post_id`: `integer`
- **Success Response (200 OK):** `json { "id": "integer", "title": "string", "content": "string", "author": "object", "backtest_result": "object", "is_public": "boolean", "likes_count": "integer", "user_has_liked": "boolean", "created_at": "datetime", "updated_at": "datetime" } `

### `PUT /community/posts/{post_id}`

- **Description:** 특정 게시물을 업데이트합니다.
- **Authorization:** `Required (User)`
- **Path Parameters:** `post_id`: `integer`
- **Request Body:** `json { "title": "string", "content": "string", "is_public": "boolean" } `
- **Success Response (200 OK):** `json { "id": "integer", "title": "string", "content": "string", ... } `

### `DELETE /community/posts/{post_id}`

- **Description:** 특정 게시물을 삭제합니다.
- **Authorization:** `Required (User)`
- **Path Parameters:** `post_id`: `integer`
- **Success Response (204 No Content):** (No content)

### `POST /community/posts/{post_id}/comments`

- **Description:** 특정 게시물에 댓글을 작성합니다.
- **Authorization:** `Required (User)`
- **Request Body:** `json { "content": "string" } `
- **Success Response (201 Created):** `json { "id": "integer", "content": "string", "post_id": "integer", "user_id": "integer", "created_at": "datetime", "author": "object" } `

### `GET /community/posts/{post_id}/comments`

- **Description:** 특정 게시물의 댓글 목록을 조회합니다.
- **Authorization:** `Public`
- **Path Parameters:** `post_id`: `integer`
- **Query Parameters:** `skip` (integer), `limit` (integer)
- **Success Response (200 OK):** `json [ { "id": "integer", "content": "string", "author": "object", ... } ] `

### `DELETE /community/comments/{comment_id}`

- **Description:** 특정 댓글을 삭제합니다.
- **Authorization:** `Required (User)`
- **Path Parameters:** `comment_id`: `integer`
- **Success Response (204 No Content):** (No content)

### `POST /community/posts/{post_id}/likes`

- **Description:** 특정 게시물에 '좋아요'를 추가하거나 취소합니다 (토글 기능).
- **Authorization:** `Required (User)`
- **Path Parameters:** `post_id`: `integer`
- **Success Response (200 OK):** `json { "post_id": "integer", "user_id": "integer", "status": "string" } `

---

## 10. 관리자 (Admin)

### `GET /admin/dashboard_summary`

- **Description:** 관리자 대시보드에 표시될 시스템 전반의 핵심 통계 요약을 조회합니다.
- **Authorization:** `Required (Admin)`
- **Success Response (200 OK):** `json { "total_users": "integer", "active_users": "integer", "total_backtests": "integer", "completed_backtests": "integer", "total_live_bots": "integer", "active_live_bots": "integer", "total_strategies": "integer", "public_strategies": "integer", "active_subscriptions": "integer", "revenue_usd_m_3": "float" } `

### `GET /admin/users`

- **Description:** 모든 사용자 목록을 조회합니다.
- **Authorization:** `Required (Admin)`
- **Query Parameters:** `skip` (integer), `limit` (integer), `is_active` (boolean), `is_email_verified` (boolean), `role` (string), `search_query` (string)
- **Success Response (200 OK):** `json [ { "id": "integer", "email": "string", "username": "string", "role": "string", "is_active": "boolean", "is_email_verified": "boolean" } ] `

### `GET /admin/users/{user_id}`

- **Description:** 특정 사용자의 프로필 정보를 ID로 조회합니다.
- **Authorization:** `Required (Admin)`
- **Path Parameters:** `user_id`: `integer`
- **Success Response (200 OK):** `json { "id": "integer", "email": "string", "username": "string", "is_active": "boolean", "role": "string", "created_at": "datetime", "updated_at": "datetime", "is_email_verified": "boolean" } `

### `PUT /admin/users/{user_id}`

- **Description:** 특정 사용자의 정보(역할, 계정 상태 등)를 수정합니다.
- **Authorization:** `Required (Admin)`
- **Request Body:** `json { "role": "string", "is_active": "boolean", "is_email_verified": "boolean" } `
- **Success Response (200 OK):** `json { "id": "integer", ... } `

### `DELETE /admin/users/{user_id}`

- **Description:** 특정 사용자 계정을 삭제합니다.
- **Authorization:** `Required (Admin)`
- **Path Parameters:** `user_id`: `integer`
- **Success Response (204 No Content):** (No content)

### `GET /admin/strategies`

- **Description:** 모든 사용자의 전략 목록을 조회합니다.
- **Authorization:** `Required (Admin)`
- **Query Parameters:** `skip` (integer), `limit` (integer), `search_query` (string), `sort_by` (string), `is_public` (boolean), `author_id` (integer)
- **Success Response (200 OK):** `json [ { "id": "integer", "user_id": "integer", "name": "string", "is_public": "boolean", ... } ] `

### `GET /admin/backtests`

- **Description:** 모든 사용자의 백테스트 기록 목록을 조회합니다.
- **Authorization:** `Required (Admin)`
- **Query Parameters:** `skip` (integer), `limit` (integer), `status_filter` (string), `strategy_id_filter` (integer), `user_id_filter` (integer), `sort_by` (string)
- **Success Response (200 OK):** `json [ { "id": "integer", "user_id": "integer", "strategy_id": "integer", "status": "string", "created_at": "datetime", ... } ] `

### `GET /admin/live_bots`

- **Description:** 모든 사용자의 라이브 봇 목록을 조회합니다.
- **Authorization:** `Required (Admin)`
- **Query Parameters:** `skip` (integer), `limit` (integer), `status_filter` (string), `strategy_id_filter` (integer), `user_id_filter` (integer), `sort_by` (string)
- **Success Response (200 OK):** `json [ { "id": "integer", "user_id": "integer", "strategy_id": "integer", "status": "string", "exchange": "string", "symbol": "string", ... } ] `

---

## 11. 플랜 (Plans)

### `GET /plans`

- **Description:** 서비스에서 제공하는 모든 구독 플랜의 목록과 상세 정보를 조회합니다. 이 엔드포인트는 인증이 필요하지 않습니다.
- **Authorization:** `Public`
- **Success Response (200 OK):** `json [ { "id": "integer", "name": "string", "price": "float", "features": "object" } ] `
