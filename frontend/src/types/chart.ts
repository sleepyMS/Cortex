// file: src/types/chart.ts

import { UTCTimestamp } from "lightweight-charts";

/**
 * 차트 범례(Legend)에 표시될 단일 시리즈의 데이터 포인트 정보입니다.
 * 캔들스틱(OHLC) 또는 단일 값(value)을 가질 수 있습니다.
 */
export interface LegendDataValue {
  time?: UTCTimestamp;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  value?: number; // 지표 값
  color?: string; // 시리즈 색상
}

/**
 * 차트 범례의 전체 데이터 구조입니다.
 * 키는 시리즈의 고유 식별자(예: 'CANDLE', 'RSI_14')이며,
 * 값은 해당 시리즈의 현재 십자선 위치의 데이터 포인트 정보입니다.
 */
export interface LegendData {
  [key: string]: LegendDataValue | undefined;
}
