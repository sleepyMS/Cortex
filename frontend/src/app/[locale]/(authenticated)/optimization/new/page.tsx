// file: frontend/src/app/[locale]/(authenticated)/optimization/new/page.tsx

"use client";

import { useTranslations } from "next-intl";
import { OptimizationSetupForm } from "@/components/domain/optimization/OptimizationSetupForm";
import { Zap } from "lucide-react"; // 최적화 아이콘으로 Zap 사용

/**
 * 새로운 최적화 설정을 위한 메인 페이지 컴포넌트입니다.
 * (authenticated) 레이아웃에 의해 AuthGuard가 이미 적용되어 있습니다.
 * 이 컴포넌트는 페이지의 제목과 설명을 렌더링하고,
 * 모든 복잡한 로직과 UI를 담고 있는 OptimizationSetupForm을 불러옵니다.
 */
export default function NewOptimizationPage() {
  const t = useTranslations("NewOptimizationPage");

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8">
      <div className="text-center mb-10">
        <div className="flex justify-center items-center gap-3">
          <Zap className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
        </div>
        <p className="text-lg text-muted-foreground mt-3 max-w-2xl mx-auto">
          {t("description")}
        </p>
      </div>

      {/* 모든 복잡한 폼 로직, 탭(일반/WFO), 동적 UI, 
        비용 계산 및 API 연동은 이 하위 컴포넌트가 모두 처리합니다.
      */}
      <OptimizationSetupForm />
    </div>
  );
}
