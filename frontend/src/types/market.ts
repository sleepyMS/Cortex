// file: src/types/market.ts

export interface OHLCVData {
  time: number; // Unix Timestamp (UTC)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
