"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Brain, Cpu, BarChart3, Zap, Shield, Clock } from "lucide-react";

interface StatisticsCounterProps {
  translations: {
    deepLearning: string;
    optimization: string;
    indicators: string;
    backtest: string;
    security: string;
    trading: string;
  };
}

// Feature badge component (no animated counter needed for text features)
const FeatureBadge: React.FC<{
  icon: React.ReactNode;
  value: string;
  label: string;
  delay: number;
  inView: boolean;
  color: string;
}> = ({ icon, value, label, delay, inView, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={inView ? { opacity: 1, y: 0 } : {}}
    transition={{ duration: 0.5, delay }}
    className="text-center group"
  >
    <div
      className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${color} mb-3`}
    >
      {icon}
    </div>
    <div className="text-xl md:text-2xl font-bold text-foreground mb-1">
      {value}
    </div>
    <div className="text-xs md:text-sm text-muted-foreground">{label}</div>
  </motion.div>
);

export const StatisticsCounter: React.FC<StatisticsCounterProps> = ({
  translations,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const stats = [
    {
      icon: <Brain className="w-5 h-5 text-violet-400" />,
      value: "LSTM/GRU",
      label: translations.deepLearning,
      color: "bg-violet-500/10 border border-violet-500/30",
    },
    {
      icon: <Cpu className="w-5 h-5 text-orange-400" />,
      value: "TPE",
      label: translations.optimization,
      color: "bg-orange-500/10 border border-orange-500/30",
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-blue-400" />,
      value: "30+",
      label: translations.indicators,
      color: "bg-blue-500/10 border border-blue-500/30",
    },
    {
      icon: <Zap className="w-5 h-5 text-yellow-400" />,
      value: "1분",
      label: translations.backtest,
      color: "bg-yellow-500/10 border border-yellow-500/30",
    },
    {
      icon: <Shield className="w-5 h-5 text-emerald-400" />,
      value: "AES-256",
      label: translations.security,
      color: "bg-emerald-500/10 border border-emerald-500/30",
    },
    {
      icon: <Clock className="w-5 h-5 text-cyan-400" />,
      value: "24/7",
      label: translations.trading,
      color: "bg-cyan-500/10 border border-cyan-500/30",
    },
  ];

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className="py-16 px-6 md:px-12 border-y border-border/30 bg-gradient-to-r from-violet-500/5 via-transparent to-violet-500/5"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-6 md:gap-8">
          {stats.map((stat, index) => (
            <FeatureBadge
              key={stat.label}
              icon={stat.icon}
              value={stat.value}
              label={stat.label}
              delay={index * 0.1}
              inView={inView}
              color={stat.color}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default StatisticsCounter;
