"use client";

import { useState, useEffect } from "react";

// --- page.tsx에서 복사해 온 애니메이션 로직 ---
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

interface FloatingElementData {
  id: number;
  size: number;
  x: number;
  y: number;
  color: string;
  duration: number;
  delay: number;
  direction: string;
  isBlob: boolean;
}

function generateFloatingElementsData(
  count: number,
  isBlob: boolean = false
): FloatingElementData[] {
  const elements: FloatingElementData[] = [];
  for (let i = 0; i < count; i++) {
    elements.push({
      id: i,
      size: isBlob ? getRandom(250, 600) : getRandom(50, 100),
      x: getRandom(-20, 120),
      y: getRandom(-20, 120),
      color: floatingColors[Math.floor(Math.random() * floatingColors.length)],
      duration: getRandom(25, 45),
      delay: getRandom(0, 15),
      direction: Math.random() > 0.5 ? "normal" : "reverse",
      isBlob,
    });
  }
  return elements;
}
// --- 로직 끝 ---

/**
 * 가격 페이지의 모든 클라이언트 사이드 배경 애니메이션을 담당하는 컴포넌트.
 */
export const PricingBackground = () => {
  // 클라이언트에서만 랜덤 요소 생성 (하이드레이션 불일치 방지)
  const [floatingData, setFloatingData] = useState<FloatingElementData[]>([]);

  useEffect(() => {
    // 클라이언트에서만 실행되므로 SSR/CSR 불일치 없음
    const circles = generateFloatingElementsData(15, false);
    const blobs = generateFloatingElementsData(5, true);
    setFloatingData([...circles, ...blobs]);
  }, []);

  return (
    <>
      {/* Animated Aurora Background */}
      <div className="absolute inset-0 -z-20" style={{ contain: "strict" }}>
        <div className="absolute bottom-0 left-[-20%] right-0 top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(100,50,200,0.5),rgba(255,255,255,0))] animate-[spin_20s_linear_infinite]"></div>
        <div className="absolute bottom-[-40%] right-[-20%] top-auto h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(80,40,180,0.55),rgba(255,255,255,0))] animate-[spin_25s_linear_infinite_reverse]"></div>
      </div>

      {/* Floating Circles and Blobs Overlay */}
      <div className="absolute inset-0 -z-10" style={{ contain: "strict" }}>
        {floatingData.map((el) => (
          <div
            key={`${el.isBlob ? "blob" : "circle"}-${el.id}`}
            className={`absolute rounded-full ${el.isBlob ? "blur-xl" : ""}`}
            style={{
              width: `${el.size}px`,
              height: `${el.size}px`,
              backgroundColor: el.color,
              top: `${el.y}%`,
              left: `${el.x}%`,
              animation: `float ${el.duration}s ease-in-out infinite ${el.delay}s ${el.direction}`,
              opacity: el.isBlob ? 0.3 : 0.35,
              zIndex: -1,
            }}
          />
        ))}
      </div>
    </>
  );
};
