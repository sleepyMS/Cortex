// file: frontend/src/components/layout/AuthLayout.tsx

"use client"; // 클라이언트 컴포넌트임을 명시

import React from "react";
import { useTranslations } from "next-intl"; // 훅으로 변경

// 배경에 사용될 파스텔톤 색상들 (RGBA 형태로 투명도 상향)
// 투명도를 0.45~0.60 사이로 설정하여 훨씬 진하게 만듭니다.
const floatingColors = [
  "rgba(var(--primary-rgb), 0.45)", // Primary 색상의 옅은 버전 (투명도 0.45로 상향)
  "rgba(var(--accent-rgb), 0.50)", // Accent 색상의 옅은 버전 (투명도 0.50으로 상향)
  "rgba(179, 229, 252, 0.45)", // 연한 하늘색 (투명도 0.45로 상향)
  "rgba(255, 204, 255, 0.45)", // 연한 분홍/보라색 (투명도 0.45로 상향)
  "rgba(255, 255, 153, 0.40)", // 연한 노란색 추가 (선택 사항, 다양성 부여)
];

function getRandom(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// 떠다니는 동그라미/블롭 생성 함수
function createFloatingElements(
  count: number,
  isBlob: boolean = false
): JSX.Element[] {
  const elements: JSX.Element[] = [];
  for (let i = 0; i < count; i++) {
    const size = isBlob ? getRandom(250, 600) : getRandom(60, 120); // 블롭과 동그라미 크기 더 키움
    const x = getRandom(-20, 120);
    const y = getRandom(-20, 120);
    const color =
      floatingColors[Math.floor(Math.random() * floatingColors.length)];
    const duration = getRandom(15, 30); // 애니메이션 속도를 빠르게 (15~30초)
    const delay = getRandom(0, 15); // 애니메이션 시작 지연을 약간 줄임
    const direction = Math.random() > 0.5 ? "normal" : "reverse";
    const blurClass = isBlob ? "blur-2xl" : "";

    elements.push(
      <div
        key={i}
        className={`absolute rounded-full ${blurClass}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: color,
          top: `${y}%`,
          left: `${x}%`,
          animation: `float ${duration}s ease-in-out infinite ${delay}s ${direction}`,
          // opacity는 이제 animation 대신 style에 고정 (이전보다 훨씬 진하게)
          opacity: isBlob ? 0.55 : 0.6, // 블롭은 0.55, 동그라미는 0.60으로 상향 조정
          willChange: "transform",
          zIndex: -2,
        }}
      />
    );
  }
  return elements;
}

// 클라이언트 컴포넌트로 전환되었으므로 더 이상 `async`가 필요 없습니다.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("Landing.Hero");

  const floatingCircles = React.useMemo(
    () => createFloatingElements(15, false),
    []
  ); // 작은 동그라미 15개
  const floatingBlobs = React.useMemo(
    () => createFloatingElements(5, true),
    []
  ); // 큰 블롭 5개

  return (
    <div className="relative flex min-h-[calc(100vh-80px)] w-full items-center justify-center overflow-hidden">
      {/* `@keyframes float`는 globals.css에 정의되어 있습니다. */}

      {/* 안정적인 그라데이션 배경 및 미묘한 패턴 */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[var(--background)] to-[hsl(259,90%,10%)] overflow-hidden">
        {/* 미묘한 노이즈/도트 패턴 오버레이 */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle, var(--primary) 1px, transparent 1px)`,
            backgroundSize: `25px 25px`,
            backgroundPosition: `0 0`,
          }}
        ></div>

        {/* 은은하게 움직이는 파스텔톤 동그라미들 */}
        {floatingCircles}
        {/* 은은하게 움직이는 블러 처리된 블롭들 (안개 효과) */}
        {floatingBlobs}
      </div>

      {/* Main Content Grid - 헤더/푸터와 동일한 max-w-5xl 및 중앙 정렬 */}
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 items-center gap-16 max-w-5xl px-4 md:px-8">
        {/* Left Side: Branding/Quote */}
        <div className="hidden md:flex flex-col gap-4 text-left">
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tighter text-foreground">
            {t.rich("title", { br: () => <br /> })}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        {/* Right Side: Form (children) */}
        <div className="flex justify-center md:justify-start">
          <div className="w-full max-w-sm rounded-xl border border-border/40 bg-background/80 p-6 sm:p-8 shadow-2xl backdrop-blur-lg">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
