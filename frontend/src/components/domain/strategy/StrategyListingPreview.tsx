// file: frontend/src/components/domain/strategy/StrategyListingPreview.tsx
"use client";

import { useTranslations } from "next-intl";
import { Strategy } from "@/types/strategy";
import { Control } from "react-hook-form";
import { format } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/Form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { KeyIndicatorBadges } from "./KeyIndicatorBadges";
import { TrendingUp, TrendingDown, Target } from "lucide-react";

interface StrategyListingPreviewProps {
  strategy: Strategy;
  control: Control<any>;
}

const StatDisplay = ({
  label,
  value,
  unit,
  Icon,
  colorClass,
}: {
  label: string;
  value: number;
  unit: string;
  Icon: React.ElementType;
  colorClass: string;
}) => (
  <div className="flex items-center gap-1.5">
    <Icon className={`h-4 w-4 ${colorClass}`} />
    <div className="flex items-baseline text-xs">
      <span className="text-muted-foreground mr-1">{label}:</span>
      <span className={`font-semibold ${colorClass}`}>
        {value.toFixed(2)}
        {unit}
      </span>
    </div>
  </div>
);

export const StrategyListingPreview = ({
  strategy,
  control,
}: StrategyListingPreviewProps) => {
  const t = useTranslations("StrategyListingPreview");
  const tCard = useTranslations("Marketplace.strategyMarketCard");

  return (
    <Card className="bg-muted/50 border-dashed">
      <CardHeader>
        <CardTitle className="text-2xl">{strategy.name}</CardTitle>

        <CardDescription className="line-clamp-3 min-h-[60px]">
          {strategy.description || t("noDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={control}
          name="representativeBacktestId"
          render={({ field }) => {
            // ▼▼▼ [핵심 수정 1/2] ▼▼▼
            // 현재 선택된 백테스트의 ID(field.value)를 사용해
            // 전체 백테스트 객체를 찾습니다.
            const selectedBacktest = strategy.backtests?.find(
              (bt) => bt.id === field.value
            );
            // ▲▲▲ [핵심 수정 1/2] ▲▲▲

            return (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-muted-foreground">
                  {t("performanceTitle")}
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    {/* ▼▼▼ [핵심 수정 2/2] ▼▼▼ */}
                    <SelectTrigger className="h-auto text-left">
                      {/* 선택된 값이 있으면, 직접 만든 간결한 UI를 표시합니다. */}
                      {selectedBacktest ? (
                        <div className="flex flex-col gap-1 py-1">
                          <p className="font-semibold text-sm text-foreground">
                            {format(
                              new Date(selectedBacktest.createdAt),
                              "yyyy-MM-dd HH:mm"
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("perfSummary", {
                              return: (
                                selectedBacktest.result?.totalReturnPct ?? 0
                              ).toFixed(2),
                              winRate: (
                                selectedBacktest.result?.winRatePct ?? 0
                              ).toFixed(2),
                            })}
                          </p>
                        </div>
                      ) : (
                        // 선택된 값이 없으면, 플레이스홀더를 표시합니다.
                        <SelectValue
                          placeholder={t("selectBacktestPlaceholder")}
                        />
                      )}
                    </SelectTrigger>
                    {/* ▲▲▲ [핵심 수정 2/2] ▲▲▲ */}
                  </FormControl>
                  <SelectContent>
                    {/* SelectContent 내부는 기존과 동일하게 유지 */}
                    {strategy.backtests?.length > 0 ? (
                      strategy.backtests.map((bt) => (
                        <SelectItem key={bt.id} value={bt.id}>
                          <div className="flex flex-col gap-2 py-2">
                            <p className="font-semibold text-sm">
                              {format(
                                new Date(bt.createdAt),
                                "yyyy-MM-dd HH:mm"
                              )}
                            </p>
                            <div className="flex flex-row gap-4 items-center flex-wrap">
                              <StatDisplay
                                label={tCard("totalReturn")}
                                value={bt.result?.totalReturnPct ?? 0}
                                unit="%"
                                Icon={
                                  (bt.result?.totalReturnPct ?? 0) >= 0
                                    ? TrendingUp
                                    : TrendingDown
                                }
                                colorClass={
                                  (bt.result?.totalReturnPct ?? 0) >= 0
                                    ? "text-emerald-500"
                                    : "text-rose-500"
                                }
                              />
                              <StatDisplay
                                label={tCard("mdd")}
                                value={bt.result?.mddPct ?? 0}
                                unit="%"
                                Icon={TrendingDown}
                                colorClass="text-amber-600"
                              />
                              <StatDisplay
                                label={tCard("winRate")}
                                value={bt.result?.winRatePct ?? 0}
                                unit="%"
                                Icon={Target}
                                colorClass="text-sky-500"
                              />
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div>{t("noBacktests")}</div>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />

                {selectedBacktest && selectedBacktest.result && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-md border bg-card text-card-foreground shadow-sm space-y-2">
                    {/* <h5 className="font-semibold text-base mb-2">
                      {t("selectedBacktestDetails")}
                    </h5> */}
                    <div className="flex flex-col gap-2">
                      <StatDisplay
                        label={tCard("totalReturn")}
                        value={selectedBacktest.result.totalReturnPct ?? 0}
                        unit="%"
                        Icon={
                          (selectedBacktest.result.totalReturnPct ?? 0) >= 0
                            ? TrendingUp
                            : TrendingDown
                        }
                        colorClass={
                          (selectedBacktest.result.totalReturnPct ?? 0) >= 0
                            ? "text-emerald-500"
                            : "text-rose-500"
                        }
                      />
                      <StatDisplay
                        label={tCard("mdd")}
                        value={selectedBacktest.result.mddPct ?? 0}
                        unit="%"
                        Icon={TrendingDown}
                        colorClass="text-amber-600"
                      />
                      <StatDisplay
                        label={tCard("winRate")}
                        value={selectedBacktest.result.winRatePct ?? 0}
                        unit="%"
                        Icon={Target}
                        colorClass="text-sky-500"
                      />
                    </div>
                  </div>
                )}
              </FormItem>
            );
          }}
        />
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">
            {t("indicatorsTitle")}
          </h4>
          <KeyIndicatorBadges strategy={strategy} />
        </div>
      </CardContent>
    </Card>
  );
};
