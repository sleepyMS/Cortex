// frontend/src/components/domain/backtester/BacktestSetupForm.tsx

"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Loader2 } from "lucide-react"; // CalendarIcon은 DatePickerCustom에서 사용되므로 여기서 제거

import { cn } from "@/lib/utils";
import apiClient from "@/lib/apiClient";
import { Button } from "@/components/ui/Button";
// 👈 Calendar 대신 DatePickerCustom 임포트
import { DatePickerCustom } from "@/components/ui/DatePickerCustom";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover"; // Popover는 DatePickerCustom에서 사용됨
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";

// --- 폼 스키마 정의 (Zod) ---
const formSchema = z.object({
  strategy_id: z.coerce
    .number()
    .int()
    .positive({ message: "전략을 선택해주세요." }),
  ticker: z
    .string()
    .min(1, { message: "거래 쌍을 입력해주세요." })
    .max(20, { message: "거래 쌍이 너무 깁니다." }),
  start_date: z.date({ required_error: "시작 날짜를 선택해주세요." }),
  end_date: z.date({ required_error: "종료 날짜를 선택해주세요." }),
  initial_capital: z.coerce
    .number()
    .min(1, { message: "초기 자본을 1 이상 입력해주세요." }),
  commission_rate: z.coerce
    .number()
    .min(0)
    .max(0.1, { message: "수수료율은 0%에서 10% 사이여야 합니다." })
    .optional(),
});

type BacktestFormValues = z.infer<typeof formSchema>;

// --- API 데이터 타입 정의 ---
interface StrategyResponse {
  id: number;
  name: string;
  description?: string;
  is_public: boolean;
  rules: any;
  author_id: number;
  created_at: string;
  updated_at?: string;
}

interface BacktestCreatedResponse {
  id: number;
  user_id: number;
  strategy_id: number;
  status: string;
  parameters: Record<string, any>;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
}

interface BacktestSetupFormProps {
  onBacktestStarted?: () => void;
}

export function BacktestSetupForm({
  onBacktestStarted,
}: BacktestSetupFormProps) {
  const t = useTranslations("BacktestSetupForm");
  const queryClient = useQueryClient();

  const form = useForm<BacktestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      strategy_id: 0,
      ticker: "BTC/USDT",
      start_date: new Date(2023, 0, 1),
      end_date: new Date(),
      initial_capital: 10000,
      commission_rate: 0.001,
    },
  });

  const { data: strategies, isLoading: isLoadingStrategies } = useQuery<
    StrategyResponse[],
    Error
  >({
    queryKey: ["userStrategies"],
    queryFn: async () => {
      const { data } = await apiClient.get("/strategies");
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const createBacktestMutation = useMutation<
    BacktestCreatedResponse,
    Error,
    BacktestFormValues
  >({
    mutationFn: async (newBacktest: BacktestFormValues) => {
      const payload = {
        strategy_id: newBacktest.strategy_id,
        ticker: newBacktest.ticker,
        start_date: newBacktest.start_date.toISOString(),
        end_date: newBacktest.end_date.toISOString(),
        initial_capital: newBacktest.initial_capital,
        additional_parameters: {
          commission_rate: newBacktest.commission_rate,
        },
      };
      const { data } = await apiClient.post("/backtests", payload);
      return data;
    },
    onSuccess: () => {
      toast.success(t("backtestStartedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["userBacktests"] });
      form.reset();
      onBacktestStarted?.();
    },
    onError: (error) => {
      const apiErrorDetail = (error as any).response?.data?.detail;
      const errorMessage = apiErrorDetail || error.message;
      toast.error(t("backtestStartedError", { error: errorMessage }));
      console.error("Backtest submission failed:", errorMessage, error);
    },
  });

  const onSubmit = (values: BacktestFormValues) => {
    if (values.start_date > values.end_date) {
      form.setError("end_date", {
        type: "manual",
        message: t("endDateBeforeStartDateError"),
      });
      return;
    }

    createBacktestMutation.mutate(values);
  };

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-2xl font-bold text-foreground">{t("title")}</h2>
      <p className="mb-6 text-muted-foreground">{t("description")}</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* 전략 선택 */}
          <FormField
            control={form.control}
            name="strategy_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("strategyLabel")}</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  value={field.value ? String(field.value) : ""}
                  disabled={
                    isLoadingStrategies || createBacktestMutation.isPending
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("selectStrategyPlaceholder")}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingStrategies ? (
                      <SelectItem value="loading" disabled>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                        {t("loadingStrategies")}
                      </SelectItem>
                    ) : strategies?.length === 0 ? (
                      <SelectItem value="no-strategies" disabled>
                        {t("noStrategiesAvailable")}
                      </SelectItem>
                    ) : (
                      strategies?.map((strategy) => (
                        <SelectItem
                          key={strategy.id}
                          value={String(strategy.id)}
                        >
                          {strategy.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 거래 쌍 (Ticker) */}
          <FormField
            control={form.control}
            name="ticker"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("tickerLabel")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder="BTC/USDT"
                    {...field}
                    disabled={createBacktestMutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 날짜 범위 선택 (DatePickerCustom 사용) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("startDateLabel")}</FormLabel>
                  <FormControl>
                    <DatePickerCustom
                      selectedDate={field.value}
                      onSelectDate={field.onChange}
                      disabled={createBacktestMutation.isPending}
                      maxDate={form.getValues("end_date")} // 시작 날짜는 종료 날짜보다 늦을 수 없음
                      placeholder={t("pickADate")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("endDateLabel")}</FormLabel>
                  <FormControl>
                    <DatePickerCustom
                      selectedDate={field.value}
                      onSelectDate={field.onChange}
                      disabled={createBacktestMutation.isPending}
                      minDate={form.getValues("start_date")} // 종료 날짜는 시작 날짜보다 빠를 수 없음
                      maxDate={new Date()} // 오늘 날짜 이후는 비활성화
                      placeholder={t("pickADate")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 초기 자본 */}
          <FormField
            control={form.control}
            name="initial_capital"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("initialCapitalLabel")}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="10000"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    disabled={createBacktestMutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 추가 파라미터: 수수료율 (예시) */}
          <FormField
            control={form.control}
            name="commission_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("commissionRateLabel")}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="0.001"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    disabled={createBacktestMutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={createBacktestMutation.isPending}
          >
            {createBacktestMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("startingBacktest")}
              </>
            ) : (
              t("runBacktestButton")
            )}
          </Button>
        </form>
      </Form>
    </Card>
  );
}
