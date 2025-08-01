// frontend/src/app/[locale]/strategies/new/page.tsx (수정)

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
  // 👈 min(3) 추가
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

interface StrategyCreatePayload extends StrategyFormValues {
  rules: any;
  is_public: boolean;
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

export default function NewStrategyPage() {
  const t = useTranslations("StrategyBuilder");
  const router = useRouter();
  const queryClient = useQueryClient();

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

  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const createStrategyMutation = useMutation<
    StrategyResponse,
    Error,
    StrategyFormValues
  >({
    mutationFn: async (values) => {
      const payload: StrategyCreatePayload = {
        name: values.name,
        description: values.description,
        rules: {
          buy: buyRules,
          sell: sellRules,
        },
        is_public: false,
      };
      const { data } = await apiClient.post("/strategies", payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success(t("form.saveSuccess", { strategyName: data.name }));
      queryClient.invalidateQueries({ queryKey: ["userStrategies"] });
      form.reset();
      router.push("/strategies");
    },
    onError: (error) => {
      // 👈 에러 메시지 파싱 로직 개선
      let displayMessage = t("form.saveFailedGeneric"); // 기본 일반 오류 메시지
      const apiError = error as any;

      if (
        apiError.response &&
        apiError.response.data &&
        apiError.response.data.detail
      ) {
        // Pydantic ValidationError (422) 처리
        if (Array.isArray(apiError.response.data.detail)) {
          const validationErrors = apiError.response.data.detail
            .map((err: any) => {
              // 'loc'에 필드명, 'msg'에 오류 메시지
              const field =
                err.loc && err.loc.length > 1 ? err.loc[1] : "unknown field";
              return `${field}: ${err.msg}`;
            })
            .join(", ");
          displayMessage = `${t(
            "form.validationErrorPrefix"
          )}: ${validationErrors}`;
        } else if (typeof apiError.response.data.detail === "string") {
          // 백엔드에서 직접 문자열 에러 메시지를 보낸 경우
          displayMessage = apiError.response.data.detail;
        }
      } else {
        // 네트워크 오류 등 기타 오류
        displayMessage = error.message;
      }

      toast.error(t("form.saveError", { error: displayMessage })); // 에러 키와 파싱된 메시지 사용
      console.error("Strategy save failed:", displayMessage, error);
    },
  });

  const onSubmit = (values: StrategyFormValues) => {
    if (buyRules.length === 0 && sellRules.length === 0) {
      toast.error(t("form.rulesRequired"));
      return;
    }
    createStrategyMutation.mutate(values);
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

  return (
    <AuthGuard>
      <IndicatorHub
        isOpen={isHubOpen}
        onOpenChange={setIsHubOpen}
        onSelect={handleIndicatorSelect}
      />
      <div className="p-4"></div>
      <div className="container mx-auto max-w-3xl p-4">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="h-10"
            disabled={createStrategyMutation.isPending}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> {t("form.goBackButton")}
          </Button>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <div className="w-10"></div>
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
                      disabled={createStrategyMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage /> {/* 👈 프론트엔드 유효성 검사 메시지 표시 */}
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
                      disabled={createStrategyMutation.isPending}
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
