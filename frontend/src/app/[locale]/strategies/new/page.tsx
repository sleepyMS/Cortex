// frontend/src/app/[locale]/strategies/new/page.tsx

"use client";

import { useState } from "react";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
import { Loader2, Save, ArrowLeft } from "lucide-react";

// --- 폼 스키마 정의 (Zod) ---
// 백엔드 schemas.StrategyCreate와 일치하도록 정의합니다.
const formSchema = z.object({
  name: z
    .string()
    .min(1, { message: "전략 이름을 입력해주세요." })
    .max(100, { message: "전략 이름은 100자 이내여야 합니다." }),
  description: z
    .string()
    .max(500, { message: "설명은 500자 이내여야 합니다." })
    .optional(),
  // rules는 useStrategyState에서 관리되므로 폼 스키마에 직접 포함하지 않음
  // 폼 제출 시 rules는 useStrategyState의 상태로부터 가져와서 페이로드에 추가할 것입니다.
});

type StrategyFormValues = z.infer<typeof formSchema>;

// 백엔드 schemas.StrategyCreate와 schemas.Strategy 응답 타입 (API 명세서 참조)
interface StrategyCreatePayload extends StrategyFormValues {
  rules: any; // SignalBlockData 형식의 규칙
  is_public: boolean; // 기본값 false로 설정
}

interface StrategyResponse {
  id: number;
  name: string;
  description?: string;
  rules: any;
  is_public: boolean;
  author_id: number;
  created_at: string;
  updated_at?: string;
}

export default function NewStrategyPage() {
  const t = useTranslations("StrategyBuilder");
  const router = useRouter();
  const queryClient = useQueryClient();

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

  // --- 폼 관리 (react-hook-form) ---
  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // --- 전략 저장 뮤테이션 (POST /api/strategies) ---
  const createStrategyMutation = useMutation<
    StrategyResponse,
    Error,
    StrategyFormValues
  >({
    mutationFn: async (values) => {
      // 폼 데이터와 useStrategyState의 규칙을 결합하여 페이로드 생성
      const payload: StrategyCreatePayload = {
        name: values.name,
        description: values.description,
        rules: {
          // 백엔드의 Dict[Literal["buy", "sell"], List[SignalBlockData]] 형식에 맞춤
          buy: buyRules,
          sell: sellRules,
        },
        is_public: false, // 기본값은 비공개
      };
      const { data } = await apiClient.post("/strategies", payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success(t("form.saveSuccess", { strategyName: data.name }));
      queryClient.invalidateQueries({ queryKey: ["userStrategies"] }); // 전략 목록 갱신
      form.reset(); // 폼 초기화 (defaultValues로 돌아감)
      router.push("/strategies");
    },
    onError: (error) => {
      const apiErrorDetail = (error as any)?.response?.data?.detail;
      const errorMessage = apiErrorDetail || error.message;
      toast.error(t("form.saveError", { error: errorMessage }));
      console.error("Strategy save failed:", errorMessage, error);
    },
  });

  // 전체 폼 제출 핸들러
  const onSubmit = (values: StrategyFormValues) => {
    // 규칙이 비어있는지 확인하는 유효성 검사 (필요하다면)
    if (buyRules.length === 0 && sellRules.length === 0) {
      toast.error(t("form.rulesRequired"));
      return;
    }
    createStrategyMutation.mutate(values);
  };

  // --- 지표 허브 및 규칙 빌더 관련 핸들러 ---
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

  return (
    <AuthGuard>
      <IndicatorHub
        isOpen={isHubOpen}
        onOpenChange={setIsHubOpen}
        onSelect={handleIndicatorSelect}
      />
      <div className="container mx-auto max-w-3xl p-8">
        {" "}
        {/* 최대 너비 및 padding 추가 */}
        <div className="mb-6 flex items-center justify-between">
          {" "}
          {/* 뒤로가기, 제목 flex 레이아웃 */}
          <Button
            variant="outline"
            onClick={() => router.back()} // 이전 페이지로 이동
            className="h-10"
            disabled={createStrategyMutation.isPending}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> {t("form.goBackButton")}
          </Button>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <div className="w-10"></div>{" "}
          {/* 제목 우측 빈 공간 확보 (뒤로가기 버튼과 대칭) */}
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {" "}
            {/* space-y 축소 */}
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
                      className="h-10 rounded-md" // 입력 필드 스타일 조정
                      disabled={createStrategyMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                      className="h-10 rounded-md" // 입력 필드 스타일 조정
                      disabled={createStrategyMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* 전략 빌더 캔버스 (규칙 시각화 및 편집) */}
            <div className="mt-6">
              {" "}
              {/* 상단 마진 조정 */}
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
              className="w-fit h-10 px-6 rounded-md" // 버튼 스타일 및 너비 조정, px-6 추가
              disabled={createStrategyMutation.isPending}
            >
              {createStrategyMutation.isPending ? (
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
      </div>
    </AuthGuard>
  );
}
