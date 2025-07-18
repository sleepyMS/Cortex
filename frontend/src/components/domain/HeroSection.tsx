// file: frontend/src/components/domain/HeroSection.tsx

"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import React from "react";
import { motion, Variants } from "framer-motion"; // Variants 타입을 import 합니다.

const HeroSection = () => {
  const t = useTranslations("Landing.Hero");

  const titleWithBreaks = t.rich("title", {
    br: () => <br />,
  });

  // Variants 타입을 명시적으로 지정합니다.
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 },
    },
  };

  // Variants 타입을 명시적으로 지정합니다.
  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 },
    },
  };

  return (
    <section className="relative w-full overflow-hidden">
      {/* Animated Aurora Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute bottom-0 left-[-20%] right-0 top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(139,92,246,0.2),rgba(255,255,255,0))] animate-[spin_20s_linear_infinite]"></div>
        <div className="absolute bottom-[-40%] right-[-20%] top-auto h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(139,92,246,0.15),rgba(255,255,255,0))] animate-[spin_25s_linear_infinite_reverse]"></div>
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
