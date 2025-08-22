// file: frontend/src/components/domain/backtesting/BacktestResultSummary.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export const BacktestResultSummary = ({ result }: { result: any }) => (
  <Card>
    <CardHeader>
      <CardTitle>성과 요약 (Summary)</CardTitle>
    </CardHeader>
    <CardContent>
      <pre className="bg-slate-100 p-4 rounded-md">
        {JSON.stringify(result, null, 2)}
      </pre>
    </CardContent>
  </Card>
);
