"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Globe, ShieldCheck, CloudLightning, Lock, Zap } from "lucide-react";
import { formatText } from "../utils/formatText";

interface IntegrationGridSectionProps {
  sectionTranslations: {
    badge: string;
    title: string;
    subtitle: string;
    cta: string;
  };
  exchangeTranslations: { title: string; description: string };
  securityTranslations: { title: string; description: string };
  tradingTranslations: { title: string; description: string };
}
// Exchange Card
const ExchangeCard: React.FC<{
  title: string;
  description: string;
  index: number;
  inView: boolean;
}> = ({ title, description, index, inView }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={inView ? { opacity: 1, y: 0 } : {}}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    className="group relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:border-yellow-500/50 transition-colors overflow-hidden"
  >
    {/* Hover Glow */}
    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

    <div className="relative z-10">
      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mb-4">
        <Globe className="w-6 h-6 text-yellow-400" />
      </div>

      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {formatText(description, "text-yellow-400")}
      </p>

      {/* Binance Connection */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-[8px] text-yellow-500 font-bold">
            BN
          </div>
          <span className="text-xs font-medium">Binance Global</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-green-500 font-medium">
            Connected
          </span>
        </div>
      </div>

      {/* Coins */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          { label: "BTC", val: "+2.4%" },
          { label: "ETH", val: "+1.8%" },
          { label: "SOL", val: "-0.5%" },
          { label: "XRP", val: "+0.2%" },
        ].map((coin) => (
          <div key={coin.label} className="text-center">
            <div className="h-8 w-8 mx-auto rounded-full bg-muted/50 border border-border/50 flex items-center justify-center text-[9px] font-bold text-muted-foreground">
              {coin.label}
            </div>
            <span
              className={`text-[9px] ${
                coin.val.startsWith("+") ? "text-green-500" : "text-red-500"
              }`}
            >
              {coin.val}
            </span>
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);

// Security Card
const SecurityCard: React.FC<{
  title: string;
  description: string;
  index: number;
  inView: boolean;
}> = ({ title, description, index, inView }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={inView ? { opacity: 1, y: 0 } : {}}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    className="group relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:border-violet-500/50 transition-colors overflow-hidden"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

    <div className="relative z-10">
      <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center mb-4">
        <ShieldCheck className="w-6 h-6 text-violet-400" />
      </div>

      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {formatText(description, "text-violet-400")}
      </p>

      {/* Security Badge */}
      <div className="flex items-center space-x-2 font-mono text-xs text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-500/10 w-fit px-3 py-1.5 rounded-full border border-violet-200 dark:border-violet-500/20 mb-4">
        <Lock className="w-3 h-3" />
        <span>AES-256 Encrypted</span>
      </div>

      {/* Security Visual */}
      <div className="relative h-20 w-full bg-muted/30 rounded-lg border border-border/50 overflow-hidden flex items-center justify-center">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-14 h-14 border border-dashed border-violet-500/30 rounded-full flex items-center justify-center"
        >
          <div className="w-8 h-8 border border-violet-500/20 rounded-full animate-pulse" />
        </motion.div>
        <Lock className="absolute w-5 h-5 text-violet-400" />

        {/* Labels */}
        <div className="absolute bottom-2 left-2 flex items-center space-x-1 text-[8px] text-muted-foreground">
          <div className="w-1 h-1 rounded-full bg-violet-400" />
          <span>API Key Protected</span>
        </div>
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-[8px] text-violet-400">
          Isolated Sandbox
        </div>
      </div>
    </div>
  </motion.div>
);

// Trading Card
const TradingCard: React.FC<{
  title: string;
  description: string;
  index: number;
  inView: boolean;
}> = ({ title, description, index, inView }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={inView ? { opacity: 1, y: 0 } : {}}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    className="group relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:border-green-500/50 transition-colors overflow-hidden"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

    <div className="relative z-10">
      <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-4">
        <CloudLightning className="w-6 h-6 text-green-400" />
      </div>

      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {formatText(description, "text-green-400")}
      </p>

      {/* Terminal Log */}
      <div className="p-3 bg-muted/40 rounded-lg border border-border/50 overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-[10px] font-medium text-green-600 dark:text-green-500 uppercase tracking-wider">
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
      </div>
    </div>
  </motion.div>
);
export const IntegrationGridSection: React.FC<IntegrationGridSectionProps> = ({
  sectionTranslations,
  exchangeTranslations,
  securityTranslations,
  tradingTranslations,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: "-100px" });

  return (
    <section
      id="section-infrastructure"
      ref={containerRef}
      className="scroll-mt-[50px] relative pt-36 pb-24 px-6 md:px-12 overflow-hidden"
    >
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        className="text-center max-w-3xl mx-auto mb-16"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 border border-cyan-200 text-cyan-600 dark:bg-cyan-500/10 dark:border-cyan-500/30 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider mb-4">
          <Zap className="w-3 h-3" />
          {sectionTranslations.badge}
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          {sectionTranslations.title}
        </h2>
        <p className="text-muted-foreground">
          {formatText(
            sectionTranslations.subtitle,
            "text-cyan-600 dark:text-cyan-400"
          )}
        </p>
      </motion.div>

      {/* Cards Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <ExchangeCard
          title={exchangeTranslations.title}
          description={exchangeTranslations.description}
          index={0}
          inView={inView}
        />
        <SecurityCard
          title={securityTranslations.title}
          description={securityTranslations.description}
          index={1}
          inView={inView}
        />
        <TradingCard
          title={tradingTranslations.title}
          description={tradingTranslations.description}
          index={2}
          inView={inView}
        />
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.4 }}
        className="text-center mt-12"
      >
        <Link href="/signup">
          <Button
            size="lg"
            variant="implement"
            className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black shadow-xl shadow-cyan-500/20"
          >
            {sectionTranslations.cta}
          </Button>
        </Link>
      </motion.div>
    </section>
  );
};

export default IntegrationGridSection;
