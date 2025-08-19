// file: frontend/src/types/market.ts

import { UTCTimestamp } from "lightweight-charts";

export interface OHLCVData {
  time: number; // UTCTimestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SignalDataPoint {
  time: UTCTimestamp;
  signalType: "long_entry" | "long_exit" | "short_entry" | "short_exit";
}

export interface SignalData {
  signals: SignalDataPoint[];
}
