"use client";

import React from "react";
import { motion } from "framer-motion";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import {
  Cpu,
  Workflow,
  Zap,
  Globe,
  ShieldCheck,
  Users,
  Lock,
  LineChart,
  Code2,
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
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8 h-auto">
      {/* Large Feature - Visual Strategy Builder */}
      <SpotlightCard
        title={translations.features.strategyBuilder.title}
        description={translations.features.strategyBuilder.description}
        icon={<Workflow />}
        className="md:col-span-2 md:row-span-2"
      >
        <div className="relative h-full min-h-[250px] w-full overflow-hidden rounded-xl border border-border bg-background p-4 shadow-inner">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_14px]"></div>

          {/* Animated Elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md h-40">
            {/* Floating Blocks */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 left-0 bg-card border border-border p-3 rounded-lg shadow-xl z-20 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center text-blue-400">
                <Code2 size={16} />
              </div>
              <div className="space-y-1">
                <div className="h-2 w-16 bg-muted rounded"></div>
                <div className="h-1.5 w-10 bg-muted/60 rounded"></div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
              className="absolute bottom-0 right-10 bg-card border border-violet-500/30 p-3 rounded-lg shadow-xl z-20 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded bg-violet-500/20 flex items-center justify-center text-violet-400">
                <LineChart size={16} />
              </div>
              <div className="space-y-1">
                <div className="h-2 w-20 bg-muted rounded"></div>
                <div className="h-1.5 w-12 bg-muted/60 rounded"></div>
              </div>
            </motion.div>

            {/* Connection Line */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              <path
                d="M50 40 Q 150 100, 280 120"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeDasharray="4 4"
                className="text-border"
              />
            </svg>
          </div>
        </div>
      </SpotlightCard>

      {/* Small Feature - Tick-Level Backtesting */}
      <SpotlightCard
        title={translations.features.tickBacktesting.title}
        description={translations.features.tickBacktesting.description}
        icon={<Zap />}
        className="md:col-span-1 md:row-span-1"
      >
        <div className="h-28 w-full relative overflow-hidden rounded-lg bg-muted/50 border border-border flex items-end justify-between px-2 pb-0 pt-8 gap-1">
          {[20, 50, 35, 90, 60, 85, 75, 95, 120].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 10 }}
              whileInView={{ height: `${h}%` }}
              transition={{ duration: 0.8, delay: i * 0.1, ease: "backOut" }}
              className="flex-1 bg-violet-500/80 rounded-t-[4px] hover:bg-violet-400 transition-colors"
            />
          ))}
        </div>
      </SpotlightCard>

      {/* Small Feature - AI Optimization */}
      <SpotlightCard
        title={translations.features.aiOptimization.title}
        description={translations.features.aiOptimization.description}
        icon={<Cpu />}
        className="md:col-span-1 md:row-span-1"
      />

      {/* Wide Feature - Exchange Connectivity */}
      <SpotlightCard
        title={translations.features.exchangeConnectivity.title}
        description={translations.features.exchangeConnectivity.description}
        icon={<Globe />}
        className="md:col-span-3 lg:col-span-1"
      >
        <div className="flex gap-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-500 mt-4">
          <div className="h-10 w-10 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center text-[10px] text-yellow-500 font-bold">
            BN
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-[10px] text-blue-500 font-bold">
            UB
          </div>
          <div className="h-10 w-10 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center text-[10px] text-orange-500 font-bold">
            BB
          </div>
          <div className="h-10 w-10 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-[10px] text-purple-500 font-bold">
            KK
          </div>
        </div>
      </SpotlightCard>

      {/* Wide Feature - Security */}
      <SpotlightCard
        title={translations.features.security.title}
        description={translations.features.security.description}
        icon={<ShieldCheck />}
        className="md:col-span-3 lg:col-span-1"
      >
        <div className="mt-4 flex items-center space-x-2 font-mono text-xs text-violet-400 bg-violet-500/10 w-fit px-3 py-1.5 rounded-full border border-violet-500/20">
          <Lock className="w-3 h-3" />
          <span>AES-256 Encrypted</span>
        </div>
      </SpotlightCard>

      {/* Wide Feature - Community */}
      <SpotlightCard
        title={translations.features.community.title}
        description={translations.features.community.description}
        icon={<Users />}
        className="md:col-span-3 lg:col-span-1"
      />
    </div>
  );
};
