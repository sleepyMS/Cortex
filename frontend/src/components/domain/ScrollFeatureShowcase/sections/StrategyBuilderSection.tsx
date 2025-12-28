// file: src/components/domain/ScrollFeatureShowcase/sections/StrategyBuilderSection.tsx

"use client";

import React, { useRef } from "react";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  MotionValue,
} from "framer-motion";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import {
  Workflow,
  Settings,
  MoreHorizontal,
  TrendingUp,
  BarChart2,
  ChevronDown,
} from "lucide-react";
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
  // Transformations for each animation step
  // Step 0: Container appears (0.2)
  const containerOpacity = useTransform(progress, [0.15, 0.25], [0, 1]);
  const containerY = useTransform(progress, [0.15, 0.25], [50, 0]);

  // Step 1: Crossover Block (0.3)
  const crossoverOpacity = useTransform(progress, [0.25, 0.35], [0, 1]);
  const crossoverX = useTransform(progress, [0.25, 0.35], [-50, 0]);

  // Step 2: Crossover Items (0.4 - 0.5)
  const ema1Scale = useTransform(progress, [0.35, 0.45], [0, 1]);
  const compareScale = useTransform(progress, [0.4, 0.5], [0, 1]);
  const ema2Scale = useTransform(progress, [0.45, 0.55], [0, 1]);

  // Step 3: State Block (0.6)
  const stateOpacity = useTransform(progress, [0.55, 0.65], [0, 1]);
  const stateX = useTransform(progress, [0.55, 0.65], [-50, 0]);

  // Step 4: State Items (0.7)
  const rsiOpacity = useTransform(progress, [0.65, 0.75], [0, 1]);

  // Step 5: Valid Banner (0.8)
  const bannerOpacity = useTransform(progress, [0.75, 0.85], [0, 1]);
  const bannerHeight = useTransform(progress, [0.75, 0.85], [0, 40]); // approx 40px height

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
                Long Entry Condition
              </span>
            </div>
            <span className="text-xs text-muted-foreground">⊕ Add Rule</span>
          </div>

          <div className="p-4 space-y-3">
            {/* Crossover Block */}
            <motion.div
              style={{ opacity: crossoverOpacity, x: crossoverX }}
              className="bg-background border border-border/60 rounded-md overflow-hidden"
            >
              <div className="px-3 py-2 flex items-center justify-between border-b border-border/40">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-blue-400" />
                  <span className="text-xs font-medium">Crossover</span>
                </div>
                <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="p-3 border-l-[3px] border-l-blue-500">
                <div className="flex items-center gap-2 flex-wrap">
                  <motion.div
                    style={{ scale: ema1Scale }}
                    className="px-2 py-1 bg-muted/60 rounded border border-border text-xs flex items-center gap-1"
                  >
                    <span className="font-medium">EMA</span>
                    <span className="text-muted-foreground">(10, 15m)</span>
                    <Settings className="w-3 h-3 text-muted-foreground" />
                  </motion.div>
                  <motion.div
                    style={{ scale: compareScale }}
                    className="px-2 py-1 bg-blue-500/10 rounded border border-blue-500/30 text-xs text-blue-400"
                  >
                    Crosses Above ▾
                  </motion.div>
                  <motion.div
                    style={{ scale: ema2Scale }}
                    className="px-2 py-1 bg-muted/60 rounded border border-border text-xs flex items-center gap-1"
                  >
                    <span className="font-medium">EMA</span>
                    <span className="text-muted-foreground">(20, 15m)</span>
                    <Settings className="w-3 h-3 text-muted-foreground" />
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* State-Based Block */}
            <motion.div
              style={{ opacity: stateOpacity, x: stateX }}
              className="bg-background border border-border/60 rounded-md overflow-hidden"
            >
              <div className="px-3 py-2 flex items-center justify-between border-b border-border/40">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-3 h-3 text-blue-400" />
                  <span className="text-xs font-medium">State Based</span>
                </div>
                <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="p-3 border-l-[3px] border-l-blue-500 space-y-2">
                {/* RSI Row */}
                <motion.div
                  style={{ opacity: rsiOpacity }}
                  className="px-2 py-1 bg-muted/60 rounded border border-border text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-1">
                    <span className="font-medium">RSI</span>
                    <span className="text-muted-foreground">(14, 15m)</span>
                  </div>
                  <Settings className="w-3 h-3 text-muted-foreground" />
                </motion.div>

                {/* Range Row */}
                <motion.div
                  style={{ opacity: rsiOpacity }}
                  className="flex items-center gap-2"
                >
                  <span className="text-[10px] text-muted-foreground w-8">
                    Range
                  </span>
                  <div className="flex-1 flex items-center gap-1">
                    <div className="flex-1 px-2 py-0.5 bg-muted/60 rounded border border-border text-xs text-center">
                      30
                    </div>
                    <span className="text-muted-foreground text-xs">~</span>
                    <div className="flex-1 px-2 py-0.5 bg-muted/60 rounded border border-border text-xs text-center">
                      70
                    </div>
                  </div>
                </motion.div>

                {/* Action Row */}
                <motion.div
                  style={{ opacity: rsiOpacity }}
                  className="flex items-center gap-2"
                >
                  <span className="text-[10px] text-muted-foreground w-8">
                    Action
                  </span>
                  <div className="flex-1 px-2 py-0.5 bg-muted/60 rounded border border-border text-xs flex items-center justify-between">
                    <span>In Range</span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </div>
                </motion.div>
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

  // Map scroll progress to animation range [0, 1]
  const progress = useTransform(scrollYProgress, [0.15, 0.45], [0, 1]);

  const highlightIcons = ["📦", "🔗", "💡"];

  return (
    <section
      id="section-strategy"
      ref={containerRef}
      className="scroll-mt-[30px] relative min-h-screen flex items-center py-24 px-6 md:px-12 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Visual Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
              <Workflow className="w-3 h-3" />
              {translations.badge}
            </div>

            {/* Title */}
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
              {translations.title}
            </h2>

            {/* Description */}
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              {formatText(translations.description, "text-blue-400")}
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
            <Link href="/strategies/new">
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
