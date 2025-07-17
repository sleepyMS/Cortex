# 🔗 06. API 명세서 (API Specification)

> 이 문서는 프론트엔드와 백엔드 간의 통신 규칙을 정의하는 '계약서'입니다.
> 모든 API 요청과 응답의 `Content-Type`은 `application/json`을 기본으로 합니다.

## 인증 (Authentication)

### `POST /api/auth/signup`

- **Description:** 새로운 사용자를 등록합니다.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Success Response (201 Created):**

  ```json
  {
    "id": 1,
    "email": "user@example.com"
  }
  ```

`POST /api/auth/login`

- **Description**: 이메일과 비밀번호로 로그인하여 JWT 토큰을 발급받습니다.
- **Request Body**: `(Content-Type: application/x-www-form-urlencoded)`

  - `username`: "user@example.com"
  - `password`: "password123"

- **Success Response (200 OK):**

  ```json
  {
    "access_token": "eyJhbGciOiJI...",
    "token_type": "bearer"
  }
  ```

`GET /api/users/me`

- **Description**: 현재 로그인된 사용자의 정보를 반환합니다.
- **Authorization**: `Bearer <access_token>`
- **Success Response (200 OK):**

  ```json
  {
    "id": 1,
    "email": "user@example.com",
    "is_active": true
  }
  ```

### 백테스팅 (Backtesting)

`POST /api/backtests`

- **Description**: 새로운 백테스팅을 실행하고 그 결과를 즉시 반환합니다.
- **Authorization**: `Bearer <access_token>`
- **Request Body**:

  ```json
  {
    "ticker": "BTC/KRW",
    "strategy_name": "sma_cross",
    "start_date": "2024-01-01",
    "end_date": "2024-12-31",
    "parameters": { "short_window": 5, "long_window": 20 }
  }
  ```

- **Success Response (200 OK):**

  ```json
  {
    "id": 123,
    "final_balance": 13570.5,
    "total_return_pct": 35.7,
    "mdd_pct": -12.5,
    "win_rate": 0.62,
    "trade_log": [
      { "type": "buy", "date": "2024-02-10", "price": 50000, "amount": 0.1 },
      { "type": "sell", "date": "2024-03-15", "price": 55000, "amount": 0.1 }
    ],
    "equity_curve": [
      { "date": "2024-01-01", "value": 10000 },
      { "date": "2024-01-02", "value": 10050 }
    ]
  }
  ```
