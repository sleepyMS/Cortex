"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl"; // 👈 1. useTranslations 임포트
import apiClient from "@/lib/apiClient";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Spinner } from "@/components/ui/Spinner";

export function StrategyBuilderForm() {
  const t = useTranslations("StrategyBuilder.form"); // 👈 2. 번역 함수 초기화 (form 하위 객체 사용)
  const router = useRouter();

  // Zod 스키마 정의 시 t 함수를 사용하여 오류 메시지를 가져옵니다.
  const strategySchema = z.object({
    name: z.string().min(1, t("errors.nameRequired")),
    description: z.string().optional(),
    rules: z.string().min(1, t("errors.rulesRequired")),
  });

  type StrategyFormValues = z.infer<typeof strategySchema>;

  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(strategySchema),
    defaultValues: { name: "", description: "", rules: "" },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: StrategyFormValues) {
    try {
      const rulesAsJson = JSON.parse(values.rules);
      const payload = {
        name: values.name,
        description: values.description,
        rules: rulesAsJson,
      };

      await apiClient.post("/strategies", payload);
      alert(t("successMessage"));
      router.push("/dashboard");
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        alert(t("jsonErrorMessage"));
      } else {
        const errorMessage =
          error.response?.data?.detail || t("genericErrorMessage");
        alert(`${t("errorPrefix")}: ${errorMessage}`);
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          {t("nameLabel")}
        </label>
        <Input id="name" {...form.register("name")} disabled={isSubmitting} />
        {form.formState.errors.name && (
          <p className="mt-1 text-sm text-destructive">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          {t("descriptionLabel")}
        </label>
        <Textarea
          id="description"
          {...form.register("description")}
          disabled={isSubmitting}
        />
      </div>
      <div>
        <label htmlFor="rules" className="block text-sm font-medium">
          {t("rulesLabel")}
        </label>
        <Textarea
          id="rules"
          {...form.register("rules")}
          rows={10}
          placeholder={t("rulesPlaceholder")}
          disabled={isSubmitting}
        />
        {form.formState.errors.rules && (
          <p className="mt-1 text-sm text-destructive">
            {form.formState.errors.rules.message}
          </p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Spinner size="sm" className="mr-2" />}
        {t("saveButton")}
      </Button>
    </form>
  );
}
