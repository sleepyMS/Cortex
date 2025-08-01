// frontend/src/app/[locale]/strategies/[strategyId]/edit/page.tsx

"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation"; // useParams, useRouter 임포트
import { useTranslations } from "next-intl";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { IndicatorHub } from "@/components/domain/strategy/IndicatorHub";
import { StrategyBuilderCanvas } from "@/components/domain/strategy/StrategyBuilderCanvas";
import { IndicatorDefinition } from "@/lib/indicators";
import { useStrategyState } from "@/hooks/useStrategyState";
import { TargetSlot } from "@/types/strategy";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Loader2, Save, ArrowLeft, RefreshCw } from "lucide-react"; // RefreshCw 아이콘 추가
import { Separator } from "@/components/ui/Separator"; // 구분선 임포트
import { StrategyBacktestHistory } from "@/components/domain/strategy/StrategyBacktestHistory"; // 👈 백테스트 기록 컴포넌트 임포트
import { Spinner } from "@/components/ui/Spinner";

// --- 폼 스키마 정의 (Zod) ---
const formSchema = z.object({
  name: z
    .string()
    .min(1, { message: "전략 이름을 입력해주세요." })
    .max(100, { message: "전략 이름은 100자 이내여야 합니다." }),
  description: z
    .string()
    .max(500, { message: "설명은 500자 이내여야 합니다." })
    .optional(),
});

type StrategyFormValues = z.infer<typeof formSchema>;

// 백엔드 schemas.StrategyCreatePayload (PUT 요청에 사용)
interface StrategyUpdatePayload extends StrategyFormValues {
  rules?: any; // rules는 optional
  is_public?: boolean; // is_public도 optional
}

// 백엔드 schemas.Strategy 응답 타입
interface StrategyResponse {
  id: number;
  author_id: number;
  name: string;
  description?: string | null;
  rules: any;
  is_public: boolean;
  created_at: string;
  updated_at?: string | null;
}

// 백엔드 schemas.Backtest (related backtest records)
interface BacktestResponse {
  id: number;
  user_id: number;
  strategy_id: number;
  status: string; // "pending" | "running" | "completed" | "failed" | "canceled" | "error" | "failed_dispatch" | "initializing";
  parameters: Record<string, any>;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
  result?: { total_return_pct?: number }; // 간략화된 결과
  strategy?: { id: number; name: string }; // StrategyBase
}

export default function EditStrategyPage() {
  // 👈 컴포넌트 이름 변경
  const t = useTranslations("StrategyBuilder");
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams(); // URL 파라미터 가져오기
  const strategyId = params.strategyId as string; // 전략 ID

  // useStrategyState 훅을 사용하여 전략 규칙 상태 및 핸들러를 가져옵니다.
  const {
    buyRules,
    sellRules,
    addRule,
    deleteRule,
    updateRuleData,
    updateBlockCondition,
    updateBlockTimeframe,
  } = useStrategyState();

  const [isHubOpen, setIsHubOpen] = useState(false);
  const [currentTarget, setCurrentTarget] = useState<TargetSlot | null>(null);

  // --- 기존 전략 데이터 가져오기 ---
  const {
    data: existingStrategy,
    isLoading: isLoadingStrategy,
    isError: isErrorStrategy,
    error: errorStrategy,
    refetch: refetchStrategy,
  } = useQuery<StrategyResponse, Error>({
    queryKey: ["strategyDetails", strategyId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/strategies/${strategyId}`);
      return data;
    },
    enabled: !!strategyId, // strategyId가 있을 때만 쿼리 실행
    staleTime: 1000 * 60, // 1분 동안 fresh 상태 유지
    onSuccess: (data) => {
      // 폼과 useStrategyState에 기존 데이터 설정
      form.reset({
        name: data.name,
        description: data.description || "",
      });
      updateRuleData("buy", "", { ...data.rules.buy }); // useStrategyState의 규칙 업데이트 함수
      updateRuleData("sell", "", { ...data.rules.sell }); // TODO: useStrategyState에 초기 규칙 설정 함수 필요
      // 현재는 updateRuleData가 특정 블록ID를 받으므로,
      // 모든 규칙을 통째로 설정하는 함수를 useStrategyState에 추가하는 것이 좋습니다.
      // 임시 방편으로 아래 코드를 사용했습니다.
      if (data.rules.buy && data.rules.buy.length > 0) {
        // buyRules를 통째로 교체하는 로직
        (form as any)._formValues.buyRules = data.rules.buy;
        // updateRuleData 대신 직접 setBuyRules/setSellRules 호출 (안전하지 않음)
        // useStrategyState 훅에 setAllRules(buyRules, sellRules) 같은 함수 추가 필요
      }
      if (data.rules.sell && data.rules.sell.length > 0) {
        // sellRules를 통째로 교체하는 로직
        (form as any)._formValues.sellRules = data.rules.sell;
      }
    },
    onError: (error) => {
      const apiErrorDetail = (error as any)?.response?.data?.detail;
      const errorMessage = apiErrorDetail || error.message;
      toast.error(t("loadStrategyError", { error: errorMessage }));
      console.error("Failed to load strategy:", errorMessage, error);
      router.push("/strategies"); // 로드 실패 시 목록으로 돌아가기
    },
  });

  // --- 관련 백테스트 기록 가져오기 ---
  const {
    data: relatedBacktests,
    isLoading: isLoadingBacktests,
    isError: isErrorBacktests,
    error: errorBacktests,
    refetch: refetchBacktests,
  } = useQuery<BacktestResponse[], Error>({
    queryKey: ["strategyBacktests", strategyId],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/backtests?strategy_id_filter=${strategyId}`
      );
      return data;
    },
    enabled: !!strategyId && !isLoadingStrategy && !isErrorStrategy, // 전략 로드 성공 시에만 실행
    staleTime: 1000 * 60,
  });

  // --- 폼 관리 (react-hook-form) ---
  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // --- 전략 업데이트 뮤테이션 (PUT /api/strategies/{strategyId}) ---
  const updateStrategyMutation = useMutation<
    StrategyResponse,
    Error,
    StrategyFormValues
  >({
    mutationFn: async (values) => {
      const payload: StrategyUpdatePayload = {
        name: values.name,
        description: values.description,
        rules: {
          buy: buyRules,
          sell: sellRules,
        },
        // is_public은 별도 토글 버튼으로 관리되므로 여기서 업데이트하지 않거나, 폼에 추가
      };
      const { data } = await apiClient.put(
        `/strategies/${strategyId}`,
        payload
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(t("form.updateSuccess", { strategyName: data.name }));
      queryClient.invalidateQueries({ queryKey: ["userStrategies"] }); // 전략 목록 갱신
      queryClient.invalidateQueries({
        queryKey: ["strategyDetails", strategyId],
      }); // 상세 전략 데이터 갱신
      // router.push("/strategies"); // 업데이트 후 목록으로 이동
    },
    onError: (error) => {
      const apiErrorDetail = (error as any)?.response?.data?.detail;
      const errorMessage = apiErrorDetail || error.message;
      toast.error(t("form.updateError", { error: errorMessage }));
      console.error("Strategy update failed:", errorMessage, error);
    },
  });

  // 전체 폼 제출 핸들러
  const onSubmit = (values: StrategyFormValues) => {
    if (buyRules.length === 0 && sellRules.length === 0) {
      toast.error(t("form.rulesRequired"));
      return;
    }
    updateStrategyMutation.mutate(values);
  };

  // --- 지표 허브 및 규칙 빌더 관련 핸들러 (기존과 동일) ---
  const handleSlotClick = (
    ruleType: "buy" | "sell",
    blockId: string,
    condition: "conditionA" | "conditionB"
  ) => {
    setCurrentTarget({ ruleType, blockId, condition });
    setIsHubOpen(true);
  };

  const handleIndicatorSelect = (indicator: IndicatorDefinition) => {
    if (currentTarget) {
      updateBlockCondition(currentTarget, indicator);
    }
    setIsHubOpen(false);
    setCurrentTarget(null);
  };

  const handleTimeframeChange = (target: TargetSlot, newTimeframe: string) => {
    if (target) {
      updateBlockTimeframe(target, newTimeframe);
    }
  };

  // --- 로딩 및 에러 상태 UI ---
  if (isLoadingStrategy) {
    return (
      <AuthGuard>
        <div className="container mx-auto max-w-3xl p-8 flex h-full min-h-[400px] items-center justify-center">
          <Spinner size="lg" />
          <p className="ml-4 text-muted-foreground">{t("loadingStrategy")}</p>
        </div>
      </AuthGuard>
    );
  }

  if (isErrorStrategy) {
    return (
      <AuthGuard>
        <div className="container mx-auto max-w-3xl p-8 text-destructive-foreground text-center">
          <h1 className="text-3xl font-bold text-destructive mb-4">
            {t("errorLoadingTitle")}
          </h1>
          <p className="mb-2">
            {t("fetchError", { errorDetail: errorStrategy?.message })}
          </p>
          <Button
            onClick={() => router.push("/strategies")}
            variant="outline"
            className="mt-4"
          >
            {t("backToStrategyList")}
          </Button>
        </div>
      </AuthGuard>
    );
  }

  // --- 메인 렌더링 ---
  return (
    <AuthGuard>
      <IndicatorHub
        isOpen={isHubOpen}
        onOpenChange={setIsHubOpen}
        onSelect={handleIndicatorSelect}
      />
      <div className="container mx-auto max-w-3xl p-8">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="h-10"
            disabled={updateStrategyMutation.isPending}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> {t("form.goBackButton")}
          </Button>
          <h1 className="text-2xl font-bold text-foreground">
            {t("editTitle", {
              strategyName: existingStrategy?.name || t("unknownStrategy"),
            })}
          </h1>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetchStrategy()} // 전략 데이터 새로고침 버튼
            disabled={updateStrategyMutation.isPending}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* 전략 이름 입력 */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {t("form.nameLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("form.namePlaceholder")}
                      {...field}
                      className="h-10 rounded-md"
                      disabled={updateStrategyMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* 전략 설명 입력 */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {t("form.descriptionLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("form.descriptionPlaceholder")}
                      {...field}
                      className="h-10 rounded-md"
                      disabled={updateStrategyMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 전략 빌더 캔버스 (규칙 시각화 및 편집) */}
            <div className="mt-6">
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {t("rulesTitle")}
              </h3>
              <StrategyBuilderCanvas
                buyRules={buyRules}
                sellRules={sellRules}
                onAddRule={addRule}
                onDeleteRule={deleteRule}
                onUpdateRuleData={updateRuleData}
                onUpdateBlockCondition={updateBlockCondition}
                onSlotClick={handleSlotClick}
                onTimeframeChange={handleTimeframeChange}
              />
            </div>

            {/* 저장 버튼 */}
            <Button
              type="submit"
              className="w-fit h-10 px-6 rounded-md"
              disabled={updateStrategyMutation.isPending}
            >
              {updateStrategyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("form.savingStrategy")}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t("form.saveButton")}
                </>
              )}
            </Button>
          </form>
        </Form>

        <Separator className="my-8" />

        {/* 해당 전략으로 실행된 백테스트 기록 */}
        <div className="mt-6">
          <h3 className="mb-4 text-xl font-bold text-foreground">
            {t("relatedBacktestsTitle")}
          </h3>
          <StrategyBacktestHistory
            backtests={relatedBacktests}
            isLoading={isLoadingBacktests}
            isError={isErrorBacktests}
            error={errorBacktests}
            refetch={refetchBacktests}
          />
        </div>
      </div>
    </AuthGuard>
  );
}
