// file: frontend/src/components/domain/strategy/TargetCoinForm.tsx

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useUserSubscription } from "@/hooks/useUserSubscription";

import { TargetCoin } from "@/types/strategy";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { PlusCircle, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/Progress";
import { toast } from "sonner";
import { Separator } from "@/components/ui/Separator";

interface TargetCoinFormProps {
  targetCoins: TargetCoin[];
  setTargetCoins: (coins: TargetCoin[]) => void;
}

export function TargetCoinForm({
  targetCoins,
  setTargetCoins,
}: TargetCoinFormProps) {
  const t = useTranslations("StrategyBuilder");
  const { currentPlan } = useUserSubscription();
  const [newTicker, setNewTicker] = useState("");
  const totalAllocation = targetCoins.reduce(
    (sum, coin) => sum + coin.allocation_pct,
    0
  );

  // 👈 옵셔널 체이닝을 사용하여 안전하게 접근
  const maxCoins = currentPlan?.features?.max_coins_per_backtest || 1;

  const handleAddCoin = () => {
    const ticker = newTicker.trim().toUpperCase();
    if (!ticker) {
      toast.error(t("targetCoinForm.noTickerError"));
      return;
    }
    if (targetCoins.some((coin) => coin.ticker === ticker)) {
      toast.error(t("targetCoinForm.duplicateTickerError"));
      return;
    }
    if (targetCoins.length >= maxCoins) {
      toast.error(t("targetCoinForm.maxCoinsError", { max: maxCoins }));
      return;
    }

    const remainingAllocation = 100 - totalAllocation;
    const newCoins = [
      ...targetCoins,
      { ticker, allocation_pct: remainingAllocation },
    ];
    setTargetCoins(newCoins);
    setNewTicker("");
  };

  const handleRemoveCoin = (tickerToRemove: string) => {
    const newCoins = targetCoins.filter(
      (coin) => coin.ticker !== tickerToRemove
    );
    setTargetCoins(newCoins);
  };

  const handleAllocationChange = (ticker: string, newPct: number) => {
    if (newPct < 0 || newPct > 100) return;
    const newCoins = targetCoins.map((coin) =>
      coin.ticker === ticker ? { ...coin, allocation_pct: newPct } : coin
    );
    setTargetCoins(newCoins);
  };

  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-xl font-bold">{t("targetCoinForm.title")}</h2>
      <p className="text-sm text-muted-foreground">
        {t("targetCoinForm.description")}
      </p>

      {maxCoins > 1 && (
        <>
          <div className="flex items-center space-x-4">
            <Progress value={totalAllocation} className="h-2" />
            <span className="text-sm font-semibold">
              {totalAllocation.toFixed(2)}% / 100%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("targetCoinForm.allocationNote")}
          </p>
        </>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("targetCoinForm.tickerLabel")}</TableHead>
            <TableHead className="w-2/5">
              {t("targetCoinForm.allocationLabel")}
            </TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {targetCoins.map((coin) => (
            <TableRow key={coin.ticker}>
              <TableCell className="font-semibold">{coin.ticker}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    value={coin.allocation_pct}
                    onChange={(e) =>
                      handleAllocationChange(
                        coin.ticker,
                        Number(e.target.value)
                      )
                    }
                    className="w-24 text-right"
                  />
                  <span>%</span>
                </div>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveCoin(coin.ticker)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {targetCoins.length < maxCoins && (
        <div className="flex space-x-2 items-center">
          <Input
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value)}
            placeholder={t("targetCoinForm.addCoinPlaceholder")}
          />
          <Button type="button" onClick={handleAddCoin}>
            <PlusCircle className="mr-2 h-4 w-4" />{" "}
            {t("targetCoinForm.addButton")}
          </Button>
        </div>
      )}

      {maxCoins === 1 && (
        <p className="text-sm text-muted-foreground mt-4">
          {t("targetCoinForm.singleCoinMessage")}
        </p>
      )}
    </Card>
  );
}
