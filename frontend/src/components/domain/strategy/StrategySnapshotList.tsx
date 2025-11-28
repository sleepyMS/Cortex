"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { BacktestHistoryItem } from "@/types/strategy";
import apiClient from "@/lib/apiClient";

interface StrategySnapshotListProps {
  backtests: BacktestHistoryItem[];
  onRestore: (snapshot: any) => void;
}

export function StrategySnapshotList({
  backtests,
  onRestore,
}: StrategySnapshotListProps) {
  const t = useTranslations("StrategySnapshotList");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleRestore = async (backtestId: string) => {
    try {
      setLoadingId(backtestId);
      const { data } = await apiClient.get(`/backtests/${backtestId}`);

      if (!data.strategySnapshot) {
        toast.error(t("noSnapshotError"));
        return;
      }

      onRestore(data.strategySnapshot);
      toast.success(t("restoreSuccess"));
    } catch (error) {
      console.error("Failed to fetch backtest details:", error);
      toast.error(t("restoreError"));
    } finally {
      setLoadingId(null);
    }
  };

  // if (!backtests || backtests.length === 0) {
  //   return null;
  // }

  const sortedBacktests = [...backtests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border h-[300px] overflow-y-auto custom-scrollbar relative">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>{t("columns.date")}</TableHead>
                <TableHead className="text-right">
                  {t("columns.return")}
                </TableHead>
                <TableHead className="text-right">
                  {t("columns.winRate")}
                </TableHead>
                <TableHead className="text-right">{t("columns.mdd")}</TableHead>
                <TableHead className="text-right">
                  {t("columns.action")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBacktests.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-[200px] text-center text-muted-foreground"
                  >
                    {t("emptyState")}
                  </TableCell>
                </TableRow>
              ) : (
                sortedBacktests.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(item.createdAt), "yyyy-MM-dd HH:mm")}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span
                        className={
                          (item.result?.totalReturnPct || 0) >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        }
                      >
                        {item.result?.totalReturnPct?.toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.result?.winRatePct?.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right text-red-400">
                      {item.result?.mddPct?.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore(item.id)}
                        disabled={loadingId === item.id}
                        title={t("restoreButtonTooltip")}
                      >
                        {loadingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
