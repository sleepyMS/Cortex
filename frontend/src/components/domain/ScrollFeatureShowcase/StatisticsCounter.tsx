// file: src/components/domain/ScrollFeatureShowcase/StatisticsCounter.tsx

"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Brain, Workflow, Cpu, Zap, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureNavProps {
  translations: {
    aiLab: string;
    strategyBuilder: string;
    optimization: string;
    backtesting: string;
    infrastructure: string;
  };
}

const features = [
  {
    id: "section-ailab",
    key: "aiLab",
    enLabel: "AI Lab",
    icon: Brain,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    glow: "shadow-[0_0_20px_rgba(139,92,246,0.4)]",
  },
  {
    id: "section-strategy",
    key: "strategyBuilder",
    enLabel: "Strategy Builder",
    icon: Workflow,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.4)]",
  },
  {
    id: "section-optimization",
    key: "optimization",
    enLabel: "Optimization",
    icon: Cpu,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    glow: "shadow-[0_0_20px_rgba(249,115,22,0.4)]",
  },
  {
    id: "section-backtesting",
    key: "backtesting",
    enLabel: "Backtesting",
    icon: Zap,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    glow: "shadow-[0_0_20px_rgba(34,197,94,0.4)]",
  },
  {
    id: "section-infrastructure",
    key: "infrastructure",
    enLabel: "Infrastructure",
    icon: Globe,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    glow: "shadow-[0_0_20px_rgba(6,182,212,0.4)]",
  },
];

export const StatisticsCounter: React.FC<FeatureNavProps> = ({
  translations,
}) => {
  const [isCompact, setIsCompact] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to detect scroll position
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Toggle compact mode based on sentinel position relative to header (60px)
        setIsCompact(
          !entry.isIntersecting && entry.boundingClientRect.top < 60
        );
      },
      {
        rootMargin: "-60px 0px 0px 0px", // Offset by header height
        threshold: 0,
      }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Track active section
  useEffect(() => {
    const sectionIds = features.map((f) => f.id);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0 }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(id);
    }
  };

  return (
    // 1. Placeholder: Maintains layout space in document flow (196px)
    <div className="relative w-full z-40" style={{ height: 196 }}>
      {/* Sentinel for Scroll Detection */}
      <div ref={sentinelRef} className="absolute top-0 h-[1px] w-full" />

      {/* 2. Navigation Bar: Switches between absolute (embedded) and fixed (overlay) */}
      <nav
        className={cn(
          "w-full transition-[height,background-color,border-color,box-shadow] duration-500 ease-spring border-y border-border/30 overflow-hidden",
          isCompact
            ? "fixed top-[60px] left-0 right-0 h-[64px] bg-background/80 backdrop-blur-xl shadow-lg z-40"
            : "absolute top-0 left-0 right-0 h-[196px] bg-gradient-to-r from-violet-500/5 via-transparent to-violet-500/5"
        )}
      >
        <div
          className={cn(
            "mx-auto transition-all duration-500 h-full flex flex-col justify-center",
            isCompact ? "max-w-7xl px-4" : "max-w-4xl px-6 md:px-12"
          )}
        >
          <div className="flex items-center justify-between gap-2 md:gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const label = isCompact
                ? feature.enLabel
                : translations[feature.key as keyof typeof translations];
              const isActive = activeSection === feature.id;

              return (
                <motion.div
                  key={feature.key}
                  onClick={() => scrollToSection(feature.id)}
                  className={cn(
                    "group cursor-pointer flex items-center gap-3 transition-all duration-500",
                    isCompact ? "flex-row" : "flex-col"
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* Icon Container */}
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-2xl border transition-all duration-500",
                      feature.bg,
                      feature.border,
                      isActive && feature.glow,
                      isCompact
                        ? "w-9 h-9 rounded-lg"
                        : "w-14 h-14 md:w-16 md:h-16"
                    )}
                  >
                    <Icon
                      className={cn(
                        "transition-all duration-500",
                        feature.color,
                        isCompact ? "w-4 h-4" : "w-6 h-6 md:w-7 md:h-7"
                      )}
                    />
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      "font-medium transition-all duration-500 whitespace-nowrap",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground",
                      isCompact
                        ? "text-xs hidden md:block" // 모바일 최적화
                        : "text-sm md:text-base"
                    )}
                  >
                    {label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default StatisticsCounter;
