export interface TradeLog {
  id: string;
  timestamp: string; // ISO 8601 string
  side: "buy" | "sell";
  price: number;
  quantity: number;
  pnl: number | null;
  commission: number;
  currentBalance: number;
  reason: string;
}
