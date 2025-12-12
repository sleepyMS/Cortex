// file: frontend/src/app/[locale]/(authenticated)/backtester/[backtestId]/page.tsx
"use client";

import { BacktestContent } from "@/components/domain/backtesting/BacktestContent";

interface BacktestDetailPageProps {
  params: { backtestId: string };
}

export default function BacktestDetailPage({
  params,
}: BacktestDetailPageProps) {
  return <BacktestContent backtestId={params.backtestId} showHeader />;
}
