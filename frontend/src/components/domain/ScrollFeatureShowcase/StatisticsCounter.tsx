// file: src/components/domain/ScrollFeatureShowcase/StatisticsCounter.tsx

"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Brain, Workflow, Cpu, Zap, Globe } from "lucide-react";

interface FeatureNavProps {
  translations: {
    aiLab: string;
    strategyBuilder: string;
    optimization: string;
    backtesting: string;
    infrastructure: string;
  };
}

const FeatureNavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  delay: number;
  inView: boolean;
  color: string;
}> = ({ icon, label, delay, inView, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={inView ? { opacity: 1, y: 0 } : {}}
    transition={{ duration: 0.5, delay }}
    className="flex flex-col items-center gap-3 group cursor-pointer"
  >
    <div
      className={`inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl ${color} group-hover:scale-110 transition-transform`}
    >
      {icon}
    </div>
    <span className="text-sm md:text-base font-medium text-muted-foreground group-hover:text-foreground transition-colors">
      {label}
    </span>
  </motion.div>
);

export const StatisticsCounter: React.FC<FeatureNavProps> = ({
  translations,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const features = [
    {
      icon: <Brain className="w-6 h-6 md:w-7 md:h-7 text-violet-400" />,
      label: translations.aiLab,
      color: "bg-violet-500/10 border border-violet-500/30",
    },
    {
      icon: <Workflow className="w-6 h-6 md:w-7 md:h-7 text-blue-400" />,
      label: translations.strategyBuilder,
      color: "bg-blue-500/10 border border-blue-500/30",
    },
    {
      icon: <Cpu className="w-6 h-6 md:w-7 md:h-7 text-orange-400" />,
      label: translations.optimization,
      color: "bg-orange-500/10 border border-orange-500/30",
    },
    {
      icon: <Zap className="w-6 h-6 md:w-7 md:h-7 text-green-400" />,
      label: translations.backtesting,
      color: "bg-green-500/10 border border-green-500/30",
    },
    {
      icon: <Globe className="w-6 h-6 md:w-7 md:h-7 text-cyan-400" />,
      label: translations.infrastructure,
      color: "bg-cyan-500/10 border border-cyan-500/30",
    },
  ];

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className="py-12 px-6 md:px-12 border-y border-border/30 bg-gradient-to-r from-violet-500/5 via-transparent to-violet-500/5"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center gap-4 md:gap-8">
          {features.map((feature, index) => (
            <FeatureNavItem
              key={feature.label}
              icon={feature.icon}
              label={feature.label}
              delay={index * 0.1}
              inView={inView}
              color={feature.color}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default StatisticsCounter;
