// file: src/components/domain/ScrollFeatureShowcase/StatisticsCounter.tsx

"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    glow: "shadow-[0_0_20px_rgba(139,92,246,0.4)]",
  },
  {
    id: "section-strategy",
    key: "strategyBuilder",
    enLabel: "Strategy Builder",
    icon: Workflow,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.4)]",
  },
  {
    id: "section-optimization",
    key: "optimization",
    enLabel: "Optimization",
    icon: Cpu,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    glow: "shadow-[0_0_20px_rgba(249,115,22,0.4)]",
  },
  {
    id: "section-backtesting",
    key: "backtesting",
    enLabel: "Backtesting",
    icon: Zap,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    glow: "shadow-[0_0_20px_rgba(34,197,94,0.4)]",
  },
  {
    id: "section-infrastructure",
    key: "infrastructure",
    enLabel: "Infrastructure",
    icon: Globe,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    glow: "shadow-[0_0_20px_rgba(6,182,212,0.4)]",
  },
];

export const StatisticsCounter: React.FC<FeatureNavProps> = ({
  translations,
}) => {
  const [isCompact, setIsCompact] = useState(false); // Trigger from IntersectionObserver
  const [isPinned, setIsPinned] = useState(false); // Controls position: fixed vs absolute
  const [navIsCompact, setNavIsCompact] = useState(false); // Controls style: height, flex-row/col
  const [labelMode, setLabelMode] = useState<"expanded" | "compact" | "none">(
    "expanded"
  );

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Sync sequencing
  useEffect(() => {
    // Immediate pinning to prevent scroll drift
    setIsPinned(isCompact);

    if (isCompact) {
      // --- COLLAPSING SEQUENCE (Expanded -> Compact) ---
      // 1. Start hiding expanded text
      setLabelMode("none");

      const timer = setTimeout(() => {
        // 2. Shrink bar & switch layout (after text exit)
        // Expanded text exit duration is ~0.4s, giving buffer
        setNavIsCompact(true);

        // 3. Show compact text (Wait for bar transition to complete)
        const labelTimer = setTimeout(() => {
          setLabelMode("compact");
        }, 250); // Reduced from 500ms
        return () => clearTimeout(labelTimer);
      }, 200); // Reduced from 400ms
      return () => clearTimeout(timer);
    } else {
      // --- EXPANDING SEQUENCE (Compact -> Expanded) ---
      // 1. Start hiding compact text
      setLabelMode("none");

      const timer = setTimeout(() => {
        // 2. Expand bar & switch layout back
        // Compact text exit duration is ~0.3s
        setNavIsCompact(false);

        // 3. Show expanded text (Korean) after bar expansion
        const innerTimer = setTimeout(() => {
          setLabelMode("expanded");
        }, 250); // Reduced from 500ms
        return () => clearTimeout(innerTimer);
      }, 150); // Reduced from 300ms
      return () => clearTimeout(timer);
    }
  }, [isCompact]);

  // Scroll Listener to detect scroll position (Optimized with requestAnimationFrame)
  useEffect(() => {
    let tick = false;

    const handleScroll = () => {
      if (!tick) {
        window.requestAnimationFrame(() => {
          if (sentinelRef.current) {
            const { top } = sentinelRef.current.getBoundingClientRect();
            // Check if the top of the component is above the header (60px)
            setIsCompact(top < 60);
          }
          tick = false;
        });
        tick = true;
      }
    };

    // Initial check
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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
    <div className="relative w-full z-40 h-20 md:h-[196px]">
      {/* Sentinel for Scroll Detection */}
      <div ref={sentinelRef} className="absolute top-0 h-[1px] w-full" />

      {/* 2. Navigation Bar */}
      <nav
        className={cn(
          "w-full transition-[height,background-color,border-color,box-shadow] duration-500 ease-spring border-y border-border/30 overflow-hidden",
          isPinned
            ? "fixed top-[60px] left-0 right-0 z-40 bg-background/80 backdrop-blur-xl shadow-lg"
            : "absolute top-0 left-0 right-0 bg-gradient-to-r from-violet-500/5 via-transparent to-violet-500/5",
          navIsCompact ? "h-[64px]" : "h-20 md:h-[196px]" // Height is controlled by animation state, not pin state
        )}
      >
        <motion.div
          layout // Enable Framer Motion layout projection for smooth flex-direction change
          className={cn(
            "mx-auto h-full flex flex-col justify-center",
            navIsCompact ? "max-w-7xl px-4" : "max-w-4xl px-6 md:px-12"
          )}
          transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }} // Removed spring, using smooth ease
        >
          <motion.div
            layout
            className="flex items-center justify-between gap-2 md:gap-4"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const isActive = activeSection === feature.id;

              return (
                <motion.div
                  layout // Projections for individual items
                  key={feature.key}
                  onClick={() => scrollToSection(feature.id)}
                  className={cn(
                    "group cursor-pointer flex items-center gap-3",
                    navIsCompact ? "flex-row" : "flex-col" // CSS change happens here
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{
                    layout: { duration: 0.3, type: "tween", ease: "easeInOut" },
                  }} // Consistent easing
                >
                  <motion.div
                    layout
                    className={cn(
                      "flex items-center justify-center rounded-lg md:rounded-2xl border transition-colors duration-500", // transition-colors only
                      feature.bg,
                      feature.border,
                      isActive && feature.glow,
                      navIsCompact
                        ? "w-9 h-9 rounded-lg md:rounded-lg"
                        : "w-10 h-10 md:w-16 md:h-16"
                    )}
                  >
                    {/* Icon Wrapper for Layout Sync */}
                    <motion.div
                      layout
                      className={cn(
                        "flex items-center justify-center",
                        navIsCompact ? "w-4 h-4" : "w-5 h-5 md:w-7 md:h-7"
                      )}
                    >
                      <Icon
                        className={cn(
                          feature.color,
                          "w-full h-full" // Fill the motion wrapper
                        )}
                      />
                    </motion.div>
                  </motion.div>

                  {/* Label Area */}
                  <motion.div
                    layout
                    className={cn(
                      "relative overflow-hidden",
                      navIsCompact
                        ? "w-auto"
                        : "w-full flex justify-center mt-1"
                    )}
                  >
                    <AnimatePresence mode="wait">
                      {labelMode === "expanded" && (
                        <motion.div
                          key="expanded"
                          initial={{ height: 0, opacity: 0, y: -5 }} // Reduced y offset
                          animate={{ height: "auto", opacity: 1, y: 0 }}
                          exit={{ height: 0, opacity: 0, y: -5 }}
                          transition={{
                            height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }, // 0.4 -> 0.2
                            opacity: { duration: 0.15 }, // 0.3 -> 0.15
                            y: { duration: 0.15 },
                          }}
                          className="flex flex-col items-center"
                        >
                          <span
                            className={cn(
                              "hidden md:block font-medium text-sm md:text-base whitespace-nowrap text-center",
                              isActive
                                ? "text-foreground"
                                : "text-muted-foreground group-hover:text-foreground"
                            )}
                          >
                            {
                              translations[
                                feature.key as keyof typeof translations
                              ]
                            }
                          </span>
                        </motion.div>
                      )}
                      {labelMode === "compact" && (
                        <motion.div
                          key="compact"
                          initial={{ opacity: 0, width: 0, x: -5 }}
                          animate={{ opacity: 1, width: "auto", x: 0 }}
                          exit={{ opacity: 0, width: 0, x: -5 }}
                          transition={{
                            width: { duration: 0.2 }, // 0.3 -> 0.2
                            opacity: { duration: 0.15 }, // 0.2 -> 0.15
                          }}
                          className="flex items-center"
                        >
                          <span
                            className={cn(
                              "font-medium text-xs hidden md:block whitespace-nowrap",
                              isActive
                                ? "text-foreground"
                                : "text-muted-foreground group-hover:text-foreground"
                            )}
                          >
                            {feature.enLabel}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </nav>
    </div>
  );
};

export default StatisticsCounter;
