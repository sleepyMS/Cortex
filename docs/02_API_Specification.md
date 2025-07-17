# 02. API 명세서 (API Specification)

## 인증 (Authentication)

### [API-001] 회원가입

- **Endpoint:** `POST /api/users/signup`
- **Description:** 새로운 사용자를 등록합니다.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Success Response (201):**
  ```json
  {
    "userId": 1,
    "email": "user@example.com"
  }
  ```

## 백테스팅 (Backtesting)

### [API-101] 백테스팅 실행

- **Endpoint:** `POST /api/backtests`
- **Description:** 새로운 백테스팅을 실행 요청합니다.
- **Request Body:**
  ```json
  {
    "strategyId": "MA_Cross",
    "ticker": "BTC/KRW",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "parameters": { "short_window": 5, "long_window": 20 }
  }
  ```
- **Success Response (200):**
  ```json
  {
    "resultId": "bt_result_xyz123",
    "status": "COMPLETED",
    "pnl": 45.7,
    "winRate": 0.68,
    "chartData": [
      /* ... */
    ]
  }
  ```
