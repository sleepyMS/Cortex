// file: frontend/src/components/domain/backtesting/EquityChart.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export const EquityChart = ({ result }: { result: any }) => (
  <Card>
    <CardHeader>
      <CardTitle>자산 곡선 (Equity Curve)</CardTitle>
    </CardHeader>
    <CardContent className="h-96 flex items-center justify-center">
      <p className="text-muted-foreground">
        [ lightweight-charts 라이브러리를 사용한 차트가 여기에 렌더링됩니다. ]
      </p>
      <p>PNL Curve Data Length: {result.pnl_curve_json?.length || 0}</p>
    </CardContent>
  </Card>
);
