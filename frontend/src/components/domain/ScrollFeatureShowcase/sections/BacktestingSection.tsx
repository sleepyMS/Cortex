"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Zap, LineChart, Target, CheckCircle2 } from "lucide-react";
import { formatText } from "../utils/formatText";

interface BacktestingSectionProps {
  translations: {
    badge: string;
    title: string;
    description: string;
    highlights: string[];
    cta: string;
  };
}

// Backtest Chart Visual
const BacktestChartVisual: React.FC<{ progress: number }> = ({ progress }) => {
  // Fixed candle data for consistent visualization
  const candles = React.useMemo(() => {
    const startPrice = 42000;
    // Hardcoded patterns: [change, wickUp, wickDown]
    // Hardcoded patterns: [change, wickUp, wickDown]
    const patterns = [
      [150, 50, 50],
      [180, 80, 40],
      [-80, 40, 60],
      [220, 100, 50],
      [300, 120, 60], // Initial rise - moderate
      [-150, 40, 100],
      [-200, 30, 120],
      [-100, 50, 80],
      [80, 60, 40],
      [180, 80, 50], // Volatility
      [250, 150, 60],
      [200, 100, 50],
      [-80, 40, 60],
      [-180, 50, 100],
      [-300, 40, 150], // Peak and drop
      [-100, 30, 80],
      [150, 80, 40],
      [200, 120, 60],
      [250, 140, 50],
      [150, 90, 40], // Recovery
      [-50, 50, 60],
      [100, 70, 40],
      [120, 80, 40],
      [80, 40, 50], // Stabilization
    ];

    let currentPrice = startPrice;
    return patterns.map(([change, wickUp, wickDown]) => {
      const open = currentPrice;
      const close = currentPrice + change;
      const high = Math.max(open, close) + wickUp;
      const low = Math.min(open, close) - wickDown;
      currentPrice = close;

      return {
        open,
        high,
        low,
        close,
        color: close >= open ? "#22c55e" : "#ef4444",
      };
    });
  }, []);

  // Calculate price range for proper scaling
  const priceRange = React.useMemo(() => {
    const allPrices = candles.flatMap((c) => [c.high, c.low]);
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const padding = (max - min) * 0.1;
    return { min: min - padding, max: max + padding };
  }, [candles]);

  // Signal positions (Buy at index 4, Sell at 11, Buy at 16)
  const signals = [
    { index: 4, type: "buy" },
    { index: 11, type: "sell" },
    { index: 16, type: "buy" },
  ];

  // Equity curve points
  const equityPoints = React.useMemo(() => {
    let equity = 100;
    return candles.map((candle, i) => {
      // Base trend - steadily increasing
      const trend = i * 0.6;

      // Correlate to candle moves
      const candleMove = (candle.close - candle.open) / 120;

      // Deterministic penalty for drawdown periods
      const isDrawdown = (i >= 7 && i <= 10) || (i >= 16 && i <= 19);
      const penalty = isDrawdown ? -1.2 * ((i % 3) + 1) : 0;

      // Significant jumps on signals - balanced growth
      if (i === 4) equity += 3.5; // Buy
      if (i === 11) equity += 7; // Sell profit
      if (i === 16) equity -= 1.2; // Buy into dip
      if (i === 20) equity += 4.5; // Recovery

      equity += trend * 0.2 + candleMove * 0.5 + penalty;

      // Ensure it doesn't drop below base
      return Math.max(equity, 80);
    });
  }, [candles]);

  const visibleCandles = Math.floor(progress * candles.length);

  // Chart dimensions
  const chartWidth = 180;
  const chartHeight = 160;
  const candleWidth = 5;
  const candleGap = 2;
  const chartPadding = { left: 5, top: 10, right: 5, bottom: 25 };

  // Scale price to Y coordinate
  const priceToY = (price: number) => {
    const range = priceRange.max - priceRange.min;
    const normalized = (price - priceRange.min) / range;
    return (
      chartPadding.top +
      (1 - normalized) * (chartHeight - chartPadding.top - chartPadding.bottom)
    );
  };

  // Get candle X position
  const getCandleX = (index: number) => {
    return (
      chartPadding.left + index * (candleWidth + candleGap) + candleWidth / 2
    );
  };

  return (
    <div className="relative w-full h-full min-h-[400px] p-4">
      {/* Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:15px_15px] rounded-xl" />

      <svg className="w-full h-full" viewBox="0 0 320 200">
        {/* Price Chart Area Background */}
        <rect
          x={0}
          y={chartPadding.top}
          width={chartWidth}
          height={chartHeight - chartPadding.top - chartPadding.bottom}
          fill="rgba(0,0,0,0.03)"
          className="dark:fill-black/30"
          rx={4}
        />

        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75].map((ratio, i) => {
          const yPos =
            chartPadding.top +
            ratio * (chartHeight - chartPadding.top - chartPadding.bottom);
          return (
            <line
              key={i}
              x1={0}
              y1={yPos}
              x2={chartWidth}
              y2={yPos}
              stroke="currentColor"
              className="text-foreground/5 dark:text-white/5"
              strokeWidth={1}
            />
          );
        })}

        {/* Candles */}
        {candles.slice(0, visibleCandles).map((candle, i) => {
          const x = getCandleX(i);
          const yHigh = priceToY(candle.high);
          const yLow = priceToY(candle.low);
          const yOpen = priceToY(candle.open);
          const yClose = priceToY(candle.close);
          const bodyTop = Math.min(yOpen, yClose);
          const bodyHeight = Math.max(Math.abs(yOpen - yClose), 2);

          return (
            <motion.g
              key={i}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: 0.15, delay: i * 0.02 }}
              style={{ transformOrigin: `${x}px ${(yHigh + yLow) / 2}px` }}
            >
              {/* Wick */}
              <line
                x1={x}
                y1={yHigh}
                x2={x}
                y2={yLow}
                stroke={candle.color}
                strokeWidth={1}
              />
              {/* Body */}
              <rect
                x={x - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={candle.color}
                rx={1}
              />
            </motion.g>
          );
        })}

        {/* Buy/Sell Markers - Positioned relative to actual candles */}
        {signals.map((signal, idx) => {
          if (visibleCandles <= signal.index) return null;
          const candle = candles[signal.index];
          const x = getCandleX(signal.index);
          const y =
            signal.type === "buy"
              ? priceToY(candle.low) + 15
              : priceToY(candle.high) - 15;
          const isBuy = signal.type === "buy";

          return (
            <motion.g
              key={`signal-${idx}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: 0.1,
              }}
            >
              <circle
                cx={x}
                cy={y}
                r={10}
                fill={
                  isBuy ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"
                }
                stroke={isBuy ? "#22c55e" : "#ef4444"}
                strokeWidth={2}
              />
              <text
                x={x}
                y={y + 4}
                textAnchor="middle"
                fill={isBuy ? "#22c55e" : "#ef4444"}
                fontSize={11}
                fontWeight="bold"
              >
                {isBuy ? "B" : "S"}
              </text>
              {/* Connecting line to candle */}
              <line
                x1={x}
                y1={signal.type === "buy" ? y - 10 : y + 10}
                x2={x}
                y2={
                  signal.type === "buy"
                    ? priceToY(candle.low)
                    : priceToY(candle.high)
                }
                stroke={isBuy ? "#22c55e" : "#ef4444"}
                strokeWidth={1}
                strokeDasharray="2 2"
                opacity={0.5}
              />
            </motion.g>
          );
        })}

        {/* Separator */}
        <line
          x1={190}
          y1={0}
          x2={190}
          y2={200}
          stroke="currentColor"
          className="text-foreground/10 dark:text-white/10"
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {/* Equity Curve Area */}
        <rect
          x={200}
          y={chartPadding.top}
          width={115}
          height={chartHeight - chartPadding.top - chartPadding.bottom}
          fill="rgba(0,0,0,0.03)"
          className="dark:fill-black/30"
          rx={4}
        />

        {/* Equity Curve */}
        {visibleCandles > 0 && (
          <>
            {/* Equity line */}
            <motion.path
              d={equityPoints
                .slice(0, visibleCandles)
                .map((eq, i) => {
                  const x = 205 + i * 4.5;
                  const y =
                    chartPadding.top +
                    (1 - (eq - 100) / 40) *
                      (chartHeight -
                        chartPadding.top -
                        chartPadding.bottom -
                        10);
                  return `${i === 0 ? "M" : "L"} ${x},${y}`;
                })
                .join(" ")}
              fill="none"
              stroke="url(#equityGradient)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Equity fill */}
            <motion.path
              d={`${equityPoints
                .slice(0, visibleCandles)
                .map((eq, i) => {
                  const x = 205 + i * 4.5;
                  const y =
                    chartPadding.top +
                    (1 - (eq - 100) / 40) *
                      (chartHeight -
                        chartPadding.top -
                        chartPadding.bottom -
                        10);
                  return `${i === 0 ? "M" : "L"} ${x},${y}`;
                })
                .join(" ")} L ${205 + (visibleCandles - 1) * 4.5},${
                chartHeight - chartPadding.bottom
              } L 205,${chartHeight - chartPadding.bottom} Z`}
              fill="url(#equityFill)"
              opacity={0.4}
            />
          </>
        )}

        {/* Gradients */}
        <defs>
          <linearGradient id="equityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="equityFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Labels */}
        <text
          x={chartWidth / 2}
          y={chartHeight}
          textAnchor="middle"
          fill="currentColor"
          className="text-muted-foreground/60"
          fontSize={10}
        >
          Price Chart
        </text>
        <text
          x={257}
          y={chartHeight}
          textAnchor="middle"
          fill="currentColor"
          className="text-muted-foreground/60"
          fontSize={10}
        >
          Equity Curve
        </text>
      </svg>

      {/* Metrics Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: progress > 0.6 ? 1 : 0,
          y: progress > 0.6 ? 0 : 20,
        }}
        className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2"
      >
        <div className="bg-background/80 backdrop-blur-sm border border-green-500/30 rounded-lg px-3 py-2 text-center">
          <div className="text-[9px] text-muted-foreground uppercase">
            Return
          </div>
          <div className="text-sm font-mono font-bold text-green-400">
            +127.3%
          </div>
        </div>
        <div className="bg-background/80 backdrop-blur-sm border border-red-500/30 rounded-lg px-3 py-2 text-center">
          <div className="text-[9px] text-muted-foreground uppercase">MDD</div>
          <div className="text-sm font-mono font-bold text-red-400">-12.4%</div>
        </div>
        <div className="bg-background/80 backdrop-blur-sm border border-emerald-500/30 rounded-lg px-3 py-2 text-center">
          <div className="text-[9px] text-muted-foreground uppercase">
            Sharpe
          </div>
          <div className="text-sm font-mono font-bold text-emerald-400">
            2.84
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export const BacktestingSection: React.FC<BacktestingSectionProps> = ({
  translations,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: false, margin: "-20%" });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const progress = useTransform(scrollYProgress, [0.15, 0.4], [0, 1]);
  const [progressValue, setProgressValue] = useState(0);

  useEffect(() => {
    return progress.on("change", (v) => setProgressValue(v));
  }, [progress]);

  const highlightIcons = [Zap, LineChart, Target];

  return (
    <section
      id="section-backtesting"
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
              <BacktestChartVisual progress={progressValue} />
            </div>
          </motion.div>

          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 border border-green-200 text-green-600 dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-400 text-xs font-bold uppercase tracking-wider mb-6">
              <Zap className="w-3 h-3" />
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
                "text-green-600 dark:text-green-400"
              )}
            </p>

            {/* Highlights */}
            <div className="space-y-4 mb-10">
              {translations.highlights.map((highlight, index) => {
                const Icon = highlightIcons[index];
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-foreground font-medium">
                      {highlight}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* CTA */}
            <Link href="/backtester">
              <Button
                size="lg"
                variant="implement"
                className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-xl shadow-green-500/20"
              >
                <Zap className="w-5 h-5" />
                {translations.cta}
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default BacktestingSection;
