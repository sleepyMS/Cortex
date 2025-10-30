"use client";

import { motion, Variants } from "framer-motion";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import React from "react";

// Framer Motion Variants
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

interface HeroContentProps {
  title: React.ReactNode;
  subtitle: string;
  ctaButton: string;
}

/** HeroSection의 텍스트와 버튼 애니메이션 전용 클라이언트 컴포넌트 */
export const HeroContent = ({
  title,
  subtitle,
  ctaButton,
}: HeroContentProps) => {
  return (
    <motion.div
      className="container relative mx-auto flex min-h-[calc(100vh-80px)] max-w-6xl flex-col items-center justify-center gap-6 px-4 py-20 text-center"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.h1
        className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl"
        variants={itemVariants}
      >
        <span className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
          {title}
        </span>
      </motion.h1>

      <motion.p
        className="max-w-[700px] text-lg text-muted-foreground md:text-xl"
        variants={itemVariants}
      >
        {subtitle}
      </motion.p>

      <motion.div variants={itemVariants}>
        <Link href="/strategies/new" passHref>
          <Button size="lg" className="mt-4">
            {ctaButton}
          </Button>
        </Link>
      </motion.div>
    </motion.div>
  );
};
