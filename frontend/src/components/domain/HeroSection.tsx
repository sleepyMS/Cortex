// file: frontend/src/components/domain/HeroSection.tsx

"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import React from "react";
import { motion, Variants } from "framer-motion";

// 배경에 사용될 파스텔톤 색상들 (RGBA 형태로 투명도 포함)
// globals.css에 정의된 --primary-rgb, --accent-rgb를 활용
const floatingColors = [
  "rgba(var(--primary-rgb), 0.20)", // Primary 색상 (투명도 0.20)
  "rgba(var(--accent-rgb), 0.25)", // Accent 색상 (투명도 0.25)
  "rgba(179, 229, 252, 0.20)", // 연한 하늘색 (투명도 0.20)
  "rgba(255, 204, 255, 0.20)", // 연한 분홍/보라색 (투명도 0.20)
  "rgba(255, 255, 153, 0.15)", // 연한 노란색 (투명도 0.15, 가장 연하게)
];

function getRandom(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// 떠다니는 동그라미/블롭 생성 함수
// isBlob: true면 블롭처럼 크고 흐릿하게, false면 작은 동그라미
function createFloatingElements(
  count: number,
  isBlob: boolean = false
): JSX.Element[] {
  const elements: JSX.Element[] = [];
  for (let i = 0; i < count; i++) {
    // 크기: 블롭은 더 크고, 동그라미는 중간 크기
    const size = isBlob ? getRandom(250, 600) : getRandom(50, 100); // px 단위
    // 위치: 화면 밖에서도 시작하여 자연스러운 흐름 연출
    const x = getRandom(-20, 120); // % 단위
    const y = getRandom(-20, 120); // % 단위
    // 색상 선택 및 애니메이션 속도/지연/방향
    const color =
      floatingColors[Math.floor(Math.random() * floatingColors.length)];
    const duration = getRandom(25, 45); // 애니메이션 속도를 적당히 느리게 (25~45초)
    const delay = getRandom(0, 15); // 애니메이션 시작 지연
    const direction = Math.random() > 0.5 ? "normal" : "reverse";
    // 블롭에만 블러 효과 적용
    const blurClass = isBlob ? "blur-xl" : ""; // blur-2xl에서 blur-xl로 약간 줄여 더 선명하게

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
          // opacity는 style에 고정. 너무 연하지 않게 (0.3 ~ 0.4)
          opacity: isBlob ? 0.3 : 0.35, // 블롭은 0.3, 동그라미는 0.35로 설정
          willChange: "transform", // 성능 최적화 힌트
          zIndex: -1, // 오로라 (-2) 보다 위에, 콘텐츠 (기본 0) 보다 아래
        }}
      />
    );
  }
  return elements;
}

const HeroSection = () => {
  const t = useTranslations("Landing.Hero");

  const titleWithBreaks = t.rich("title", {
    br: () => <br />,
  });

  // Framer Motion Variants (기존 코드 유지)
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 },
    },
  };

  // 애니메이션 요소들은 useMemo를 사용하여 불필요한 리렌더링 방지
  const floatingCircles = React.useMemo(
    () => createFloatingElements(15, false),
    []
  ); // 작은 동그라미 15개
  const floatingBlobs = React.useMemo(
    () => createFloatingElements(5, true),
    []
  ); // 큰 블롭 5개

  return (
    <section className="relative w-full overflow-hidden">
      {/* Animated Aurora Background - 투명도 조정 (더 진하게) */}
      <div className="absolute inset-0 -z-20">
        {" "}
        {/* 가장 뒤 레이어 */}
        {/* 첫 번째 원: RGB 색상을 직접 지정, 투명도 0.5로 설정 */}
        <div className="absolute bottom-0 left-[-20%] right-0 top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(100,50,200,0.5),rgba(255,255,255,0))] animate-[spin_20s_linear_infinite]"></div>
        {/* 두 번째 원: RGB 색상을 직접 지정, 투명도 0.55로 설정 */}
        <div className="absolute bottom-[-40%] right-[-20%] top-auto h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(80,40,180,0.55),rgba(255,255,255,0))] animate-[spin_25s_linear_infinite_reverse]"></div>
      </div>

      {/* Floating Circles and Blobs Overlay */}
      <div className="absolute inset-0 -z-10">
        {" "}
        {/* 오로라 위에, 콘텐츠 아래 */}
        {floatingCircles}
        {floatingBlobs}
      </div>

      <motion.div
        className="container relative mx-auto flex min-h-[calc(100vh-80px)] max-w-4xl flex-col items-center justify-center gap-6 px-4 py-20 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl"
          variants={itemVariants}
        >
          <span className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
            {titleWithBreaks}
          </span>
        </motion.h1>

        <motion.p
          className="max-w-[700px] text-lg text-muted-foreground md:text-xl"
          variants={itemVariants}
        >
          {t("subtitle")}
        </motion.p>

        <motion.div variants={itemVariants}>
          <Link href="/signup" passHref>
            <Button size="lg" className="mt-4">
              {t("ctaButton")}
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
};

export { HeroSection };
