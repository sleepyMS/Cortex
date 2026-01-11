// file: src/components/domain/ScrollFeatureShowcase/sections/StrategyBuilderSection.tsx

"use client";

import React, { useRef, useEffect } from "react";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  MotionValue,
} from "framer-motion";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import {
  Workflow,
  Settings,
  MoreHorizontal,
  TrendingUp,
  ChevronDown,
  Brain,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { formatText } from "../utils/formatText";

interface StrategyBuilderSectionProps {
  translations: {
    badge: string;
    title: string;
    description: string;
    highlights: string[];
    cta: string;
  };
}

// Block Assembly Visual Component
// Optimized to use MotionValue directly to avoid React re-renders on scroll
const BlockAssemblyVisual: React.FC<{ progress: MotionValue<number> }> = ({
  progress,
}) => {
  const t = useTranslations("Landing.StrategyBuilderMockUI");
  // Transformations for each animation step - spread out over wider ranges for slower animation
  // Step 0: Container appears (0 - 0.15)
  const containerOpacity = useTransform(progress, [0, 0.15], [0, 1]);
  const containerY = useTransform(progress, [0, 0.15], [50, 0]);

  // Step 1: Crossover Block (0.1 - 0.3)
  const crossoverOpacity = useTransform(progress, [0.1, 0.3], [0, 1]);
  const crossoverX = useTransform(progress, [0.1, 0.3], [-50, 0]);

  // Step 2: Crossover Items (0.25 - 0.6) - spread out more
  const ema1Scale = useTransform(progress, [0.25, 0.4], [0, 1]);
  const compareScale = useTransform(progress, [0.35, 0.5], [0, 1]);
  const ema2Scale = useTransform(progress, [0.45, 0.6], [0, 1]);

  // Step 3: State Block (0.5 - 0.7)
  const stateOpacity = useTransform(progress, [0.5, 0.7], [0, 1]);
  const stateX = useTransform(progress, [0.5, 0.7], [-50, 0]);

  // Step 4: State Items (0.6 - 0.8)
  const rsiOpacity = useTransform(progress, [0.6, 0.8], [0, 1]);

  // Step 5: Valid Banner (0.85 - 0.95) - shorter range for faster appearance
  const bannerOpacity = useTransform(progress, [0.85, 0.95], [0, 1]);
  const bannerHeight = useTransform(progress, [0.85, 0.95], [0, 40]); // approx 40px height

  return (
    <div className="relative w-full h-full min-h-[450px] p-6 overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_14px]" />

      {/* Assembled Strategy Block */}
      <motion.div
        style={{ opacity: containerOpacity, y: containerY }}
        className="relative z-10 mt-4"
      >
        {/* Strategy Header */}
        <div className="bg-card border border-border rounded-lg shadow-xl overflow-hidden max-w-md mx-auto">
          <div className="px-4 py-3 bg-muted border-b border-border flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-blue-500/20 flex items-center justify-center">
                <Workflow className="w-3 h-3 text-blue-400" />
              </div>
              <span className="font-semibold text-sm text-foreground">
                {t("nodes.longEntry")}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              ⊕ {t("nodes.addRule")}
            </span>
          </div>

          <div className="p-4 space-y-3">
            {/* Crossover Block */}
            <motion.div
              style={{ opacity: crossoverOpacity, x: crossoverX }}
              className="bg-background border border-blue-500/30 rounded-md overflow-hidden"
            >
              <div className="px-3 py-2 flex items-center justify-between border-b border-blue-500/20 bg-blue-500/5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-blue-400" />
                  <span className="text-xs font-semibold text-foreground">
                    {t("nodes.crossover")}
                  </span>
                </div>
                <MoreHorizontal className="w-3 h-3 text-muted-foreground/50" />
              </div>
              <div className="p-3 border-l-[3px] border-l-blue-500">
                <div className="flex items-center gap-2 flex-wrap">
                  <motion.div
                    style={{ scale: ema1Scale }}
                    className="flex-1 px-2 py-1 bg-muted/60 rounded border border-border text-xs flex items-center justify-center gap-1"
                  >
                    <span className="font-medium">{t("indicators.ema")}</span>
                    <span className="text-muted-foreground">(10, 15m)</span>
                    <Settings className="w-3 h-3 text-muted-foreground" />
                  </motion.div>
                  <motion.div
                    style={{ scale: compareScale }}
                    className="px-2 py-1 bg-blue-500/10 rounded border border-blue-500/30 text-xs text-blue-400"
                  >
                    {t("values.crossesAbove")} ▾
                  </motion.div>
                  <motion.div
                    style={{ scale: ema2Scale }}
                    className="flex-1 px-2 py-1 bg-muted/60 rounded border border-border text-xs flex items-center justify-center gap-1"
                  >
                    <span className="font-medium">{t("indicators.ema")}</span>
                    <span className="text-muted-foreground">(20, 15m)</span>
                    <Settings className="w-3 h-3 text-muted-foreground" />
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* AI Signal Block */}
            <motion.div
              style={{ opacity: stateOpacity, x: stateX }}
              className="bg-background border border-blue-500/30 rounded-lg overflow-hidden"
            >
              {/* Header */}
              <div className="px-3 py-2 flex items-center justify-between border-b border-blue-500/20 bg-blue-500/5">
                <div className="flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-semibold text-foreground">
                    {t("header")}
                  </span>
                </div>
                <MoreHorizontal className="w-3 h-3 text-muted-foreground/50" />
              </div>

              <div className="p-3 border-l-[3px] border-l-blue-500 space-y-3">
                {/* Top Row: Model Info & Actions */}
                <div className="flex gap-2">
                  {/* Model Card */}
                  <motion.div
                    style={{ opacity: rsiOpacity }}
                    className="flex-1 bg-blue-500/10 rounded-md border border-blue-500/20 p-2 flex items-center gap-2"
                  >
                    <div className="w-7 h-7 rounded bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Brain className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-bold text-foreground leading-tight">
                        {t("model.name")}
                      </span>
                      <span className="text-[9px] text-muted-foreground truncate">
                        {t("model.type")}
                      </span>
                    </div>
                  </motion.div>

                  {/* Actions */}
                  <motion.div
                    style={{ opacity: rsiOpacity }}
                    className="flex bg-muted/40 rounded-md p-0.5 border border-border h-fit self-center"
                  >
                    <div className="px-2 py-1 rounded bg-blue-500/20 text-[10px] font-bold text-blue-400 shadow-sm border border-blue-500/20">
                      {t("actions.buy")}
                    </div>
                    <div className="px-2 py-1 text-[10px] text-muted-foreground/50 font-medium">
                      {t("actions.sell")}
                    </div>
                    <div className="px-2 py-1 text-[10px] text-muted-foreground/50 font-medium">
                      {t("actions.hold")}
                    </div>
                  </motion.div>
                </div>

                {/* Second Row: Settings */}
                <div className="flex gap-2 text-xs">
                  {/* Evaluation Method */}
                  <motion.div
                    style={{ opacity: rsiOpacity }}
                    className="flex-[0_0_40%] space-y-1"
                  >
                    <span className="text-[9px] text-muted-foreground block pl-0.5">
                      {t("settings.evalMethod")}
                    </span>
                    <div className="w-full bg-muted/40 border border-border rounded px-2 py-1.5 flex justify-between items-center text-foreground">
                      <span className="truncate">
                        {t("settings.thresholdBased")}
                      </span>
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    </div>
                  </motion.div>

                  {/* Confidence Slider */}
                  <motion.div
                    style={{ opacity: rsiOpacity }}
                    className="flex-1 space-y-1"
                  >
                    <div className="flex justify-between items-center px-0.5">
                      <span className="text-[9px] text-muted-foreground">
                        {t("settings.minConfidence")}
                      </span>
                      <span className="text-[10px] text-blue-400 font-medium">
                        50%
                      </span>
                    </div>
                    <div className="relative w-full h-4 flex items-center">
                      <div className="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden">
                        <div className="h-full w-[52%] bg-blue-500 rounded-full" />
                      </div>
                      <div className="absolute left-[52%] top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-background border-2 border-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] z-10" />
                    </div>
                    <span className="text-[8px] text-muted-foreground/70 block truncate pt-0.5 px-0.5">
                      {t("settings.confidenceDesc")}
                    </span>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Strategy Valid Banner */}
          <motion.div
            style={{
              opacity: bannerOpacity,
              height: bannerHeight,
            }}
            className="px-4 bg-green-500/10 border-t border-green-500/20 flex items-center justify-center gap-2 overflow-hidden"
          >
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-medium text-green-500">
              ✓ Strategy Valid
            </span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export const StrategyBuilderSection: React.FC<StrategyBuilderSectionProps> = ({
  translations,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: false, margin: "-20%" });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Trigger threshold: when scrollYProgress reaches 0.30, animation starts
  const TRIGGER_THRESHOLD = 0.15;
  const targetProgress = useMotionValue(0);
  const progress = useSpring(targetProgress, { stiffness: 30, damping: 28 });

  useEffect(() => {
    return scrollYProgress.on("change", (v) => {
      targetProgress.set(v >= TRIGGER_THRESHOLD ? 1 : 0);
    });
  }, [scrollYProgress, targetProgress]);

  const highlightIcons = ["📦", "🔗", "💡"];

  return (
    <section
      id="section-strategy"
      ref={containerRef}
      className="scroll-mt-24 md:scroll-mt-[160px] relative flex items-center py-24 px-6 md:px-12 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Visual Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="hidden lg:block"
          >
            <div className="relative rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden shadow-2xl">
              {/* Pass MotionValue directly to avoid re-renders */}
              <BlockAssemblyVisual progress={progress} />
            </div>
          </motion.div>

          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 border border-blue-200 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
              <Workflow className="w-3 h-3" />
              {translations.badge}
            </div>

            {/* Title */}
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
              {translations.title}
            </h2>

            {/* Description */}
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              {formatText(
                translations.description,
                "text-blue-600 dark:text-blue-400"
              )}
            </p>

            {/* Highlights */}
            <div className="space-y-4 mb-10">
              {translations.highlights.map((highlight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                    <span className="text-blue-400 text-lg">
                      {highlightIcons[index]}
                    </span>
                  </div>
                  <span className="text-foreground font-medium">
                    {highlight}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <Link href="/strategies?create=true">
              <Button
                size="lg"
                variant="implement"
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-500/20"
              >
                <Workflow className="w-5 h-5" />
                {translations.cta}
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default StrategyBuilderSection;
