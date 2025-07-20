import { StrategyBuilderForm } from "@/components/domain/StrategyBuilderForm";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useTranslations } from "next-intl"; // 👈 1. useTranslations 임포트

export default function NewStrategyPage() {
  const t = useTranslations("StrategyBuilder"); // 👈 2. 번역 함수 초기화

  return (
    <AuthGuard>
      <div className="container mx-auto max-w-3xl py-10">
        <h1 className="mb-8 text-3xl font-bold">{t("title")}</h1>{" "}
        {/* 👈 3. 언어팩 사용 */}
        <StrategyBuilderForm />
      </div>
    </AuthGuard>
  );
}
