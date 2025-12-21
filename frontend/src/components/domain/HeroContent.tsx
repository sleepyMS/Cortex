"use client";

import { motion, Variants } from "framer-motion";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import React from "react";
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
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  CartesianGrid,
  YAxis,
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
    <div className="flex flex-col overflow-hidden relative z-10">
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
                <Button
                  size="lg"
                  className="group relative inline-flex items-center justify-center overflow-hidden rounded-md px-8 font-medium transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(139,92,246,0.3)]"
                >
                  <span className="mr-2">{ctaButton}</span>
                  <span className="group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        }
      >
        {/* Mock Trading Terminal UI */}
        <MockTradingTerminal />
      </ContainerScroll>
    </div>
  );
};

/** Mock Trading Terminal Component */
const MockTradingTerminal = () => {
  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground font-sans text-xs select-none">
      {/* App Header */}
      <div className="h-10 border-b border-border flex items-center px-4 justify-between bg-background">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <Menu size={14} />
          </div>
          <div className="h-4 w-[1px] bg-border"></div>
          <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded border border-border text-foreground cursor-pointer hover:bg-muted/80">
            <span className="font-medium text-violet-400">Main Strategy</span>
            <ChevronDown size={12} className="opacity-50" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded cursor-pointer hover:bg-violet-500/20 transition-colors">
            <Play size={10} fill="currentColor" />
            <span className="font-bold tracking-wide">DEPLOY</span>
          </div>
          <div className="p-1.5 hover:bg-muted rounded cursor-pointer text-muted-foreground">
            <Bell size={14} />
          </div>
          <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-purple-500"></div>
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
            Logic Blocks
          </div>
          <div className="p-2 space-y-1 overflow-y-auto">
            {[
              "Market Data",
              "Technical Indicators",
              "Math Operators",
              "Order Execution",
              "Risk Management",
              "Portfolio",
            ].map((cat) => (
              <div
                key={cat}
                className="px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded cursor-pointer flex items-center justify-between group"
              >
                {cat}
                <ChevronDown
                  size={10}
                  className="opacity-0 group-hover:opacity-100"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col bg-muted/30 relative overflow-hidden">
          {/* Grid Background */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#6b7280 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          ></div>

          {/* Nodes Container */}
          <div className="relative w-full h-full p-8">
            {/* Connecting Lines */}
            <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible">
              <path
                d="M260 120 C 320 120, 320 200, 380 200"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                className="animate-pulse text-border"
                strokeOpacity="0.5"
              />
              <path
                d="M260 300 C 320 300, 320 230, 380 230"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                className="text-border"
                strokeOpacity="0.5"
              />
              <path
                d="M580 215 C 640 215, 640 215, 700 215"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeDasharray="4 4"
                className="animate-[dash_1s_linear_infinite] text-violet-500"
              />
            </svg>

            {/* Node 1: RSI Source */}
            <div className="absolute top-20 left-10 w-64 bg-card border border-border rounded-lg shadow-xl overflow-hidden group hover:border-muted-foreground transition-colors">
              <div className="px-3 py-2 bg-muted border-b border-border flex justify-between items-center">
                <div className="font-bold text-foreground flex items-center gap-2">
                  <Activity size={12} className="text-blue-400" /> RSI Indicator
                </div>
                <MoreHorizontal size={12} className="text-muted-foreground" />
              </div>
              <div className="p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Period</span>
                  <span className="bg-background px-2 py-0.5 rounded text-blue-300 font-mono">
                    14
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Source</span>
                  <span className="bg-background px-2 py-0.5 rounded text-foreground font-mono">
                    Close
                  </span>
                </div>
              </div>
              <div className="px-3 py-1.5 bg-muted/50 border-t border-border flex justify-end">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              </div>
            </div>

            {/* Node 2: Price Data */}
            <div className="absolute top-64 left-10 w-64 bg-card border border-border rounded-lg shadow-xl overflow-hidden group hover:border-muted-foreground transition-colors">
              <div className="px-3 py-2 bg-muted border-b border-border flex justify-between items-center">
                <div className="font-bold text-foreground flex items-center gap-2">
                  <BarChart2 size={12} className="text-purple-400" /> Market
                  Data
                </div>
                <MoreHorizontal size={12} className="text-muted-foreground" />
              </div>
              <div className="p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Symbol</span>
                  <span className="bg-background px-2 py-0.5 rounded text-purple-300 font-mono">
                    BTC-USDT
                  </span>
                </div>
              </div>
              <div className="px-3 py-1.5 bg-muted/50 border-t border-border flex justify-end">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              </div>
            </div>

            {/* Node 3: Logic */}
            <div className="absolute top-40 left-[380px] w-52 bg-card border border-border rounded-lg shadow-xl overflow-hidden group hover:border-muted-foreground transition-colors ring-2 ring-violet-500/20">
              <div className="px-3 py-2 bg-muted border-b border-border flex justify-between items-center">
                <div className="font-bold text-foreground flex items-center gap-2">
                  <GitBranch size={12} className="text-orange-400" /> CrossOver
                  Logic
                </div>
              </div>
              <div className="p-3">
                <div className="text-center text-muted-foreground py-2 font-mono text-[10px]">
                  Processing Signal...
                </div>
              </div>
              <div className="px-3 py-1.5 bg-muted/50 border-t border-border flex justify-between">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></div>
              </div>
            </div>

            {/* Node 4: Execution */}
            <div className="absolute top-40 left-[700px] w-60 bg-card border border-border rounded-lg shadow-xl overflow-hidden group hover:border-muted-foreground transition-colors hidden xl:block">
              <div className="px-3 py-2 bg-muted border-b border-border flex justify-between items-center">
                <div className="font-bold text-foreground flex items-center gap-2">
                  <Wallet size={12} className="text-violet-400" /> Execution
                </div>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-border"></div>
                </div>
              </div>
              <div className="p-3 bg-violet-950/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-violet-400 font-bold">LONG 5x</span>
                  <span className="text-muted-foreground">Limit Order</span>
                </div>
                <div className="h-1 w-full bg-muted rounded overflow-hidden">
                  <div className="h-full w-[60%] bg-violet-500"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Analytics */}
        <div className="w-80 border-l border-border bg-background flex flex-col z-10 hidden xl:flex">
          <div className="p-3 border-b border-border flex justify-between items-center">
            <span className="font-bold text-foreground">Live Simulation</span>
            <div className="flex items-center gap-1 text-[10px] text-violet-500 bg-violet-500/10 px-1.5 py-0.5 rounded">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"></div>
              Active
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
                  />
                  <YAxis hide domain={["dataMin", "dataMax"]} />
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
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-[11px] py-1 border-b border-border/50"
                >
                  <span className="text-violet-400">LONG BTC</span>
                  <span className="text-muted-foreground font-mono">
                    14:02:2{i}
                  </span>
                  <span className="text-foreground font-mono">+$24{i}.00</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
