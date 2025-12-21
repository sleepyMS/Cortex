"use client";

import { motion } from "framer-motion";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import React, { useRef, useEffect, useState } from "react";
import {
  Cpu,
  Workflow,
  Zap,
  Globe,
  ShieldCheck,
  CloudLightning,
  Lock,
  LineChart,
  TrendingUp,
  BarChart2,
  Settings,
  MoreHorizontal,
  CheckCircle2,
  ArrowUp,
  ChevronDown,
} from "lucide-react";

interface FeatureTranslations {
  sectionLabel: string;
  sectionTitle: string;
  sectionSubtitle: string;
  features: {
    strategyBuilder: { title: string; description: string };
    tickBacktesting: { title: string; description: string };
    aiOptimization: { title: string; description: string };
    exchangeConnectivity: { title: string; description: string };
    security: { title: string; description: string };
    community: { title: string; description: string };
  };
}

interface FeatureBentoGridProps {
  translations: FeatureTranslations;
}

export const FeatureBentoGrid: React.FC<FeatureBentoGridProps> = ({
  translations,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftCrossoverRef = useRef<HTMLDivElement>(null);
  const leftStateRef = useRef<HTMLDivElement>(null);
  const rightCrossoverRef = useRef<HTMLDivElement>(null);
  const rightStateRef = useRef<HTMLDivElement>(null);

  const [lines, setLines] = useState<{ crossover: string; state: string }>({
    crossover: "",
    state: "",
  });

  const [hoveredLink, setHoveredLink] = useState<"crossover" | "state" | null>(
    null
  );

  // Helper function to format text with bold emphasis
  const formatText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
      <>
        {parts.map((part, index) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <span key={index} className="text-violet-400 font-bold">
                {part.slice(2, -2)}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };

  // Update setLines to avoid unnecessary re-renders if path hasn't changed
  const setLinesSafe = (newLines: { crossover: string; state: string }) => {
    setLines((prev) => {
      if (
        prev.crossover === newLines.crossover &&
        prev.state === newLines.state
      ) {
        return prev;
      }
      return newLines;
    });
  };

  const updateLines = () => {
    if (
      !containerRef.current ||
      !leftCrossoverRef.current ||
      !leftStateRef.current ||
      !rightCrossoverRef.current ||
      !rightStateRef.current
    )
      return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const leftCrossoverRect = leftCrossoverRef.current.getBoundingClientRect();
    const leftStateRect = leftStateRef.current.getBoundingClientRect();
    const rightCrossoverRect =
      rightCrossoverRef.current.getBoundingClientRect();
    const rightStateRect = rightStateRef.current.getBoundingClientRect();

    // Start: Right-Middle of left block
    const startCrossover = {
      x: leftCrossoverRect.right - containerRect.left,
      y:
        leftCrossoverRect.top +
        leftCrossoverRect.height / 2 -
        containerRect.top,
    };
    const startState = {
      x: leftStateRect.right - containerRect.left,
      y: leftStateRect.top + leftStateRect.height / 2 - containerRect.top,
    };

    // End: Left-Middle of right block
    const endCrossover = {
      x: rightCrossoverRect.left - containerRect.left,
      y:
        rightCrossoverRect.top +
        rightCrossoverRect.height / 2 -
        containerRect.top,
    };
    const endState = {
      x: rightStateRect.left - containerRect.left,
      y: rightStateRect.top + rightStateRect.height / 2 - containerRect.top,
    };

    // Bezier Control Points
    const controlOffset = 60; // Adjust for curvature

    const pathCrossover = `M ${startCrossover.x} ${startCrossover.y} C ${
      startCrossover.x + controlOffset
    } ${startCrossover.y}, ${endCrossover.x - controlOffset} ${
      endCrossover.y
    }, ${endCrossover.x} ${endCrossover.y}`;

    const pathState = `M ${startState.x} ${startState.y} C ${
      startState.x + controlOffset
    } ${startState.y}, ${endState.x - controlOffset} ${endState.y}, ${
      endState.x
    } ${endState.y}`;

    setLinesSafe({ crossover: pathCrossover, state: pathState });
  };

  useEffect(() => {
    // Initial update
    const timer = setTimeout(updateLines, 500); // Increase delay to ensure layout is ready

    // Update on resize
    window.addEventListener("resize", updateLines);

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      updateLines();
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", updateLines);
      cancelAnimationFrame(animationFrameId);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8 h-auto">
      {/* Large Feature - Visual Strategy Builder */}
      <SpotlightCard
        title={translations.features.strategyBuilder.title}
        description={formatText(
          translations.features.strategyBuilder.description
        )}
        icon={<Workflow />}
        className="md:col-span-2 md:row-span-2"
      >
        <div
          ref={containerRef}
          className="relative h-full min-h-[320px] w-full overflow-hidden rounded-xl border border-border bg-background p-4 shadow-inner"
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_14px]"></div>

          {/* LEFT SIDE: Individual Logic Blocks (Scaled down) */}
          <div
            className="absolute left-12 top-24 space-y-16 z-10"
            style={{ transform: "scale(0.85)", transformOrigin: "top left" }}
          >
            {/* Crossover Block - Exact copy from HeroContent */}
            <motion.div
              ref={leftCrossoverRef}
              onMouseEnter={() => setHoveredLink("crossover")}
              onMouseLeave={() => setHoveredLink(null)}
              animate={{ y: [-8, 8] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut",
              }}
              style={{ willChange: "transform" }}
              className={`bg-background border rounded-md overflow-hidden shadow-lg transition-all duration-300 ${
                hoveredLink === "crossover"
                  ? "border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                  : "border-border/60"
              }`}
            >
              <div className="px-2 py-1.5 flex items-center justify-between border-b border-border/40">
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={10} className="text-violet-400" />
                  <span className="text-[10px] font-medium text-foreground">
                    Crossover
                  </span>
                </div>
                <MoreHorizontal size={10} className="text-muted-foreground" />
              </div>
              <div className="p-2 border-l-[3px] border-l-violet-500">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="px-2 py-1 bg-muted/60 rounded border border-border text-[9px] flex items-center gap-1">
                    <span className="font-medium">EMA</span>
                    <span className="text-muted-foreground">(10, 15m)</span>
                    <Settings size={8} className="text-muted-foreground" />
                  </div>
                  <div className="px-1.5 py-1 bg-violet-500/10 rounded border border-violet-500/30 text-[9px] text-violet-400">
                    Crosses Above ▾
                  </div>
                  <div className="px-2 py-1 bg-muted/60 rounded border border-border text-[9px] flex items-center gap-1">
                    <span className="font-medium">EMA</span>
                    <span className="text-muted-foreground">(20, 15m)</span>
                    <Settings size={8} className="text-muted-foreground" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* State Based Block - Exact copy from HeroContent */}
            <motion.div
              ref={leftStateRef}
              onMouseEnter={() => setHoveredLink("state")}
              onMouseLeave={() => setHoveredLink(null)}
              animate={{ y: [-8, 8] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut",
                delay: 0.5,
              }}
              style={{ willChange: "transform" }}
              className={`bg-background border rounded-md overflow-hidden shadow-lg transition-all duration-300 ${
                hoveredLink === "state"
                  ? "border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                  : "border-border/60"
              }`}
            >
              <div className="px-2 py-1.5 flex items-center justify-between border-b border-border/40">
                <div className="flex items-center gap-1.5">
                  <BarChart2 size={10} className="text-violet-400" />
                  <span className="text-[10px] font-medium text-foreground">
                    State Based
                  </span>
                </div>
                <MoreHorizontal size={10} className="text-muted-foreground" />
              </div>
              <div className="p-2 border-l-[3px] border-l-violet-500 space-y-1.5">
                {/* RSI Row */}
                <div className="px-2 py-1 bg-muted/60 rounded border border-border text-[9px] flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">RSI</span>
                    <span className="text-muted-foreground">(14, 15m)</span>
                  </div>
                  <Settings size={8} className="text-muted-foreground" />
                </div>
                {/* Range Row */}
                <div className="flex items-center gap-1">
                  <span className="text-[8px] text-muted-foreground w-6">
                    Range
                  </span>
                  <div className="flex-1 flex items-center gap-1">
                    <div className="flex-1 px-2 py-0.5 bg-muted/60 rounded border border-border text-[9px] text-center">
                      30
                    </div>
                    <span className="text-muted-foreground text-[9px]">~</span>
                    <div className="flex-1 px-2 py-0.5 bg-muted/60 rounded border border-border text-[9px] text-center">
                      70
                    </div>
                  </div>
                </div>
                {/* Action Row */}
                <div className="flex items-center gap-1">
                  <span className="text-[8px] text-muted-foreground w-6">
                    Action
                  </span>
                  <div className="flex-1 px-2 py-0.5 bg-muted/60 rounded border border-border text-[9px] flex items-center justify-between">
                    <span>In Range</span>
                    <ChevronDown size={8} className="text-muted-foreground" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* SVG Connection Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible">
            {/* Using solid color first to debug visibility issues */}
            {/* Using solid color first to debug visibility issues */}
            <motion.path
              d={lines.crossover}
              stroke="#8b5cf6"
              strokeWidth={hoveredLink === "crossover" ? "3" : "2"}
              strokeOpacity={hoveredLink === "crossover" ? "1" : "0.4"}
              fill="none"
              filter={
                hoveredLink === "crossover"
                  ? "drop-shadow(0 0 3px #8b5cf6)"
                  : "none"
              }
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
            {/* Line from State Based block to inner State Based in Long Entry (indented due to AND connector) */}
            <motion.path
              d={lines.state}
              stroke="#8b5cf6"
              strokeWidth={hoveredLink === "state" ? "3" : "2"}
              strokeOpacity={hoveredLink === "state" ? "1" : "0.4"}
              fill="none"
              filter={
                hoveredLink === "state"
                  ? "drop-shadow(0 0 3px #8b5cf6)"
                  : "none"
              }
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          </svg>

          {/* RIGHT SIDE: Assembled Long Entry Condition Block (Partially visible) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="absolute top-14 left-[400px] w-[400px] bg-card border border-border rounded-lg shadow-xl overflow-hidden z-20"
            style={{ transform: "scale(0.9)", transformOrigin: "top left" }}
          >
            {/* Strategy Card Header */}
            <div className="px-3 py-2 bg-muted border-b border-border flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-violet-500/20 flex items-center justify-center">
                  <CheckCircle2 size={10} className="text-violet-400" />
                </div>
                <span className="font-semibold text-foreground text-xs">
                  Long Entry Condition
                </span>
                <ArrowUp size={10} className="text-violet-400" />
              </div>
              <span className="text-[9px] text-muted-foreground">
                ⊕ Add Rule
              </span>
            </div>

            {/* Strategy Content */}
            <div className="p-3 space-y-2">
              {/* Block 1: Crossover */}
              <div
                ref={rightCrossoverRef}
                onMouseEnter={() => setHoveredLink("crossover")}
                onMouseLeave={() => setHoveredLink(null)}
                className={`bg-background border rounded-md overflow-hidden transition-all duration-300 ${
                  hoveredLink === "crossover"
                    ? "border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                    : "border-border/60"
                }`}
              >
                <div className="px-2 py-1.5 flex items-center justify-between border-b border-border/40">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={10} className="text-violet-400" />
                    <span className="text-[10px] font-medium text-foreground">
                      Crossover
                    </span>
                  </div>
                  <MoreHorizontal size={10} className="text-muted-foreground" />
                </div>
                <div className="p-2 border-l-[3px] border-l-violet-500">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="px-2 py-1 bg-muted/60 rounded border border-border text-[9px] flex items-center gap-1">
                      <span className="font-medium">EMA</span>
                      <span className="text-muted-foreground">(10, 15m)</span>
                      <Settings size={8} className="text-muted-foreground" />
                    </div>
                    <div className="px-1.5 py-1 bg-violet-500/10 rounded border border-violet-500/30 text-[9px] text-violet-400">
                      Crosses Above ▾
                    </div>
                    <div className="px-2 py-1 bg-muted/60 rounded border border-border text-[9px] flex items-center gap-1">
                      <span className="font-medium">EMA</span>
                      <span className="text-muted-foreground">(20, 15m)</span>
                      <Settings size={8} className="text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>

              {/* AND Connector + Block 2: State Based */}
              <div className="flex">
                {/* AND Label */}
                <div className="flex flex-col items-center w-8 shrink-0 -mt-1">
                  <div className="w-0.5 h-2 bg-violet-500/40"></div>
                  <div className="px-1 py-0.5 bg-violet-500/10 border border-violet-500/30 rounded text-[8px] font-bold text-violet-400">
                    AND
                  </div>
                  <div className="w-0.5 flex-1 bg-violet-500/40"></div>
                </div>

                {/* Indented Block 2 */}
                <div
                  ref={rightStateRef}
                  onMouseEnter={() => setHoveredLink("state")}
                  onMouseLeave={() => setHoveredLink(null)}
                  className={`flex-1 bg-background border rounded-md overflow-hidden transition-all duration-300 ${
                    hoveredLink === "state"
                      ? "border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                      : "border-border/60"
                  }`}
                >
                  <div className="px-2 py-1.5 flex items-center justify-between border-b border-border/40">
                    <div className="flex items-center gap-1.5">
                      <BarChart2 size={10} className="text-violet-400" />
                      <span className="text-[10px] font-medium text-foreground">
                        State Based
                      </span>
                    </div>
                    <MoreHorizontal
                      size={10}
                      className="text-muted-foreground"
                    />
                  </div>
                  <div className="p-2 border-l-[3px] border-l-violet-500 space-y-1.5">
                    {/* RSI Row */}
                    <div className="px-2 py-1 bg-muted/60 rounded border border-border text-[9px] flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">RSI</span>
                        <span className="text-muted-foreground">(14, 15m)</span>
                      </div>
                      <Settings size={8} className="text-muted-foreground" />
                    </div>
                    {/* Range Row */}
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] text-muted-foreground w-6">
                        Range
                      </span>
                      <div className="flex-1 flex items-center gap-1">
                        <div className="flex-1 px-2 py-0.5 bg-muted/60 rounded border border-border text-[9px] text-center">
                          30
                        </div>
                        <span className="text-muted-foreground text-[9px]">
                          ~
                        </span>
                        <div className="flex-1 px-2 py-0.5 bg-muted/60 rounded border border-border text-[9px] text-center">
                          70
                        </div>
                      </div>
                    </div>
                    {/* Action Row */}
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] text-muted-foreground w-6">
                        Action
                      </span>
                      <div className="flex-1 px-2 py-0.5 bg-muted/60 rounded border border-border text-[9px] flex items-center justify-between">
                        <span>In Range</span>
                        <ChevronDown
                          size={8}
                          className="text-muted-foreground"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </SpotlightCard>

      {/* Small Feature - Tick-Level Backtesting */}
      <SpotlightCard
        title={translations.features.tickBacktesting.title}
        description={formatText(
          translations.features.tickBacktesting.description
        )}
        icon={<Zap />}
        className="md:col-span-1 md:row-span-1"
      />

      {/* Small Feature - AI Optimization */}
      <SpotlightCard
        title={translations.features.aiOptimization.title}
        description={formatText(
          translations.features.aiOptimization.description
        )}
        icon={<Cpu />}
        className="md:col-span-1 md:row-span-1"
      >
        <div className="h-32 w-full relative mt-4 bg-muted/30 rounded-lg border border-border/40 p-3 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[9px] text-muted-foreground font-mono">
              TPE Engine
            </span>
            <div className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-violet-500 animate-pulse"></span>
              <span className="text-[9px] text-violet-400 font-mono">
                Searching...
              </span>
            </div>
          </div>

          {/* Visualization of parameter points or a rising curve */}
          <div className="flex-1 flex items-end gap-1 px-1 py-3 relative z-10">
            {[0.15, 0.3, 0.25, 0.5, 0.45, 0.7, 0.65, 0.85, 1.0, 0.95].map(
              (h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0, opacity: 0 }}
                  whileInView={{ height: `${h * 100}%`, opacity: 1 }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="flex-1 bg-gradient-to-t from-violet-500/20 to-violet-500/60 rounded-t-sm"
                />
              )
            )}
          </div>

          <div className="flex items-end justify-between relative z-10">
            <div className="space-y-0.5">
              <span className="text-[7px] text-muted-foreground block uppercase leading-none">
                Best Metric
              </span>
              <span className="text-[11px] font-bold text-violet-400 font-mono leading-none">
                Sharpe 3.82
              </span>
            </div>
            <div className="text-right space-y-0.5">
              <span className="text-[7px] text-muted-foreground block uppercase leading-none">
                Iteration
              </span>
              <span className="text-[9px] font-medium font-mono leading-none">
                64 / 100
              </span>
            </div>
          </div>

          {/* Decorative background: Scanning grid effect */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0">
            <div className="absolute inset-0 bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:8px_8px]"></div>
          </div>
          <motion.div
            animate={{ top: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-[20%] bg-gradient-to-b from-transparent via-violet-500/10 to-transparent pointer-events-none z-0"
          />
        </div>
      </SpotlightCard>

      {/* Wide Feature - Exchange Connectivity */}
      <SpotlightCard
        title={translations.features.exchangeConnectivity.title}
        description={formatText(
          translations.features.exchangeConnectivity.description
        )}
        icon={<Globe />}
        className="md:col-span-3 lg:col-span-1"
      >
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between p-2 rounded bg-violet-500/5 border border-violet-500/10">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-[8px] text-yellow-500 font-bold">
                BN
              </div>
              <span className="text-[10px] font-medium">Binance Global</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
              <span className="text-[9px] text-green-500 font-medium">
                Connected
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "BTC", color: "orange", val: "+2.4%" },
              { label: "ETH", color: "blue", val: "+1.8%" },
              { label: "SOL", color: "indigo", val: "-0.5%" },
              { label: "XRP", color: "sky", val: "+0.2%" },
            ].map((coin, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className={`h-8 w-8 rounded-full bg-${coin.color}-500/10 border border-${coin.color}-500/30 flex items-center justify-center text-[8px] text-${coin.color}-500 font-bold`}
                >
                  {coin.label}
                </div>
                <span
                  className={`text-[7px] ${
                    coin.val.startsWith("+") ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {coin.val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </SpotlightCard>

      {/* Wide Feature - Security */}
      <SpotlightCard
        title={translations.features.security.title}
        description={formatText(translations.features.security.description)}
        icon={<ShieldCheck />}
        className="md:col-span-3 lg:col-span-1"
      >
        <div className="mt-4">
          <div className="flex items-center space-x-2 font-mono text-[10px] text-violet-400 bg-violet-500/10 w-fit px-3 py-1 rounded-full border border-violet-500/20 mb-3">
            <Lock className="w-2.5 h-2.5" />
            <span>AES-256 Encrypted</span>
          </div>

          <div className="relative h-20 w-full bg-muted/30 rounded border border-border/50 overflow-hidden group">
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border border-dashed border-violet-500/30 rounded-full flex items-center justify-center"
              >
                <div className="w-10 h-10 border border-violet-500/20 rounded-full animate-pulse"></div>
              </motion.div>
              <Lock className="absolute w-5 h-5 text-violet-400" />
            </div>

            <div className="absolute bottom-2 left-2 right-2 flex justify-between">
              <div className="flex items-center space-x-1 font-mono text-[7px] text-muted-foreground">
                <div className="w-1 h-1 rounded-full bg-violet-400"></div>
                <span>API Key Protected</span>
              </div>
              <div className="px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-[7px] text-violet-400 font-mono">
                Isolated Sandbox
              </div>
            </div>

            {/* Masking animation */}
            <div className="absolute top-2 left-2 flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  className="w-1 h-3 bg-violet-500/20 rounded-full"
                />
              ))}
            </div>
          </div>
        </div>
      </SpotlightCard>

      {/* Wide Feature - 24/7 Trading */}
      <SpotlightCard
        title={translations.features.community.title}
        description={formatText(translations.features.community.description)}
        icon={<CloudLightning />}
        className="md:col-span-3 lg:col-span-1"
      >
        <div className="mt-4 p-3 bg-muted/40 rounded-lg border border-border/50 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-[10px] font-medium text-green-500 uppercase tracking-wider">
                Live Execution
              </span>
            </div>
            <span className="text-[9px] text-muted-foreground font-mono">
              24:00:00
            </span>
          </div>

          <div className="space-y-1.5 font-mono text-[9px]">
            <div className="flex items-center justify-between text-muted-foreground/80">
              <span>[06:42:01] Analyzing BTC/USDT...</span>
              <span className="text-violet-400">Stable</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground/80">
              <span>[06:42:15] RSI Signal detected</span>
              <span className="text-green-400">Long</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground/80">
              <span>[06:42:30] Executing paper trade</span>
              <span className="text-blue-400">Order sent</span>
            </div>
          </div>

          {/* Decorative Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent pointer-events-none"></div>
        </div>
      </SpotlightCard>
    </div>
  );
};
