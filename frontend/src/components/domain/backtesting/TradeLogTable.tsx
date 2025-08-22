// file: frontend/src/components/domain/backtesting/TradeLogTable.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

export const TradeLogTable = ({ tradeLogs }: { tradeLogs: any[] }) => (
  <Card>
    <CardHeader>
      <CardTitle>거래 기록 (Trade Logs)</CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Side</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Quantity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tradeLogs.slice(0, 10).map(
            (
              log,
              i // Show first 10 logs for example
            ) => (
              <TableRow key={i}>
                <TableCell>
                  {new Date(log.timestamp).toLocaleString()}
                </TableCell>
                <TableCell>{log.side}</TableCell>
                <TableCell>{log.price}</TableCell>
                <TableCell>{log.quantity}</TableCell>
              </TableRow>
            )
          )}
        </TableBody>
      </Table>
      {tradeLogs.length > 10 && (
        <p className="text-sm text-center mt-4 text-muted-foreground">
          ... and {tradeLogs.length - 10} more trades
        </p>
      )}
    </CardContent>
  </Card>
);
