"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
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
const BlockAssemblyVisual: React.FC<{ progress: number }> = ({ progress }) => {
  return (
    <div className="relative w-full h-full min-h-[450px] p-6 overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_14px]" />

      {/* Assembled Strategy Block */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{
          opacity: progress > 0.2 ? 1 : 0,
          y: progress > 0.2 ? 0 : 50,
        }}
        transition={{ duration: 0.6 }}
        className="relative z-10"
      >
        {/* Strategy Header */}
        <div className="bg-card border border-border rounded-lg shadow-xl overflow-hidden max-w-md mx-auto">
          <div className="px-4 py-3 bg-muted border-b border-border flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-violet-500/20 flex items-center justify-center">
                <Workflow className="w-3 h-3 text-violet-400" />
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
              initial={{ opacity: 0, x: -50 }}
              animate={{
                opacity: progress > 0.3 ? 1 : 0,
                x: progress > 0.3 ? 0 : -50,
              }}
              transition={{ duration: 0.5 }}
              className="bg-background border border-border/60 rounded-md overflow-hidden"
            >
              <div className="px-3 py-2 flex items-center justify-between border-b border-border/40">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-violet-400" />
                  <span className="text-xs font-medium">Crossover</span>
                </div>
                <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="p-3 border-l-[3px] border-l-violet-500">
                <div className="flex items-center gap-2 flex-wrap">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: progress > 0.4 ? 1 : 0 }}
                    className="px-2 py-1 bg-muted/60 rounded border border-border text-xs flex items-center gap-1"
                  >
                    <span className="font-medium">EMA</span>
                    <span className="text-muted-foreground">(10, 15m)</span>
                    <Settings className="w-3 h-3 text-muted-foreground" />
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: progress > 0.45 ? 1 : 0 }}
                    className="px-2 py-1 bg-violet-500/10 rounded border border-violet-500/30 text-xs text-violet-400"
                  >
                    Crosses Above ▾
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: progress > 0.5 ? 1 : 0 }}
                    className="px-2 py-1 bg-muted/60 rounded border border-border text-xs flex items-center gap-1"
                  >
                    <span className="font-medium">EMA</span>
                    <span className="text-muted-foreground">(20, 15m)</span>
                    <Settings className="w-3 h-3 text-muted-foreground" />
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* AND Connector + State Based Block */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{
                opacity: progress > 0.55 ? 1 : 0,
                y: progress > 0.55 ? 0 : 30,
              }}
              transition={{ duration: 0.5 }}
              className="flex"
            >
              {/* AND Label */}
              <div className="flex flex-col items-center w-10 shrink-0 -mt-1">
                <div className="w-0.5 h-3 bg-violet-500/40" />
                <div className="px-1.5 py-0.5 bg-violet-500/10 border border-violet-500/30 rounded text-[10px] font-bold text-violet-400">
                  AND
                </div>
                <div className="w-0.5 flex-1 bg-violet-500/40" />
              </div>

              {/* State Based Block */}
              <div className="flex-1 bg-background border border-border/60 rounded-md overflow-hidden">
                <div className="px-3 py-2 flex items-center justify-between border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-3 h-3 text-violet-400" />
                    <span className="text-xs font-medium">State Based</span>
                  </div>
                  <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className="p-3 border-l-[3px] border-l-violet-500 space-y-2">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: progress > 0.6 ? 1 : 0 }}
                    className="px-2 py-1 bg-muted/60 rounded border border-border text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1">
                      <span className="font-medium">RSI</span>
                      <span className="text-muted-foreground">(14, 15m)</span>
                    </div>
                    <Settings className="w-3 h-3 text-muted-foreground" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: progress > 0.65 ? 1 : 0 }}
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
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: progress > 0.7 ? 1 : 0 }}
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
              </div>
            </motion.div>
          </div>

          {/* Strategy Valid Banner */}
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{
              opacity: progress > 0.8 ? 1 : 0,
              height: progress > 0.8 ? "auto" : 0,
            }}
            className="px-4 py-2 bg-green-500/10 border-t border-green-500/20 flex items-center justify-center gap-2"
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

  const progress = useTransform(scrollYProgress, [0.25, 0.5], [0, 1]);
  const [progressValue, setProgressValue] = useState(0);

  useEffect(() => {
    return progress.on("change", (v) => setProgressValue(v));
  }, [progress]);

  const highlightIcons = ["📦", "🔗", "💡"];

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center py-24 px-6 md:px-12 overflow-hidden"
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
              <BlockAssemblyVisual progress={progressValue} />
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
              {formatText(translations.description)}
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
                  <span className="text-xl">{highlightIcons[index]}</span>
                  <span className="text-foreground font-medium">
                    {highlight}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <Link href="/strategies/new">
              <Button size="lg" className="gap-2">
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
