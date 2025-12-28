"use client";

import { motion, Variants } from "framer-motion";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import {
  Activity,
  BarChart2,
  GitBranch,
  Play,
  Settings,
  Wallet,
  Search,
  Bell,
  Menu,
  Layout,
  ChevronDown,
  MoreHorizontal,
  ArrowUpRight,
  GitCompareArrows,
  TrendingUp,
  Zap,
  CheckCircle2,
  ArrowDown,
  ArrowUp,
  Clock,
  Target,
  Scale,
  ShieldCheck,
  Brain,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  CartesianGrid,
  YAxis,
  Tooltip,
} from "recharts";

// Mock chart data
const mockData = [
  { name: "09:00", val: 102400 },
  { name: "10:00", val: 103398 },
  { name: "11:00", val: 104800 },
  { name: "12:00", val: 103908 },
  { name: "13:00", val: 104800 },
  { name: "14:00", val: 105800 },
  { name: "15:00", val: 106300 },
  { name: "16:00", val: 105800 },
  { name: "17:00", val: 107000 },
  { name: "18:00", val: 108500 },
  { name: "19:00", val: 109200 },
  { name: "20:00", val: 112400 },
];

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
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  ctaButton: string;
  versionBadge?: string;
}

/** HeroSection의 텍스트와 버튼 애니메이션 전용 클라이언트 컴포넌트 */
export const HeroContent = ({
  titleLine1,
  titleLine2,
  subtitle,
  ctaButton,
  versionBadge = "Cortex Beta",
}: HeroContentProps) => {
  return (
    <div className="flex flex-col relative z-10">
      <ContainerScroll
        titleComponent={
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center"
          >
            {/* Version Badge */}
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-center space-x-2 mb-6"
            >
              <span className="px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-400 text-[10px] md:text-xs font-mono uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"></span>
                {versionBadge}
              </span>
            </motion.div>

            {/* Main Title */}
            <motion.h1
              className="text-4xl md:text-7xl font-bold pb-4 tracking-tight text-center flex flex-col gap-2"
              variants={itemVariants}
            >
              <span className="text-foreground">{titleLine1}</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-300 dark:to-violet-400 pb-2">
                {titleLine2}
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="max-w-xl mx-auto text-muted-foreground mt-6 text-base md:text-lg font-light leading-relaxed text-center px-4"
              variants={itemVariants}
            >
              {subtitle}
            </motion.p>

            {/* CTA Button */}
            <motion.div variants={itemVariants} className="mt-8">
              <Link href="/strategies/new" passHref>
                <div className="relative group inline-block">
                  <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg blur opacity-0 group-hover:opacity-75 transition duration-500" />
                  <Button
                    size="lg"
                    className="relative z-10 bg-primary hover:bg-transparent hover:bg-gradient-to-r hover:from-violet-500 hover:to-fuchsia-500 text-primary-foreground shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 border-0 px-8"
                  >
                    <span className="mr-2">{ctaButton}</span>
                    <span className="group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </Button>
                </div>
              </Link>
            </motion.div>
          </motion.div>
        }
      >
        {/* Mock Trading Terminal UI */}
        <MockTradingTerminal />
      </ContainerScroll>

      {/* Bottom Gradient Fade for smooth transition to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-20"></div>
    </div>
  );
};

// --- Mock Components for Strategy Builder Look ---

const MockOperand = ({
  label,
  color = "violet",
}: {
  label: string;
  color?: "violet" | "slate" | "emerald";
}) => {
  const colorStyles = {
    violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    slate: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };

  return (
    <div
      className={`px-2 py-1 rounded text-[10px] md:text-xs font-medium border ${colorStyles[color]} flex items-center gap-1`}
    >
      {label}
    </div>
  );
};

const MockRuleCard = ({
  icon: Icon,
  title,
  children,
  delay = 0,
  type = "logic",
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
  delay?: number;
  type?: "logic" | "action";
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: "backOut" }}
      className={`relative group bg-card/80 backdrop-blur-sm border ${
        type === "logic"
          ? "border-l-violet-500 border-violet-500/20"
          : "border-l-emerald-500 border-emerald-500/20"
      } border-t-border/50 border-r-border/50 border-b-border/50 rounded-lg p-3 md:p-4 shadow-sm hover:shadow-md transition-all border-l-4 w-full max-w-sm`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`p-1.5 rounded-md ${
            type === "logic" ? "bg-violet-500/10" : "bg-emerald-500/10"
          }`}
        >
          <Icon
            size={14}
            className={
              type === "logic" ? "text-violet-400" : "text-emerald-400"
            }
          />
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </motion.div>
  );
};

const MockConnector = ({
  label,
  delay = 0,
}: {
  label: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: "1.5rem" }}
    transition={{ duration: 0.3, delay }}
    className="relative flex justify-center items-center h-6"
  >
    <div className="absolute h-full w-0.5 bg-border/60"></div>
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.2, delay: delay + 0.2 }}
      className="relative z-10 bg-background border border-border px-1.5 py-0.5 rounded-full"
    >
      <span className="text-[9px] font-bold text-muted-foreground">
        {label}
      </span>
    </motion.div>
  </motion.div>
);

/** Mock Trading Terminal Component */
const MockTradingTerminal = () => {
  const t = useTranslations("Landing.Hero.MockUI");
  const [hoveredBlock, setHoveredBlock] = useState<
    "market" | "long" | "short" | null
  >(null);

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground font-sans text-xs select-none rounded-xl border border-border/50 shadow-2xl overflow-hidden">
      {/* App Header */}
      <div className="h-10 border-b border-border flex items-center px-4 justify-between bg-background">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <Menu size={14} />
          </div>
          <div className="h-4 w-[1px] bg-border"></div>
          <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded border border-border text-foreground cursor-pointer hover:bg-muted/80">
            <span className="font-medium text-violet-400">
              {t("header.mainStrategy")}
            </span>
            <ChevronDown size={12} className="opacity-50" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t("header.systemOperational")}
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded cursor-pointer hover:bg-violet-500/20 transition-colors">
            <Play size={10} fill="currentColor" />
            <span className="font-bold tracking-wide">
              {t("header.deploy")}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Icons */}
        <div className="w-12 border-r border-border flex flex-col items-center py-4 gap-4 bg-background">
          {[Layout, GitBranch, Search, BarChart2, Settings].map((Icon, i) => (
            <div
              key={i}
              className={`p-2 rounded-lg cursor-pointer transition-all ${
                i === 1
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon size={18} strokeWidth={1.5} />
            </div>
          ))}
        </div>

        {/* Secondary Sidebar - Nodes */}
        <div className="w-48 border-r border-border bg-background flex-col hidden lg:flex">
          <div className="p-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
            {t("sidebar.logicBlocks")}
          </div>
          <div className="p-2 space-y-1 overflow-y-auto flex-1">
            {[
              { icon: GitCompareArrows, label: t("sidebar.items.comparison") },
              { icon: TrendingUp, label: t("sidebar.items.crossover") },
              { icon: BarChart2, label: t("sidebar.items.stateCheck") },
              { icon: Target, label: t("sidebar.items.threshold") },
              { icon: Clock, label: t("sidebar.items.timeFilter") },
              { icon: Activity, label: t("sidebar.items.volumeCheck") },
              { icon: ShieldCheck, label: t("sidebar.items.riskManager") },
              { icon: Scale, label: t("sidebar.items.positionSize") },
              { icon: Brain, label: t("sidebar.items.aiSignal") },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2 rounded-md bg-background border border-border/40 hover:border-violet-500/50 transition-colors cursor-pointer group"
              >
                <item.icon
                  size={14}
                  className="text-muted-foreground group-hover:text-violet-500 transition-colors"
                />
                <span className="text-xs text-foreground/80">{item.label}</span>
              </div>
            ))}
          </div>
          {/* Bottom Status Panel */}
          <div className="p-3 border-t border-border/50 bg-background/50 mt-auto">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>{t("sidebar.memory")}</span>
              <span>24%</span>
            </div>
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full w-[24%] bg-violet-500 rounded-full" />
            </div>
          </div>
        </div>

        {/* Main Canvas Area - Hybrid Node Graph + Strategy Builder */}
        <div className="flex-1 flex flex-col bg-muted/30 relative overflow-hidden">
          {/* Grid Background */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#6b7280 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          ></div>

          {/* Main Container with Nodes and Strategy Block */}
          <div className="relative w-full h-full p-6">
            {/* SVG Connecting Lines */}
            <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible">
              {/* SVG Glow Filters */}
              <defs>
                <filter
                  id="violetGlow"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feDropShadow
                    dx="0"
                    dy="0"
                    stdDeviation="4"
                    floodColor="#8b5cf6"
                    floodOpacity="0.8"
                  />
                </filter>
                <filter
                  id="roseGlow"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feDropShadow
                    dx="0"
                    dy="0"
                    stdDeviation="4"
                    floodColor="#f43f5e"
                    floodOpacity="0.8"
                  />
                </filter>
              </defs>
              {/* Line to Long block */}
              <motion.path
                d="M240 200 C 280 200, 320 80, 360 80"
                stroke="currentColor"
                strokeWidth={
                  hoveredBlock === "market" || hoveredBlock === "long" ? 3 : 2
                }
                fill="none"
                className="text-violet-500/60 transition-all duration-300"
                style={{
                  filter:
                    hoveredBlock === "market" || hoveredBlock === "long"
                      ? "url(#violetGlow)"
                      : "none",
                  opacity:
                    hoveredBlock === "market" || hoveredBlock === "long"
                      ? 1
                      : 0.6,
                }}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.6 }}
                transition={{
                  pathLength: { duration: 0.8, delay: 0.6, ease: "easeInOut" },
                  opacity: { duration: 0.3, delay: 0.6 },
                }}
              />
              {/* Line to Short block */}
              <motion.path
                d="M240 210 C 260 280, 270 340, 280 360"
                stroke="currentColor"
                strokeWidth={
                  hoveredBlock === "market" || hoveredBlock === "short" ? 3 : 2
                }
                fill="none"
                className="text-rose-500/60 transition-all duration-300"
                style={{
                  filter:
                    hoveredBlock === "market" || hoveredBlock === "short"
                      ? "url(#roseGlow)"
                      : "none",
                  opacity:
                    hoveredBlock === "market" || hoveredBlock === "short"
                      ? 1
                      : 0.5,
                }}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.5 }}
                transition={{
                  pathLength: { duration: 0.8, delay: 0.9, ease: "easeInOut" },
                  opacity: { duration: 0.3, delay: 0.9 },
                }}
              />
            </svg>

            {/* Node: Market Data (Original Style) */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              onMouseEnter={() => setHoveredBlock("market")}
              onMouseLeave={() => setHoveredBlock(null)}
              className={`absolute top-24 left-4 w-56 bg-card border rounded-lg shadow-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                hoveredBlock === "market"
                  ? "border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.5)] scale-[1.02] ring-1 ring-purple-500/50"
                  : "border-border hover:border-purple-500/50"
              }`}
            >
              <div className="px-3 py-2 bg-muted border-b border-border flex justify-between items-center">
                <div className="font-bold text-foreground flex items-center gap-2 text-xs">
                  <BarChart2 size={12} className="text-purple-400" />{" "}
                  {t("nodes.marketData")}
                </div>
                <MoreHorizontal size={12} className="text-muted-foreground" />
              </div>
              <div className="p-3 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">
                    {t("nodes.symbol")}
                  </span>
                  <span className="bg-background px-2 py-0.5 rounded text-purple-300 font-mono">
                    BTC-USDT
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">
                    {t("nodes.timeframe")}
                  </span>
                  <span className="bg-background px-2 py-0.5 rounded text-purple-300 font-mono">
                    15m
                  </span>
                </div>
              </div>
              <div className="px-3 py-1.5 bg-muted/50 border-t border-border flex justify-end">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              </div>
            </motion.div>

            {/* Strategy Block Container (Right Side - Can be partially cut off) */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              onMouseEnter={() => setHoveredBlock("long")}
              onMouseLeave={() => setHoveredBlock(null)}
              className={`absolute top-8 left-[360px] w-[360px] bg-card border rounded-lg shadow-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                hoveredBlock === "long"
                  ? "border-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.5)] scale-[1.02] ring-1 ring-violet-500/50"
                  : "border-border hover:border-violet-500/50"
              }`}
            >
              {/* Strategy Card Header */}
              <div className="px-3 py-2 bg-muted border-b border-border flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-violet-500/20 flex items-center justify-center">
                    <CheckCircle2 size={10} className="text-violet-400" />
                  </div>
                  <span className="font-semibold text-foreground text-xs">
                    {t("nodes.longEntry")}
                  </span>
                  <ArrowUp size={10} className="text-violet-400" />
                </div>
                <span className="text-[9px] text-muted-foreground">
                  ⊕ {t("nodes.addRule")}
                </span>
              </div>

              {/* Strategy Content */}
              <div className="p-3 space-y-2">
                {/* Block 1: 돌파 */}
                <div className="bg-background border border-border/60 rounded-md overflow-hidden">
                  <div className="px-2 py-1.5 flex items-center justify-between border-b border-border/40">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={10} className="text-violet-400" />
                      <span className="text-[10px] font-medium text-foreground">
                        {t("nodes.crossover")}
                      </span>
                    </div>
                    <MoreHorizontal
                      size={10}
                      className="text-muted-foreground"
                    />
                  </div>
                  <div className="p-2 border-l-[3px] border-l-violet-500">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="px-2 py-1 bg-muted/60 rounded border border-border text-[9px] flex items-center gap-1">
                        <span className="font-medium">EMA</span>
                        <span className="text-muted-foreground">(10, 15m)</span>
                        <Settings size={8} className="text-muted-foreground" />
                      </div>
                      <div className="px-1.5 py-1 bg-violet-500/10 rounded border border-violet-500/30 text-[9px] text-violet-400">
                        {t("values.crossesAbove")} ▾
                      </div>
                      <div className="px-2 py-1 bg-muted/60 rounded border border-border text-[9px] flex items-center gap-1">
                        <span className="font-medium">EMA</span>
                        <span className="text-muted-foreground">(20, 15m)</span>
                        <Settings size={8} className="text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* AND Connector + Block 2: 상태 기반 */}
                <div className="flex">
                  {/* AND Label */}
                  <div className="flex flex-col items-center w-8 shrink-0 -mt-1">
                    <div className="w-0.5 h-2 bg-violet-500/40"></div>
                    <div className="px-1 py-0.5 bg-violet-500/10 border border-violet-500/30 rounded text-[8px] font-bold text-violet-400">
                      {t("nodes.and")}
                    </div>
                    <div className="w-0.5 flex-1 bg-violet-500/40"></div>
                  </div>

                  {/* Indented Block 2 */}
                  <div className="flex-1 bg-background border border-border/60 rounded-md overflow-hidden">
                    <div className="px-2 py-1.5 flex items-center justify-between border-b border-border/40">
                      <div className="flex items-center gap-1.5">
                        <BarChart2 size={10} className="text-violet-400" />
                        <span className="text-[10px] font-medium text-foreground">
                          {t("nodes.stateBased")}
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
                          <span className="text-muted-foreground">
                            (14, 15m)
                          </span>
                        </div>
                        <Settings size={8} className="text-muted-foreground" />
                      </div>
                      {/* Range Row */}
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] text-muted-foreground w-6">
                          {t("nodes.range")}
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
                          {t("nodes.action")}
                        </span>
                        <div className="flex-1 px-2 py-0.5 bg-muted/60 rounded border border-border text-[9px] flex items-center justify-between">
                          <span>{t("values.inRange")}</span>
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

            {/* Short Strategy Block Container */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              onMouseEnter={() => setHoveredBlock("short")}
              onMouseLeave={() => setHoveredBlock(null)}
              className={`absolute top-[340px] left-[280px] w-[360px] bg-card border rounded-lg shadow-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                hoveredBlock === "short"
                  ? "border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.5)] scale-[1.02] ring-1 ring-rose-500/50"
                  : "border-border hover:border-rose-500/50"
              }`}
            >
              {/* Strategy Card Header */}
              <div className="px-3 py-2 bg-muted border-b border-border flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-rose-500/20 flex items-center justify-center">
                    <CheckCircle2 size={10} className="text-rose-400" />
                  </div>
                  <span className="font-semibold text-foreground text-xs">
                    {t("nodes.shortEntry")}
                  </span>
                  <ArrowDown size={10} className="text-rose-400" />
                </div>
                <span className="text-[9px] text-muted-foreground">
                  ⊕ {t("nodes.addRule")}
                </span>
              </div>

              {/* Strategy Content */}
              <div className="p-3 space-y-2">
                {/* Block 1: 돌파 */}
                <div className="bg-background border border-border/60 rounded-md overflow-hidden">
                  <div className="px-2 py-1.5 flex items-center justify-between border-b border-border/40">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp
                        size={10}
                        className="text-rose-400 rotate-180"
                      />
                      <span className="text-[10px] font-medium text-foreground">
                        {t("nodes.crossover")}
                      </span>
                    </div>
                    <MoreHorizontal
                      size={10}
                      className="text-muted-foreground"
                    />
                  </div>
                  <div className="p-2 border-l-[3px] border-l-rose-500">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="px-2 py-1 bg-muted/60 rounded border border-border text-[9px] flex items-center gap-1">
                        <span className="font-medium">EMA</span>
                        <span className="text-muted-foreground">(10, 15m)</span>
                        <Settings size={8} className="text-muted-foreground" />
                      </div>
                      <div className="px-1.5 py-1 bg-rose-500/10 rounded border border-rose-500/30 text-[9px] text-rose-400">
                        {t("values.crossesBelow")} ▾
                      </div>
                      <div className="px-2 py-1 bg-muted/60 rounded border border-border text-[9px] flex items-center gap-1">
                        <span className="font-medium">EMA</span>
                        <span className="text-muted-foreground">(20, 15m)</span>
                        <Settings size={8} className="text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* AND Connector + Block 2: 상태 기반 */}
                <div className="flex">
                  {/* AND Label */}
                  <div className="flex flex-col items-center w-8 shrink-0 -mt-1">
                    <div className="w-0.5 h-2 bg-rose-500/40"></div>
                    <div className="px-1 py-0.5 bg-rose-500/10 border border-rose-500/30 rounded text-[8px] font-bold text-rose-400">
                      {t("nodes.and")}
                    </div>
                    <div className="w-0.5 flex-1 bg-rose-500/40"></div>
                  </div>

                  {/* Indented Block 2 */}
                  <div className="flex-1 bg-background border border-border/60 rounded-md overflow-hidden">
                    <div className="px-2 py-1.5 flex items-center justify-between border-b border-border/40">
                      <div className="flex items-center gap-1.5">
                        <BarChart2 size={10} className="text-rose-400" />
                        <span className="text-[10px] font-medium text-foreground">
                          {t("nodes.stateBased")}
                        </span>
                      </div>
                      <MoreHorizontal
                        size={10}
                        className="text-muted-foreground"
                      />
                    </div>
                    <div className="p-2 border-l-[3px] border-l-rose-500 space-y-1.5">
                      {/* RSI Row */}
                      <div className="px-2 py-1 bg-muted/60 rounded border border-border text-[9px] flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">RSI</span>
                          <span className="text-muted-foreground">
                            (14, 15m)
                          </span>
                        </div>
                        <Settings size={8} className="text-muted-foreground" />
                      </div>
                      {/* Range Row */}
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] text-muted-foreground w-6">
                          {t("nodes.range")}
                        </span>
                        <div className="flex-1 flex items-center gap-1">
                          <div className="flex-1 px-2 py-0.5 bg-muted/60 rounded border border-border text-[9px] text-center">
                            70
                          </div>
                          <span className="text-muted-foreground text-[9px]">
                            ~
                          </span>
                          <div className="flex-1 px-2 py-0.5 bg-muted/60 rounded border border-border text-[9px] text-center">
                            90
                          </div>
                        </div>
                      </div>
                      {/* Action Row */}
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] text-muted-foreground w-6">
                          {t("nodes.action")}
                        </span>
                        <div className="flex-1 px-2 py-0.5 bg-muted/60 rounded border border-border text-[9px] flex items-center justify-between">
                          <span>{t("values.breakAbove")}</span>
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
        </div>

        {/* Right Sidebar - Analytics */}
        <div className="w-80 border-l border-border bg-background flex flex-col z-10 hidden xl:flex">
          <div className="p-3 border-b border-border flex justify-between items-center">
            <span className="font-bold text-foreground">
              {t("simulation.title")}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-violet-500 bg-violet-500/10 px-1.5 py-0.5 rounded">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"></div>
              {t("simulation.active")}
            </div>
          </div>

          <div className="p-4 flex-1 overflow-hidden flex flex-col">
            <div className="h-32 w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockData}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    className="text-border"
                    vertical={false}
                    horizontalCoordinatesGenerator={({ height }) => {
                      const lines = 5;
                      return Array.from(
                        { length: lines },
                        (_, i) => (height / (lines - 1)) * i
                      );
                    }}
                  />
                  <YAxis hide domain={["dataMin", "dataMax"]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "11px",
                      padding: "8px 12px",
                    }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                    itemStyle={{ color: "#8b5cf6" }}
                    formatter={(value: any) => [
                      `$${Number(value).toLocaleString()}`,
                      "Balance",
                    ]}
                    labelFormatter={(label) => `Time: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="val"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorVal)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-muted rounded p-2 border border-border">
                <div className="text-[10px] text-muted-foreground mb-1">
                  Total PnL
                </div>
                <div className="text-lg font-mono text-violet-400 flex items-center gap-1">
                  +$12,450 <ArrowUpRight size={14} />
                </div>
              </div>
              <div className="bg-muted rounded p-2 border border-border">
                <div className="text-[10px] text-muted-foreground mb-1">
                  Win Rate
                </div>
                <div className="text-lg font-mono text-foreground">68.4%</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] uppercase text-muted-foreground font-bold">
                Recent Trades
              </div>
              {[
                { type: "LONG BTC", time: "09:15:42", profit: "+$185.50" },
                { type: "LONG ETH", time: "11:32:18", profit: "+$312.00" },
                { type: "LONG BTC", time: "14:48:05", profit: "+$467.80" },
              ].map((trade, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-[11px] py-1 border-b border-border/50"
                >
                  <span className="text-violet-400">{trade.type}</span>
                  <span className="text-muted-foreground font-mono">
                    {trade.time}
                  </span>
                  <span className="text-foreground font-mono">
                    {trade.profit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
