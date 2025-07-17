# Project: Cortex - A Crypto Quant Trading Platform

> 시장 데이터를 분석하고, 투자 전략을 검증하며, 자동매매를 실행하는 개인용 암호화폐 퀀트 트레이딩 플랫폼입니다.

## ✨ Core Features

-   **전략 백테스팅:** 다양한 기술적 지표를 활용한 투자 전략의 과거 성과 시뮬레이션
-   **실시간 대시보드:** 현재 자산 현황 및 자동매매 봇 상태 모니터링
-   **자동매매 실행:** 검증된 전략을 기반으로 실제 거래소에서 매매 실행
-   **전략 관리:** 나만의 투자 전략을 생성, 수정 및 관리

## 🛠️ Tech Stack

-   **Frontend:** React, TypeScript, React Query, Zustand, Styled-Components
-   **Backend:** Python, FastAPI, Pandas, TA-Lib
-   **Database:** PostgreSQL, InfluxDB
-   **Exchange API:** CCXT

## 🚀 Getting Started

```bash
# Frontend
cd frontend
npm install
npm start

# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
