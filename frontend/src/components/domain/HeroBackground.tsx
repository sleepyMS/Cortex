"use client";

import React from "react";

// HeroSection에서 복사한 배경 생성 로직
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

function createFloatingElements(
  count: number,
  isBlob: boolean = false
): JSX.Element[] {
  const elements: JSX.Element[] = [];
  for (let i = 0; i < count; i++) {
    const size = isBlob ? getRandom(250, 600) : getRandom(50, 100);
    const x = getRandom(-20, 120);
    const y = getRandom(-20, 120);
    const color =
      floatingColors[Math.floor(Math.random() * floatingColors.length)];
    const duration = getRandom(25, 45);
    const delay = getRandom(0, 15);
    const direction = Math.random() > 0.5 ? "normal" : "reverse";
    const blurClass = isBlob ? "blur-xl" : "";

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
          opacity: isBlob ? 0.3 : 0.35,
          willChange: "transform",
          zIndex: -1,
        }}
      />
    );
  }
  return elements;
}
// 로직 끝

/** HeroSection의 배경 애니메이션 전용 클라이언트 컴포넌트 */
export const HeroBackground = () => {
  // useMemo 훅을 사용하므로 "use client"가 필수
  const floatingCircles = React.useMemo(
    () => createFloatingElements(15, false),
    []
  );
  const floatingBlobs = React.useMemo(
    () => createFloatingElements(5, true),
    []
  );

  return (
    <>
      {/* Animated Aurora Background */}
      <div className="absolute inset-0 -z-20">
        <div className="absolute bottom-0 left-[-20%] right-0 top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(100,50,200,0.5),rgba(255,255,255,0))] animate-[spin_20s_linear_infinite]"></div>
        <div className="absolute bottom-[-40%] right-[-20%] top-auto h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(80,40,180,0.55),rgba(255,255,255,0))] animate-[spin_25s_linear_infinite_reverse]"></div>
      </div>
      {/* Floating Circles and Blobs Overlay */}
      <div className="absolute inset-0 -z-10">
        {floatingCircles}
        {floatingBlobs}
      </div>
    </>
  );
};
