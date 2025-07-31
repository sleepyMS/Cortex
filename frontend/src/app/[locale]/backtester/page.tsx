// frontend/src/app/[locale]/backtester/page.tsx

"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { AuthGuard } from "@/components/auth/AuthGuard"; // 인증 가드
import { BacktestSetupForm } from "@/components/domain/backtester/BacktestSetupForm"; // 👈 설정 폼 임포트
import { BacktestList } from "@/components/domain/backtester/BacktestList"; // 👈 목록 컴포넌트 임포트
import { Separator } from "@/components/ui/Separator"; // 구분선 (Shadcn/ui)

export default function BacktesterPage() {
  const t = useTranslations("BacktesterPage");
  // 백테스트 시작 시 목록을 갱신하기 위한 상태
  const [backtestTrigger, setBacktestTrigger] = useState(0);

  // BacktestSetupForm에서 백테스트가 시작될 때 호출될 함수
  const handleBacktestStarted = () => {
    setBacktestTrigger((prev) => prev + 1); // 트리거 값을 변경하여 BacktestList에 갱신 알림
  };

  return (
    <AuthGuard>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold text-foreground">
          {t("title")}
        </h1>
        {/* 백테스트 설정 폼 */}
        <BacktestSetupForm onBacktestStarted={handleBacktestStarted} />
        <Separator className="my-8" /> {/* 구분선 */}
        {/* 백테스트 목록 및 상태 */}
        <BacktestList refetchTrigger={backtestTrigger} />
      </div>
    </AuthGuard>
  );
}
