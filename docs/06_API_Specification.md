# 🔗 06. API 명세서 (API Specification)

이 문서는 'Project: Cortex'의 모든 API 엔드포인트와 데이터 형식을 정의합니다.

- **Base URL:** `/api`
- **Data Types:** 모든 ID 필드는 `string (UUID)` 형식입니다.
- **Content-Type:** `application/json`
- **Authorization:** 인증이 필요한 모든 요청은 `Authorization` 헤더에 `Bearer <access_token>` 을 포함해야 합니다.
- **데이터 명명 규칙 (Data Naming Convention):** 백엔드 소스코드 및 DB는 `snake_case`를 사용하지만, **모든 API 요청/응답의 JSON Key는 `camelCase`로 자동 변환**됩니다.

---

## 1. 인증 (Authentication)

### `POST /auth/signup`

- **Description:** 신규 사용자를 등록하고 이메일 인증 링크를 발송합니다.
- **Authorization:** `Public`
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "username": "testuser"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "email": "user@example.com",
    "username": "testuser",
    "isActive": true,
    "isEmailVerified": false,
    "role": "user",
    "createdAt": "2025-09-17T18:30:00Z",
    "updatedAt": null,
    "subscription": null
  }
  ```

### `POST /auth/login`

- **Description:** 이메일과 비밀번호로 로그인하여 JWT 토큰 쌍을 발급받습니다.
- **Authorization:** `Public`
- **Request Body:** `(Content-Type: application/x-www-form-urlencoded)`
- **Success Response (200 OK):**
  ```json
  {
    "accessToken": "ey...",
    "tokenType": "bearer",
    "refreshToken": "def..."
  }
  ```

### `POST /auth/refresh`

- **Description:** 리프레시 토큰을 사용하여 새로운 토큰 쌍을 발급받습니다.
- **Authorization:** `Public`
- **Request Body:**
  ```json
  {
    "refreshToken": "def..."
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "accessToken": "ey...",
    "tokenType": "bearer",
    "refreshToken": "ghi..."
  }
  ```

### `POST /auth/logout`

- **Description:** 사용자의 리프레시 토큰을 무효화하여 로그아웃합니다.
- **Authorization:** `Public`
- **Request Body:**
  ```json
  {
    "refreshToken": "ghi..."
  }
  ```
- **Success Response (204 No Content):** (No content)

### `POST /auth/callback/{provider}`

- **Description:** 소셜 로그인 제공자의 OAuth2 콜백을 처리합니다.
- **Authorization:** `Public`
- **Path Parameters:** `provider`: `google` | `kakao` | `naver`
- **Request Body:**
  ```json
  {
    "code": "authorization_code_from_provider",
    "state": "optional_state_string"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "accessToken": "ey...",
    "tokenType": "bearer",
    "refreshToken": "jkl..."
  }
  ```

### `POST /auth/request-email-verification`

- **Description:** 계정 활성화를 위한 이메일 인증 링크를 발송합니다.
- **Authorization:** `Public`
- **Request Body:**
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Success Response (202 Accepted):**
  ```json
  {
    "message": "Verification email sent. Please check your inbox."
  }
  ```

### `POST /auth/verify-email`

- **Description:** 이메일 인증 토큰을 확인하고 사용자를 활성화합니다.
- **Authorization:** `Public`
- **Request Body:**
  ```json
  {
    "token": "a1b2c3d4e5f6..."
  }
  ```
- **Success Response (200 OK):** (POST /auth/signup 응답과 동일한 `User` 객체)

### `POST /auth/request-password-reset`

- **Description:** 비밀번호 재설정 링크를 발송합니다.
- **Authorization:** `Public`
- **Request Body:**
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Success Response (202 Accepted):**
  ```json
  {
    "message": "Password reset email sent. Please check your inbox."
  }
  ```

### `POST /auth/reset-password`

- **Description:** 비밀번호 재설정 토큰을 확인하고 비밀번호를 업데이트합니다.
- **Authorization:** `Public`
- **Request Body:**
  ```json
  {
    "token": "f6e5d4c3b2a1...",
    "newPassword": "newSecurePassword123"
  }
  ```
- **Success Response (200 OK):** (POST /auth/signup 응답과 동일한 `User` 객체)

---

## 2. 사용자 (Users)

### `GET /users/me`

- **Description:** 현재 로그인된 사용자의 전체 프로필 정보(구독 포함)를 반환합니다.
- **Authorization:** `Required (User)`
- **Success Response (200 OK):**
  ```json
  {
    "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "email": "user@example.com",
    "username": "testuser",
    "isActive": true,
    "isEmailVerified": true,
    "role": "user",
    "createdAt": "2025-09-17T18:30:00Z",
    "updatedAt": "2025-09-17T18:35:00Z",
    "subscription": {
      "id": "s1b2c3d4-e5f6-7890-1234-567890abcdef",
      "userId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "planId": "p1b2c3d4-e5f6-7890-1234-567890abcdef",
      "status": "active",
      "currentPeriodEnd": "2025-10-17T18:30:00Z",
      "plan": {
        "id": "p1b2c3d4-e5f6-7890-1234-567890abcdef",
        "name": "Trader",
        "price": 29000,
        "features": {
          "maxCoinsPerBacktest": 5,
          "maxStrategies": 20,
          "liveBotsLimit": 3,
          "dailyBacktestCount": 100,
          "maxBacktestDurationYears": 5,
          "supportedTimeframes": "1m,5m,15m,30m,1h,4h,1d,1w,1M",
          "communityAccess": true,
          "telegramAlerts": true,
          "advancedFeaturesAccess": true,
          "portfolioBacktestAccess": true
        }
      }
    }
  }
  ```

### `GET /users/me/profile`

- **Description:** 현재 사용자의 프로필 관리 페이지에 필요한 데이터를 조회합니다.
- **Authorization:** `Required (User)`
- **Success Response (200 OK):**
  ```json
  {
    "username": "testuser",
    "bio": "Trader and developer.",
    "avatarUrl": "[https://example.com/avatar.png](https://example.com/avatar.png)",
    "socialLinks": {
      "twitter": "[https://twitter.com/testuser](https://twitter.com/testuser)",
      "github": "[https://github.com/testuser](https://github.com/testuser)",
      "website": "[https://testuser.com](https://testuser.com)"
    },
    "featuredStrategyId": "s1b2c3d4-e5f6-7890-1234-567890abcdef"
  }
  ```

### `PUT /users/me/profile`

- **Description:** 현재 사용자의 프로필 정보(사용자명, 자기소개 등)를 업데이트합니다.
- **Authorization:** `Required (User)`
- **Request Body:**
  ```json
  {
    "username": "newTestuser",
    "bio": "Updated bio.",
    "socialLinks": {
      "twitter": "[https://twitter.com/newtestuser](https://twitter.com/newtestuser)",
      "github": "",
      "website": "[https://newtestuser.com](https://newtestuser.com)"
    },
    "featuredStrategyId": "s2b2c3d4-e5f6-7890-1234-567890abcdef"
  }
  ```
- **Success Response (200 OK):** (`GET /users/me` 응답과 동일한 `User` 객체)

### `PUT /users/me/password`

- **Description:** 현재 사용자의 비밀번호를 업데이트합니다.
- **Authorization:** `Required (User)`
- **Request Body:**
  ```json
  {
    "oldPassword": "password123",
    "newPassword": "newSecurePassword456"
  }
  ```
- **Success Response (200 OK):** (`GET /users/me` 응답과 동일한 `User` 객체)

### `DELETE /users/me`

- **Description:** 현재 사용자의 계정을 탈퇴 처리합니다 (Soft Delete).
- **Authorization:** `Required (User)`
- **Success Response (204 No Content):** (No content)

- **Description:** 현재 사용자가 **크레딧으로 구매하여 보유한** 모든 아이템(영구 소유 및 소모성) 목록을 조회합니다.
- **Authorization:** `Required (User)`
- **Success Response (200 OK):**
  ```json
  [
    {
      "productId": "item_uuid_theme_abc...",
      "name": "Dark Mode Pro Theme",
      "inventoryType": "UNLOCK",
      "quantity": 1,
      "purchasedAt": "2025-09-20T10:00:00Z"
    },
    {
      "productId": "item_uuid_ticket_xyz...",
      "name": "백테스팅 우선 처리권",
      "inventoryType": "CONSUMABLE",
      "quantity": 5,
      "purchasedAt": "2025-09-21T11:30:00Z"
    }
  ]
  ```

### `GET /users/me/purchased-strategies`

- **Description:** 현재 사용자가 **유료 크레딧으로 구매한** 모든 전략 목록을 조회합니다.
- **Authorization:** `Required (User)`
- **Success Response (200 OK):**
  ```json
  [
    {
      "purchaseId": "ps1b2c3d4-e5f6-7890-1234-567890abcdef",
      "strategyId": "s3b2c3d4-e5f6-7890-1234-567890abcdef",
      "name": "Super Scalper Strategy",
      "authorUsername": "proTrader",
      "pricePaid": 50000,
      "purchasedAt": "2025-09-16T11:00:00Z"
    }
  ]
  ```

---

## 3. 대시보드 (Dashboard)

### `GET /users/me/dashboard_summary`

- **Description:** 로그인한 사용자의 대시보드 요약 정보를 반환합니다.
- **Authorization:** `Required (User)`
- **Success Response (200 OK):**
  ```json
  {
    "email": "user@example.com",
    "username": "testuser",
    "userId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "createdAt": "2025-09-17T18:30:00Z",
    "isEmailVerified": true,
    "currentPlanName": "Trader",
    "currentPlanPrice": 29000,
    "subscriptionEndDate": "2025-10-17T18:30:00Z",
    "subscriptionIsActive": true,
    "maxBacktestsPerDay": 100,
    "concurrentBotsLimit": 3,
    "allowedTimeframes": ["1m", "5m", "15m", "1h", "4h", "1d"],
    "totalBacktestsRunByUser": 58,
    "successfulBacktestsByUser": 52,
    "totalLiveBotsByUser": 2,
    "activeLiveBotsByUser": 1
  }
  ```

---

## 4. 백테스팅 (Backtesting)

### `POST /backtests`

- **Description:** 새로운 백테스팅 작업을 비동기적으로 요청합니다. **요청 시 사용자의 플랜과 백테스트 조건에 따라 계산된 크레딧(무료+유료)이 자동으로 차감됩니다.**
- **Authorization:** `Required (User)`
- **Request Body:**
  ```json
  {
    "strategyId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2025-01-01T00:00:00Z",
    "initialCapital": 10000,
    "parameters": {
      "leverage": 1,
      "fee": 0.05,
      "slippage": 0.01,
      "overrides": [
        {
          "path": "longEntryRules.blocks.0.operandA.values.period",
          "value": 25
        }
      ]
    }
  }
  ```
- **Success Response (202 Accepted):**
  ```json
  {
    "id": "b1b2c3d4-e5f6-7890-1234-567890abcdef",
    "userId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "strategyId": "s1b2c3d4-e5f6-7890-1234-567890abcdef",
    "status": "pending",
    "createdAt": "2025-09-17T18:40:00Z",
    "completedAt": null
  }
  ```
- **Error Response**: **`402 Payment Required`**: 크레딧 잔액이 부족할 경우 반환됩니다.

### `GET /backtests`

- **Description:** 현재 사용자가 실행했던 과거 백테스팅 결과 목록을 조회합니다.
- **Authorization:** `Required (User)`
- **Query Parameters:** `skip` (integer), `limit` (integer), `statusFilter` (string), `strategyIdFilter` (string (UUID))
- **Success Response (200 OK):**
  ```json
  [
    {
      "id": "b1b2c3d4-e5f6-7890-1234-567890abcdef",
      "status": "completed",
      "createdAt": "2025-09-17T18:40:00Z",
      "result": {
        "totalReturnPct": 125.5,
        "winRatePct": 65.2,
        "mddPct": -15.8
      },
      "strategy": {
        "id": "s1b2c3d4-e5f6-7890-1234-567890abcdef",
        "name": "My EMA Cross Strategy"
      }
    }
  ]
  ```

### `POST /backtests/estimate-cost`

- **Description:** 백테스팅을 실제로 실행하기 전, 소모될 크레딧 비용을 미리 계산합니다.
- **Authorization:** `Required (User)`
- **Request Body:**
  ```json
  {
    "strategyId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2025-01-01T00:00:00Z"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "originalCost": 2000,
    "discountPct": 0.25,
    "finalCost": 1500,
    "userBalance": 12000,
    "isSufficient": true
  }
  ```

### `GET /backtests/{backtest_id}`

- **Description:** 특정 백테스팅 작업의 상세 정보 및 결과를 조회합니다.
- **Authorization:** `Required (User)`
- **Path Parameters:** `backtest_id`: `string (UUID)`
- **Success Response (200 OK):** (매우 상세한 `Backtest` 객체, `strategySnapshot` 및 전체 `result` 포함)

### `GET /backtests/{backtest_id}/trade_logs`

- **Description:** 특정 백테스트의 상세 거래 기록 목록을 조회합니다.
- **Authorization:** `Required (User)`
- **Path Parameters:** `backtest_id`: `string (UUID)`
- **Success Response (200 OK):**
  ```json
  [
    {
      "timestamp": "2024-01-10T10:00:00Z",
      "side": "buy",
      "price": 50000,
      "quantity": 0.1,
      "pnl": null,
      "currentBalance": 9995.0
    }
  ]
  ```

### `POST /backtests/{backtest_id}/cancel`

- **Description:** 진행 중인 백테스팅 작업을 취소하도록 요청합니다.
- **Authorization:** `Required (User)`
- **Path Parameters:** `backtest_id`: `string (UUID)`
- **Success Response (202 Accepted):** `json { "message": "Cancellation request received." }`

### `DELETE /backtests/{backtest_id}`

- **Description:** 특정 백테스트 기록을 관련 데이터(결과, 거래 로그)와 함께 영구적으로 삭제합니다.
- **Authorization:** `Required (User)`
- **Path Parameters:** `backtest_id`: `string (UUID)`
- **Success Response (204 No Content):** (No content)

---

## 5. 전략 (Strategies)

### `POST /strategies`

- **Description:** 새로운 사용자 정의 투자 전략을 생성합니다.
- **Authorization:** `Required (User)`
- **Request Body:**
  ```json
  {
    "name": "My New EMA Cross Strategy",
    "description": "A simple strategy using EMA crossover.",
    "isPublic": false,
    "longEntryRules": {
      "logicOperator": "AND",
      "blocks": [
        {
          "id": "block1",
          "type": "crossover",
          "mainLine": {
            "indicatorKey": "EMA",
            "outputs": ["ema"],
            "values": { "period": 12 },
            "timeframe": "1h"
          },
          "signalLine": {
            "indicatorKey": "EMA",
            "outputs": ["ema"],
            "values": { "period": 26 },
            "timeframe": "1h"
          },
          "crossDirection": "above"
        }
      ]
    },
    "targetCoins": [
      {
        "ticker": "BTC/USDT",
        "allocationPct": 100
      }
    ]
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "id": "s1b2c3d4-e5f6-7890-1234-567890abcdef",
    "authorId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "name": "My New EMA Cross Strategy",
    "description": "A simple strategy using EMA crossover.",
    "isPublic": false,
    "createdAt": "2025-09-17T19:00:00Z",
    "updatedAt": null,
    "longEntryRules": { "...": "..." },
    "targetCoins": [{ "ticker": "BTC/USDT", "allocationPct": 100 }],
    "backtests": []
  }
  ```

### `GET /strategies`

- **Description:** 현재 사용자의 모든 전략 목록(자신이 생성했거나 구매한 전략)을 조회합니다.
- **Authorization:** `Required (User)`
- **Query Parameters:** `skip` (integer), `limit` (integer), `searchQuery` (string), `sortBy` (string), `isPublicFilter` (boolean), `indicatorFilter` (string)
- **Success Response (200 OK):**
  ```json
  [
    {
      "id": "s1b2c3d4-e5f6-7890-1234-567890abcdef",
      "authorId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "name": "My New EMA Cross Strategy",
      "isPublic": false,
      "createdAt": "2025-09-17T19:00:00Z",
      "latestBacktestSummary": {
        "totalReturnPct": 150.5,
        "winRatePct": 68.2,
        "mddPct": -12.3
      },
      "marketplaceListing": null
    }
  ]
  ```

### `GET /strategies/{strategy_id}`

- **Description:** 특정 ID의 전략 상세 정보를 조회합니다. (작성자 또는 구매자만 접근 가능)
- **Authorization:** `Required (User)`
- **Path Parameters:** `strategy_id`: `string (UUID)`
- **Success Response (200 OK):** (`POST /strategies` 응답과 유사한 상세 `Strategy` 객체)

### `PUT /strategies/{strategy_id}`

- **Description:** 특정 ID의 전략을 업데이트합니다. (작성자만 가능)
- **Authorization:** `Required (User)`
- **Path Parameters:** `strategy_id`: `string (UUID)`
- **Request Body:** (`POST /strategies`의 Request Body와 유사하나, 모든 필드가 선택 사항)
- **Success Response (200 OK):** (`POST /strategies` 응답과 동일한 `Strategy` 객체)

### `DELETE /strategies/{strategy_id}`

- **Description:** 특정 ID의 전략을 삭제합니다. (작성자만 가능)
- **Authorization:** `Required (User)`
- **Path Parameters:** `strategy_id`: `string (UUID)`
- **Success Response (204 No Content):** (No content)

### `POST /strategies/calculate-indicators`

- **Description:** 전략 편집기 차트에 표시할 기술적 지표들을 계산합니다.
- **Authorization:** `Public`
- **Request Body:**
  ```json
  {
    "ticker": "BTC/USDT",
    "timeframe": "1h",
    "indicators": [
      { "indicatorKey": "SMA", "values": { "period": 20 }, "outputs": ["sma"] }
    ]
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "results": {
      "SMA_20": [ { "time": 1672531200, "value": 16546.8 }, ... ]
    }
  }
  ```

### `POST /strategies/calculate-signals`

- **Description:** 전략 편집기 차트에 표시할 매매 신호를 실시간으로 계산합니다.
- **Authorization:** `Required (User)`
- **Request Body:** (`POST /strategies`의 `longEntryRules` 등 규칙 객체 포함)
- **Success Response (200 OK):**
  ```json
  {
    "signals": [ { "time": 1672582800, "signalType": "long_entry" }, ... ]
  }
  ```

---

## 6. 라이브 봇 (Live Bots)

### `POST /live_bots`

- **Description:** 새로운 자동매매 봇을 배포하고 시작합니다.
- **Authorization:** `Required (User)`
- **Request Body:**
  ```json
  {
    "strategyId": "s1b2c3d4-e5f6-7890-1234-567890abcdef",
    "apiKeyId": "k1b2c3d4-e5f6-7890-1234-567890abcdef",
    "initialCapital": 5000,
    "ticker": "BTC/USDT"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "id": "bot1b2c3d4-e5f6-7890-1234-567890abcdef",
    "userId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "strategyId": "s1b2c3d4-e5f6-7890-1234-567890abcdef",
    "apiKeyId": "k1b2c3d4-e5f6-7890-1234-567890abcdef",
    "status": "active",
    "startedAt": "2025-09-17T19:10:00Z"
  }
  ```

### `GET /live_bots`

- **Description:** 현재 로그인된 사용자의 실시간 자동매매 봇 목록을 조회합니다.
- **Authorization:** `Required (User)`
- **Query Parameters:** `skip` (integer), `limit` (integer)
- **Success Response (200 OK):** (위 `POST /live_bots` 응답 객체의 배열)

### `GET /live_bots/{bot_id}`

- **Description:** 특정 ID의 라이브 봇 상세 정보를 조회합니다.
- **Authorization:** `Required (User)`
- **Path Parameters:** `bot_id`: `string (UUID)`
- **Success Response (200 OK):** (위 `POST /live_bots` 응답과 동일한 상세 `LiveBot` 객체)

### `PUT /live_bots/{bot_id}`

- **Description:** 특정 ID의 라이브 봇 상태를 업데이트합니다 (e.g., 일시중지).
- **Authorization:** `Required (User)`
- **Path Parameters:** `bot_id`: `string (UUID)`
- **Request Body:**
  ```json
  {
    "status": "paused"
  }
  ```
- **Success Response (200 OK):** (업데이트된 `LiveBot` 객체)

### `DELETE /live_bots/{bot_id}`

- **Description:** 특정 ID의 라이브 봇을 삭제합니다.
- **Authorization:** `Required (User)`
- **Path Parameters:** `bot_id`: `string (UUID)`
- **Success Response (204 No Content):** (No content)

---

## 7. API 키 (API Keys)

### `POST /api_keys`

- **Description:** 새로운 거래소 API 키를 등록하고 암호화하여 저장합니다.
- **Authorization:** `Required (User)`
- **Request Body:**
  ```json
  {
    "exchange": "binance",
    "apiKey": "your_api_key_string",
    "secretKey": "your_secret_key_string",
    "memo": "My main trading key",
    "isActive": true
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "id": "k1b2c3d4-e5f6-7890-1234-567890abcdef",
    "userId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "exchange": "binance",
    "apiKeyPreview": "your...ring",
    "memo": "My main trading key",
    "isActive": true,
    "createdAt": "2025-09-17T19:15:00Z"
  }
  ```

### `GET /api_keys`

- **Description:** 현재 사용자의 등록된 API 키 목록을 조회합니다.
- **Authorization:** `Required (User)`
- **Success Response (200 OK):** (위 `POST /api_keys` 응답 객체의 배열)

### `DELETE /api_keys/{api_key_id}`

- **Description:** 특정 API 키를 삭제합니다.
- **Authorization:** `Required (User)`
- **Path Parameters:** `api_key_id`: `string (UUID)`
- **Success Response (204 No Content):** (No content)

---

## 8. 구독 및 결제 (Subscriptions & Payments)

### `GET /subscriptions/me`

- **Description:** 현재 사용자의 구독 상세 정보를 조회합니다.
- **Authorization:** `Required (User)`
- **Success Response (200 OK):** (`GET /users/me` 응답의 `subscription` 객체와 동일)

### `POST /subscriptions/register-card`

- **Description:** 구독을 위해 카드를 등록하고 첫 결제를 요청합니다.
- **Authorization:** `Required (User)`
- **Request Body:**
  ```json
  {
    "planId": "p1b2c3d4-e5f6-7890-1234-567890abcdef",
    "authKey": "toss_frontend_sdk_auth_key"
  }
  ```
- **Success Response (200 OK):** (업데이트된 `Subscription` 객체)

### `POST /webhooks/toss-payments`

- **Description:** Toss Payments로부터 모든 결제 관련 웹훅(정기결제 성공/실패, 일반결제 등)을 수신합니다.
- **Authorization:** `Webhook`
- **Request Body:** (Toss Payments에서 정의한 형식)
- **Success Response (200 OK):** `json { "status": "ok" }`

### `POST /store/charge-orders`

- **Description:** 크레딧 팩 충전을 위한 주문을 생성하고 Toss Payments 현금 결제에 필요한 정보를 반환합니다. 이 API는 플랫폼과 사용자 간의 B2C 현금 거래를 담당합니다.
- **Authorization:** `Required (User)`
- **Request Body:**
  ```json
  {
    "packageId": "pkg_10000_credits_uuid",
    "amount": 10000
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "orderId": "credit_ord_abc...",
    "orderName": "Cortex 10,000 Credit Pack",
    "amount": 10000,
    "customerName": "testuser",
    "customerEmail": "user@example.com"
  }
  ```

---

## 9. 커뮤니티 (Community)

### `POST /community/posts`

- **Description:** 자신의 백테스팅 결과를 커뮤니티에 공유(게시)합니다.
- **Authorization:** `Required (User)`
- **Request Body:**
  ```json
  {
    "title": "My new BTC breakout strategy",
    "content": "This strategy performed well in recent volatile markets.",
    "backtestId": "b1b2c3d4-e5f6-7890-1234-567890abcdef",
    "isPublic": true
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "id": "post1b2c3d4-e5f6-7890-1234-567890abcdef",
    "authorId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "backtestId": "b1b2c3d4-e5f6-7890-1234-567890abcdef",
    "title": "My new BTC breakout strategy",
    "content": "This strategy performed well in recent volatile markets.",
    "createdAt": "2025-09-17T19:20:00Z",
    "likesCount": 0,
    "commentsCount": 0
  }
  ```

### `GET /community/posts`

- **Description:** 커뮤니티 피드의 모든 게시물 목록을 조회합니다. (페이지네이션 적용)
- **Authorization:** `Public`
- **Query Parameters:** `skip` (integer), `limit` (integer)
- **Success Response (200 OK):** (위 `POST /community/posts` 응답 객체의 배열)

### `GET /community/posts/{post_id}`

- **Description:** 특정 게시물의 상세 정보를 조회합니다.
- **Authorization:** `Public`
- **Path Parameters:** `post_id`: `string (UUID)`
- **Success Response (200 OK):** (위 `POST /community/posts` 응답과 동일한 상세 `Post` 객체)

### `PUT /community/posts/{post_id}`

- **Description:** 특정 게시물을 업데이트합니다. (작성자만 가능)
- **Authorization:** `Required (User)`
- **Path Parameters:** `post_id`: `string (UUID)`
- **Request Body:** `json { "title": "string", "content": "string" }`
- **Success Response (200 OK):** (업데이트된 `Post` 객체)

### `DELETE /community/posts/{post_id}`

- **Description:** 특정 게시물을 삭제합니다. (작성자만 가능)
- **Authorization:** `Required (User)`
- **Path Parameters:** `post_id`: `string (UUID)`
- **Success Response (204 No Content):** (No content)

### `POST /community/posts/{post_id}/comments`

- **Description:** 특정 게시물에 댓글을 작성합니다.
- **Authorization:** `Required (User)`
- **Path Parameters:** `post_id`: `string (UUID)`
- **Request Body:** `json { "content": "string" }`
- **Success Response (201 Created):** `json { "id": "c1b2c3d4...", "content": "Great strategy!", ... }`

### `GET /community/posts/{post_id}/comments`

- **Description:** 특정 게시물의 댓글 목록을 조회합니다.
- **Authorization:** `Public`
- **Path Parameters:** `post_id`: `string (UUID)`
- **Success Response (200 OK):** (댓글 객체의 배열)

### `POST /community/posts/{post_id}/likes`

- **Description:** 특정 게시물에 '좋아요'를 추가/취소합니다(토글).
- **Authorization:** `Required (User)`
- **Path Parameters:** `post_id`: `string (UUID)`
- **Success Response (200 OK):** `json { "status": "liked" | "unliked" }`

---

## 10. 관리자 (Admin)

### `GET /admin/users`

- **Description:** 모든 사용자 목록을 조회합니다.
- **Authorization:** `Required (Admin)`
- **Query Parameters:** `skip`, `limit`, `searchQuery`, `role`, `isActive`, `isEmailVerified`
- **Success Response (200 OK):** `json [ { "id": "string (UUID)", "email": "string", ... } ]`

### `PUT /admin/users/{user_id}`

- **Description:** 특정 사용자의 정보(역할, 활성 상태 등)를 수정합니다.
- **Authorization:** `Required (Admin)`
- **Path Parameters:** `user_id`: `string (UUID)`
- **Request Body:** `json { "role": "admin" | "user", "isActive": "boolean" }`
- **Success Response (200 OK):** (업데이트된 `User` 객체)

---

## 11. 플랜 (Plans)

### `GET /plans`

- **Description:** 서비스에서 제공하는 모든 구독 플랜의 목록과 상세 정보를 조회합니다.
- **Authorization:** `Public`
- **Success Response (200 OK):**
  ```json
  [
    {
      "id": "pl_basic_uuid",
      "name": "Basic",
      "price": 0,
      "features": { ... }
    },
    {
      "id": "pl_trader_uuid",
      "name": "Trader",
      "price": 29000,
      "features": { ... }
    }
  ]
  ```

---

## 12. 마켓플레이스 (Marketplace)

### `GET /marketplace/products`

- **Description:** 마켓플레이스의 상품(전략, 아이템) 목록을 필터링 및 페이지네이션하여 조회합니다.
- **Authorization:** `Public`
- **Query Parameters:** `page` (integer), `limit` (integer), `productType` (string), `sortBy` (string), `searchTerm` (string), `categories` (array of string)
- **Success Response (200 OK):**
  ```json
  {
    "products": [
      {
        "id": "prod_123...",
        "name": "Super Scalper Strategy",
        "price": 50000,
        "productType": "STRATEGY",
        "author": { "username": "proTrader" },
        "latestBacktestSummary": { "totalReturnPct": 250.7 }
      }
    ],
    "meta": {
      "totalItems": 1,
      "itemCount": 1,
      "itemsPerPage": 12,
      "totalPages": 1,
      "currentPage": 1
    }
  }
  ```

### `GET /marketplace/products/{product_id}`

- **Description:** 특정 상품의 상세 정보를 조회합니다. 구매 여부에 따라 응답 상세 수준이 달라집니다.
- **Authorization:** `Public` (비구매자는 공개 정보, 구매자는 모든 정보 확인 가능)
- **Path Parameters:** `product_id`: `string (UUID)`
- **Success Response (200 OK):** (공개용 또는 소유자용 `StrategyProductDetail` 객체)

### `POST /marketplace/orders`

- **Description:** 보유한 크레딧을 사용하여 마켓플레이스의 상품(전략, 아이템)을 구매합니다. 사용자 간(P2P) 거래이므로, **'유료 크레딧'만 사용 가능**합니다.
- **Authorization:** `Required (User)`
- **Request Body:**
  ```json
  {
    "items": [
      {
        "productId": "prod_123...",
        "quantity": 1
      }
    ]
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "id": "ord_xyz...",
    "buyerId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "totalAmount": 50000,
    "status": "COMPLETED",
    "createdAt": "2025-09-24T04:01:53Z",
    "items": [
      {
        "quantity": 1,
        "priceAtPurchase": 50000,
        "product": {
          "id": "prod_123...",
          "name": "Super Scalper Strategy"
        }
      }
    ]
  }
  ```
- **Error Response:** 402 Payment Required: 유료 크레딧 잔액이 부족할 경우 반환됩니다.

### `GET /marketplace/orders/{order_id}`

- **Description:** 특정 주문 ID의 상세 정보를 조회합니다. (주문자 본인만 가능)
- **Authorization:** `Required (User)`
- **Path Parameters:** `order_id`: `string (UUID)`
- **Success Response (200 OK):**
  ```json
  {
    "id": "ord_abc...",
    "buyerId": "a1b2c3d4...",
    "totalAmount": 50,
    "status": "COMPLETED",
    "createdAt": "2025-09-17T20:00:00Z",
    "items": [
      {
        "quantity": 1,
        "priceAtPurchase": 50,
        "product": { "id": "prod_123...", "name": "Super Scalper Strategy" }
      }
    ]
  }
  ```

### `POST /marketplace/listings`

- **Description:** 사용자의 전략을 마켓플레이스에 상품으로 등록합니다.
- **Authorization:** `Required (User)`
- **Request Body:**
  ```json
  {
    "strategyId": "s1b2c3d4...",
    "price": 50000,
    "category": "Scalping",
    "positionType": "LongOnly",
    "description": "This is a great strategy for short timeframes.",
    "representativeBacktestId": "b1b2c3d4..."
  }
  ```
- **Success Response (201 Created):** (생성된 `StrategyProduct` 객체)

### `DELETE /marketplace/listings/{product_id}`

- **Description:** 마켓플레이스에 등록된 상품을 판매 중단 처리합니다. (판매자 본인만 가능)
- **Authorization:** `Required (User)`
- **Path Parameters:** `product_id`: `string (UUID)`
- **Success Response (204 No Content):** (No content)

---

## 13. 웹소켓 (WebSocket)

### `WS /ws/backtest/{backtest_id}`

- **Description:** 백테스트 진행 상황을 실시간으로 클라이언트에게 전달합니다.
- **Connection Parameters:** `backtest_id`: `string (UUID)`
- **Messages from Server:** `json { "status": "string", "progress": "integer", "message": "string" }`

---

## 14. 크레딧 (Credits)

### `GET /credits/me/balance`

- **Description:** 현재 사용자의 크레딧 잔액을 유료/무료로 구분하여 상세 조회합니다.
- **Authorization:** `Required (User)`
- **Success Response (200 OK):**
  ```json
  {
    "totalBalance": 15000,
    "breakdown": {
      "purchased": 10000,
      "expiringWeekly": 5000,
      "event": []
    }
  }
  ```

### `GET /credits/me/transactions`

- **Description:** 크레딧 사용 내역 목록을 페이지네이션하여 조회합니다.
- **Authorization:** `Required (User)`
- **Query Parameters:** `skip (integer)`, `limit (integer)`
- **Success Response (200 OK):**
  ```json
  [
    {
      "id": "txn_abc...",
      "totalAmountDeducted": 1500,
      "discountPct": 0.25,
      "relatedEntityType": "BACKTEST",
      "createdAt": "2025-09-17T20:30:00Z",
      "details": [
        { "sourceType": "ATTENDANCE_BONUS", "amountDedducted": 500 },
        { "sourceType": "PURCHASE", "amountDeducted": 1000 }
      ]
    }
  ]
  ```

---

## 15. 정산 (Settlements)

### `GET /settlements/me/summary`

- **Description:** (판매자용) 자신의 누적 판매액 및 정산 예정 금액(KRW) 요약을 조회합니다.
- **Authorization:** `Required (User)`
- **Success Response (200 OK):**
  ```json
  {
    "totalRevenueKrw": 500000,
    "totalFeesKrw": 50000,
    "totalPayoutsKrw": 350000,
    "pendingPayoutKrw": 100000
  }
  ```

### `GET /settlements/me/history`

- **Description:** (판매자용) 월별 정산 내역 목록을 조회합니다.
- **Authorization:** `Required (User)`
- **Success Response (200 OK):**
  ```json
  [
    {
      "payoutId": "set_abc...",
      "payoutDate": "2025-09-20",
      "payoutAmountKrw": 100000,
      "status": "COMPLETED"
    }
  ]
  ```
