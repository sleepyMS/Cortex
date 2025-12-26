"use client";

import { ReactLenis } from "@studio-freight/react-lenis";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function SmoothScroller({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 전략 빌더(편집/생성) 및 백테스트 상세 페이지 등
  // '화면 전체 높이(Fixed Height)'를 쓰고 내부 스크롤(Split View)을 사용하는 페이지 감지
  const isAppMode =
    (pathname.includes("/strategies") &&
      (searchParams.has("edit") || searchParams.get("create") === "true")) ||
    pathname.includes("/backtester/");

  // isAppMode일 때는 Lenis를 비활성화하여 네이티브 스크롤(내부 컨테이너 스크롤)을 사용
  if (isAppMode) {
    return <>{children}</>;
  }

  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.5, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
