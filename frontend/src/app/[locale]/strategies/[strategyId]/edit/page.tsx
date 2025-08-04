// frontend/src/app/[locale]/strategies/[id]/edit/page.tsx

"use client";

import { useState, useEffect } from "react";
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
import { Loader2, Save, ArrowLeft, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/Separator";
import { StrategyBacktestHistory } from "@/components/domain/strategy/StrategyBacktestHistory";
import { Spinner } from "@/components/ui/Spinner";

// --- 폼 스키마 정의 (Zod) ---
const formSchema = z.object({
  name: z
    .string()
    .min(3, { message: "전략 이름은 최소 3글자 이상이어야 합니다." })
    .max(100, { message: "전략 이름은 100자 이내여야 합니다." }),
  description: z
    .string()
    .max(500, { message: "설명은 500자 이내여야 합니다." })
    .optional(),
});

type StrategyFormValues = z.infer<typeof formSchema>;

interface StrategyUpdatePayload extends StrategyFormValues {
  rules?: any;
  is_public?: boolean;
}

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

interface BacktestResponse {
  id: number;
  user_id: number;
  strategy_id: number;
  status: string;
  parameters: Record<string, any>;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
  result?: { total_return_pct?: number };
  strategy?: { id: number; name: string };
}

// Next.js 라우터 파라미터를 위한 Props 타입 정의
interface EditStrategyPageProps {
  params: {
    // 👈 'id' 대신 'strategyId'로 변경
    strategyId: string;
  };
}

export default function EditStrategyPage({ params }: EditStrategyPageProps) {
  const t = useTranslations("StrategyBuilder");
  const router = useRouter();
  const queryClient = useQueryClient();

  // 👈 params.strategyId로 전략 ID 추출
  const strategyId = params.strategyId;

  // useStrategyState 훅을 사용하여 전략 규칙 상태 및 핸들러를 가져옵니다.
  const {
    buyRules,
    sellRules,
    addRule,
    deleteRule,
    updateRuleData,
    updateBlockCondition,
    updateBlockTimeframe,
    setRules, // setRules 함수 가져오기
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
    queryKey: ["strategyDetails", strategyId], // 쿼리 키에 ID 포함
    queryFn: async () => {
      const { data } = await apiClient.get(`/strategies/${strategyId}`);
      console.log("Fetched strategy data:", data);
      return data;
    },
    enabled: !!strategyId, // strategyId가 있을 때만 쿼리 실행
    staleTime: 1000 * 60,
    onSuccess: (data) => {
      form.reset({
        // 폼 필드 초기화
        name: data.name,
        description: data.description || "",
      });
      // setRules 함수를 사용하여 규칙 빌더 초기화
      setRules(data.rules.buy || [], data.rules.sell || []);
    },
    onError: (err) => {
      toast.error(t("form.loadError", { error: err.message }));
      console.error("Failed to load strategy:", err);
      router.push("/strategies");
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

  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const updateStrategyMutation = useMutation<
    StrategyResponse,
    Error,
    StrategyFormValues
  >({
    mutationFn: async (values) => {
      if (!existingStrategy) throw new Error("Strategy data not loaded.");
      const payload: StrategyUpdatePayload = {
        name: values.name,
        description: values.description,
        rules: {
          buy: buyRules,
          sell: sellRules,
        },
        is_public: existingStrategy.is_public, // 기존 is_public 값 유지
      };
      const { data } = await apiClient.put(
        `/strategies/${strategyId}`,
        payload
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(t("form.updateSuccess", { strategyName: data.name }));
      queryClient.invalidateQueries({ queryKey: ["userStrategies"] });
      queryClient.invalidateQueries({
        queryKey: ["strategyDetails", strategyId],
      });
    },
    onError: (error) => {
      let displayMessage = t("form.saveFailedGeneric");
      const apiError = error as any;

      if (
        apiError.response &&
        apiError.response.data &&
        apiError.response.data.detail
      ) {
        if (Array.isArray(apiError.response.data.detail)) {
          const validationErrors = apiError.response.data.detail
            .map((err: any) => {
              const field =
                err.loc && err.loc.length > 1 ? err.loc[1] : "unknown field";
              return `${field}: ${err.msg}`;
            })
            .join(", ");
          displayMessage = `${t(
            "form.validationErrorPrefix"
          )}: ${validationErrors}`;
        } else if (typeof apiError.response.data.detail === "string") {
          displayMessage = apiError.response.data.detail;
        }
      } else {
        displayMessage = error.message;
      }
      toast.error(t("form.updateError", { error: displayMessage }));
      console.error("Strategy update failed:", displayMessage, error);
    },
  });

  const onSubmit = (values: StrategyFormValues) => {
    if (buyRules.length === 0 && sellRules.length === 0) {
      toast.error(t("form.rulesRequired"));
      return;
    }
    updateStrategyMutation.mutate(values);
  };

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

  // 로딩 중이거나 에러 발생 시 로딩 스피너 또는 에러 메시지 표시
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

  // 데이터 로딩 실패 시 (isError는 useQuery의 onError에서 처리되므로, 여기서는 기본적으로 strategy가 없으면 에러로 간주)
  if (isErrorStrategy || !existingStrategy) {
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
            onClick={() => refetchStrategy()}
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

            {/* 저장 버튼 (업데이트 버튼으로 변경) */}
            <Button
              type="submit"
              className="w-fit h-10 px-6 rounded-md"
              disabled={updateStrategyMutation.isPending}
            >
              {updateStrategyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("form.updatingStrategy")}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t("form.updateButton")}
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
