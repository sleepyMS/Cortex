// file: frontend/src/components/domain/backtesting/BacktestSetupForm.tsx

"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { addDays, startOfDay } from "date-fns";
import { DateRange } from "react-day-picker";

import apiClient from "@/lib/apiClient";
import { Strategy } from "@/types/strategy";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DatePickerCustom } from "@/components/ui/DatePickerCustom"; // DateRangePicker는 이 이름으로 가정
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Loader2 } from "lucide-react";

// --- Form Validation Schema (Zod) ---
const formSchema = z
  .object({
    strategyId: z.string().uuid({ message: "전략을 선택해주세요." }),
    dateRange: z.object({
      from: z.date({ required_error: "시작일을 선택해주세요." }),
      to: z.date({ required_error: "종료일을 선택해주세요." }),
    }),
    initialCapital: z.coerce
      .number()
      .min(1, "초기 자본금은 1 이상이어야 합니다."),
  })
  .refine((data) => data.dateRange.from < data.dateRange.to, {
    message: "종료일은 시작일보다 이후여야 합니다.",
    path: ["dateRange"],
  });

type FormValues = z.infer<typeof formSchema>;

export function BacktestSetupForm() {
  const t = useTranslations("BacktestSetupForm");
  const router = useRouter();
  const queryClient = useQueryClient();

  // --- Data Fetching for Strategy Select ---
  const { data: strategies, isLoading: isLoadingStrategies } = useQuery<
    Strategy[]
  >({
    queryKey: ["userStrategiesForSetup"],
    queryFn: async () => (await apiClient.get("/strategies?limit=1000")).data,
  });

  // --- Form Hook Setup ---
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      initialCapital: 10000,
      dateRange: {
        from: startOfDay(addDays(new Date(), -365)),
        to: startOfDay(new Date()),
      },
    },
  });

  // --- Mutation for Submitting Backtest Job ---
  const createBacktestMutation = useMutation({
    mutationFn: (data: FormValues) => {
      const payload = {
        strategy_id: data.strategyId,
        start_date: data.dateRange.from.toISOString(),
        end_date: data.dateRange.to.toISOString(),
        initial_capital: data.initialCapital,
      };
      return apiClient.post("/backtests", payload);
    },
    onSuccess: () => {
      toast.success(t("submitSuccess"));
      // 목록 페이지의 캐시를 무효화하여 다음 방문 시 최신 데이터를 불러오게 함
      queryClient.invalidateQueries({ queryKey: ["backtests"] });
      // 목록 페이지로 리디렉션하여 사용자가 방금 시작한 작업을 바로 확인하게 함
      router.push("/backtester");
    },
    onError: (error: any) =>
      toast.error(
        t("submitError", {
          error: error?.response?.data?.detail || error.message,
        })
      ),
  });

  // --- [확장 포인트] 사용자 구독 플랜에 따른 기간 제한 로직 ---
  // const { data: subscription } = useQuery(...);
  // const maxDaysAllowed = subscription?.plan === 'PRO' ? 365 * 5 : 365;
  // const disabledDate = (date) => date > new Date() || date < addDays(new Date(), -maxDaysAllowed);

  const onSubmit = (values: FormValues) => {
    createBacktestMutation.mutate(values);
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="strategyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("strategyLabel")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoadingStrategies}
                  >
                    <FormControl>
                      <SelectTrigger>
                        {isLoadingStrategies ? (
                          t("strategyLoading")
                        ) : (
                          <SelectValue placeholder={t("strategyPlaceholder")} />
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {strategies?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{t("strategyDescription")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateRange"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("dateRangeLabel")}</FormLabel>
                  <DatePickerCustom
                    date={field.value}
                    setDate={(range?: DateRange) => field.onChange(range)}
                    // disabled={disabledDate} // 향후 플랜 연동 시 활성화
                  />
                  <FormDescription>{t("dateRangeDescription")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="initialCapital"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("initialCapitalLabel")}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 10000" {...field} />
                  </FormControl>
                  <FormDescription>
                    {t("initialCapitalDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={createBacktestMutation.isPending}
            >
              {createBacktestMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("submitButton")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
