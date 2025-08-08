// 파일 경로: frontend/src/components/domain/strategy/TargetCoinForm.tsx

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import { cn } from "@/lib/utils";

// --- 타입 및 UI 컴포넌트 임포트 ---
import { TargetCoin } from "@/types/strategy";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Progress } from "@/components/ui/Progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/Command";
import { PlusCircle, Trash2, ChevronsUpDown, Check } from "lucide-react";
import { toast } from "sonner";

interface TargetCoinFormProps {
  targetCoins: TargetCoin[];
  setTargetCoins: (coins: TargetCoin[]) => void;
}

// 서비스에서 지원하는 코인 목록 (실제 앱에서는 API 또는 별도 설정 파일에서 가져옵니다)
const SUPPORTED_COINS = [
  { value: "BTC/USDT", label: "Bitcoin (BTC/USDT)" },
  { value: "ETH/USDT", label: "Ethereum (ETH/USDT)" },
  { value: "SOL/USDT", label: "Solana (SOL/USDT)" },
  { value: "BNB/USDT", label: "Binance Coin (BNB/USDT)" },
  { value: "XRP/USDT", label: "Ripple (XRP/USDT)" },
  { value: "ADA/USDT", label: "Cardano (ADA/USDT)" },
];

export function TargetCoinForm({
  targetCoins,
  setTargetCoins,
}: TargetCoinFormProps) {
  const t = useTranslations("StrategyBuilder.targetCoinForm");
  const { currentPlan } = useUserSubscription();
  const [openCombobox, setOpenCombobox] = useState(false);

  // 현재 플랜에서 허용하는 최대 코인 개수 (기본값: 1)
  const maxCoins = currentPlan?.features?.max_coins_per_backtest ?? 1;

  // 총 자산 배분율 계산
  const totalAllocation = targetCoins.reduce(
    (sum, coin) => sum + (coin.allocationPct || 0),
    0
  );

  // 코인 추가 핸들러
  const handleAddCoin = (ticker: string) => {
    if (!ticker) {
      toast.error(t("noTickerError"));
      return;
    }
    if (targetCoins.some((coin) => coin.ticker === ticker)) {
      toast.error(t("duplicateTickerError"));
      return;
    }
    if (targetCoins.length >= maxCoins) {
      toast.error(t("maxCoinsError", { max: maxCoins }));
      return;
    }

    // 새로운 코인을 추가하고 자산 배분율을 재조정
    const newAllocation = 100 / (targetCoins.length + 1);
    const updatedCoins = [
      ...targetCoins.map((coin) => ({
        ...coin,
        allocationPct: newAllocation,
      })),
      { ticker, allocationPct: newAllocation },
    ];

    // 소수점 정리 및 마지막 코인에 나머지 할당
    let sum = 0;
    const finalCoins = updatedCoins.map((coin, index) => {
      const roundedPct = parseFloat(coin.allocationPct.toFixed(2));
      if (index < updatedCoins.length - 1) {
        sum += roundedPct;
        return { ...coin, allocationPct: roundedPct };
      }
      return { ...coin, allocationPct: parseFloat((100 - sum).toFixed(2)) };
    });

    setTargetCoins(finalCoins);
    setOpenCombobox(false); // Combobox 닫기
  };

  // 코인 제거 핸들러
  const handleRemoveCoin = (tickerToRemove: string) => {
    const newCoins = targetCoins.filter(
      (coin) => coin.ticker !== tickerToRemove
    );
    // 코인 제거 후 남은 코인들의 배분율을 100%에 맞게 재조정
    if (newCoins.length > 0) {
      const newAllocation = 100 / newCoins.length;
      const finalCoins = newCoins.map((coin, index) => {
        const roundedPct = parseFloat(newAllocation.toFixed(2));
        if (index < newCoins.length - 1) {
          return { ...coin, allocationPct: roundedPct };
        }
        const sumOfOthers = roundedPct * (newCoins.length - 1);
        return {
          ...coin,
          allocationPct: parseFloat((100 - sumOfOthers).toFixed(2)),
        };
      });
      setTargetCoins(finalCoins);
    } else {
      setTargetCoins([]);
    }
  };

  // 자산 배분율 변경 핸들러
  const handleAllocationChange = (ticker: string, newPctStr: string) => {
    const newPct = parseFloat(newPctStr);
    if (isNaN(newPct) || newPct < 0 || newPct > 100) return;

    const otherCoinsTotal = targetCoins
      .filter((coin) => coin.ticker !== ticker)
      .reduce((sum, coin) => sum + coin.allocationPct, 0);

    if (newPct + otherCoinsTotal > 100) {
      toast.warning(t("allocationExceeds100"));
      return;
    }

    const newCoins = targetCoins.map((coin) =>
      coin.ticker === ticker ? { ...coin, allocationPct: newPct } : coin
    );
    setTargetCoins(newCoins);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {maxCoins > 1
            ? t("descriptionMulti", { max: maxCoins })
            : t("descriptionSingle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {maxCoins > 1 && (
          <div className="space-y-2">
            <div className="flex items-center space-x-4">
              <Progress value={totalAllocation} className="h-2 flex-grow" />
              <span className="text-sm font-semibold tabular-nums">
                {totalAllocation.toFixed(2)}% / 100%
              </span>
            </div>
            {totalAllocation.toFixed(2) !== "100.00" && (
              <p className="text-xs text-destructive">
                {t("allocationWarning")}
              </p>
            )}
          </div>
        )}

        <div className="max-h-60 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("tickerLabel")}</TableHead>
                <TableHead className="w-2/5 text-right">
                  {t("allocationLabel")}
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targetCoins.length > 0 ? (
                targetCoins.map((coin) => (
                  <TableRow key={coin.ticker}>
                    <TableCell className="font-semibold">
                      {coin.ticker}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end space-x-2">
                        <Input
                          type="number"
                          value={coin.allocationPct}
                          onChange={(e) =>
                            handleAllocationChange(coin.ticker, e.target.value)
                          }
                          className="h-8 w-24 text-right"
                          step="0.01"
                          disabled={maxCoins === 1}
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCoin(coin.ticker)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {t("noCoinsAdded")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {targetCoins.length < maxCoins && (
          <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={openCombobox}
                className="w-full justify-between"
              >
                <span className="flex items-center">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t("addButton")}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder={t("searchCoinPlaceholder")} />
                <CommandList>
                  <CommandEmpty>{t("noCoinFound")}</CommandEmpty>
                  <CommandGroup>
                    {SUPPORTED_COINS.map((coin) => (
                      <CommandItem
                        key={coin.value}
                        value={coin.value}
                        onSelect={(currentValue) => {
                          handleAddCoin(currentValue.toUpperCase());
                        }}
                        disabled={targetCoins.some(
                          (c) => c.ticker === coin.value
                        )}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            targetCoins.some((c) => c.ticker === coin.value)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {coin.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </CardContent>
    </Card>
  );
}
