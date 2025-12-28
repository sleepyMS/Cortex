// file: frontend/src/app/[locale]/(authenticated)/strategies/[strategyId]/page.tsx
// 이 페이지는 분할 뷰(/strategies?edit={id} 또는 ?create=true)로 리다이렉트하여 코드 중복을 방지합니다.

"use client";

import { useEffect, use } from "react";
import { useRouter } from "@/i18n/navigation";
import { Spinner } from "@/components/ui/Spinner";

interface StrategyEditorPageProps {
  params: Promise<{
    strategyId: string;
  }>;
}

export default function StrategyEditorPage({
  params,
}: StrategyEditorPageProps) {
  const router = useRouter();
  const { strategyId } = use(params);

  useEffect(() => {
    // 'new'인 경우 생성 모드로 리다이렉트, 그 외에는 편집 모드
    if (strategyId === "new") {
      router.replace("/strategies?create=true");
    } else {
      router.replace(`/strategies?edit=${strategyId}`);
    }
  }, [router, strategyId]);

  return (
    <div className="flex items-center justify-center h-screen">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
