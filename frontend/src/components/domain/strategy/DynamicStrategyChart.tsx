// file: src/components/domain/strategy/DynamicStrategyChart.tsx (신규 파일)

"use client";

import dynamic from "next/dynamic";

// StrategyChart를 dynamic import로 불러오고, 서버 사이드 렌더링(ssr)을 비활성화합니다.
const DynamicStrategyChart = dynamic(() => import("./StrategyChart"), {
  ssr: false,
  // 로딩 중에 보여줄 컴포넌트 (선택 사항)
  loading: () => (
    <div className="w-full h-[400px] rounded-lg border bg-muted flex items-center justify-center">
      Loading Chart...
    </div>
  ),
});

export default DynamicStrategyChart;
