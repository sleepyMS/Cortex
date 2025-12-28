"use client";

import React, { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Brain, Sparkles, Target, Zap } from "lucide-react";
import { formatText } from "../utils/formatText";

interface AILabSectionProps {
  translations: {
    badge: string;
    title: string;
    description: string;
    highlights: string[];
    cta: string;
  };
}

// Neural Network Visualization Component
const NeuralNetworkVisual: React.FC<{ progress: number }> = ({ progress }) => {
  const inputNodes = ["OHLCV", "RSI", "EMA", "MACD"];
  const hiddenNodes = [1, 2, 3, 4, 5, 6];
  const outputNodes = ["Buy", "Sell", "Hold"];

  return (
    <div className="relative w-full h-full min-h-[400px] flex items-center justify-center">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:20px_20px] rounded-xl" />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-indigo-500/5 rounded-xl" />

      <svg
        className="w-full h-full max-w-[500px] max-h-[400px]"
        viewBox="0 0 500 400"
      >
        {/* Connection Lines - Input to Hidden */}
        {inputNodes.map((_, i) =>
          hiddenNodes.map((_, j) => (
            <motion.line
              key={`ih-${i}-${j}`}
              x1={90}
              y1={80 + i * 80}
              x2={250}
              y2={50 + j * 55}
              stroke="url(#lineGradient)"
              strokeWidth={1}
              strokeOpacity={Math.min(progress * 2, 0.3)}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: progress > 0.25 ? 1 : 0 }}
              transition={{ duration: 0.5, delay: (i + j) * 0.02 }}
            />
          ))
        )}

        {/* Connection Lines - Hidden to Output */}
        {hiddenNodes.map((_, i) =>
          outputNodes.map((_, j) => (
            <motion.line
              key={`ho-${i}-${j}`}
              x1={250}
              y1={50 + i * 55}
              x2={410}
              y2={120 + j * 80}
              stroke="url(#lineGradient)"
              strokeWidth={1}
              strokeOpacity={Math.min(progress * 2, 0.3)}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: progress > 0.5 ? 1 : 0 }}
              transition={{ duration: 0.5, delay: i * 0.03 }}
            />
          ))
        )}

        {/* Gradient Definition */}
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* Input Nodes */}
        {inputNodes.map((label, i) => (
          <motion.g
            key={`input-${i}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: progress > 0.1 ? 1 : 0, x: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <rect
              x={30}
              y={65 + i * 80}
              width={60}
              height={30}
              rx={6}
              fill="rgba(139, 92, 246, 0.1)"
              stroke="rgba(139, 92, 246, 0.5)"
              strokeWidth={1}
            />
            <text
              x={60}
              y={80 + i * 80}
              dominantBaseline="middle"
              textAnchor="middle"
              fill="rgba(139, 92, 246, 1)"
              fontSize={10}
              fontWeight={500}
            >
              {label}
            </text>
          </motion.g>
        ))}

        {/* Hidden Layer Nodes */}
        {hiddenNodes.map((_, i) => (
          <motion.circle
            key={`hidden-${i}`}
            cx={250}
            cy={50 + i * 55}
            r={12}
            fill={
              progress > 0.5 + i * 0.05
                ? "rgba(139, 92, 246, 0.8)"
                : "rgba(139, 92, 246, 0.2)"
            }
            stroke="rgba(139, 92, 246, 0.5)"
            strokeWidth={1}
            initial={{ scale: 0 }}
            animate={{ scale: progress > 0.25 ? 1 : 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          />
        ))}

        {/* Output Nodes */}
        {outputNodes.map((label, i) => {
          const isActive = progress > 0.8 && i === 0; // "Buy" is active
          return (
            <motion.g
              key={`output-${i}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: progress > 0.7 ? 1 : 0, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <rect
                x={410}
                y={105 + i * 80}
                width={50}
                height={30}
                rx={6}
                fill={
                  isActive
                    ? "rgba(34, 197, 94, 0.2)"
                    : "rgba(139, 92, 246, 0.1)"
                }
                stroke={
                  isActive
                    ? "rgba(34, 197, 94, 0.8)"
                    : "rgba(139, 92, 246, 0.5)"
                }
                strokeWidth={isActive ? 2 : 1}
              />
              <text
                x={435}
                y={120 + i * 80}
                dominantBaseline="middle"
                textAnchor="middle"
                fill={
                  isActive ? "rgba(34, 197, 94, 1)" : "rgba(139, 92, 246, 1)"
                }
                fontSize={10}
                fontWeight={isActive ? 700 : 500}
              >
                {label}
              </text>
            </motion.g>
          );
        })}
      </svg>

      {/* Epoch Counter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: progress > 0.5 ? 1 : 0 }}
        className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2"
      >
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Epoch
        </div>
        <div className="text-lg font-mono font-bold text-violet-400">
          {Math.floor(progress * 100)}/100
        </div>
      </motion.div>

      {/* Accuracy Metric */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: progress > 0.8 ? 1 : 0 }}
        className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm border border-green-500/30 rounded-lg px-3 py-2"
      >
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Accuracy
        </div>
        <div className="text-lg font-mono font-bold text-green-400">78.5%</div>
      </motion.div>
    </div>
  );
};

export const AILabSection: React.FC<AILabSectionProps> = ({ translations }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: false, margin: "-20%" });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const progress = useTransform(scrollYProgress, [0.15, 0.45], [0, 1]);
  const [progressValue, setProgressValue] = React.useState(0);

  React.useEffect(() => {
    return progress.on("change", (v) => setProgressValue(v));
  }, [progress]);

  const highlightIcons = [Target, Zap, Sparkles];

  return (
    <section
      id="section-ailab"
      ref={containerRef}
      className="scroll-mt-[160px] relative flex items-center py-24 px-6 md:px-12 overflow-hidden"
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/5 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1"
          >
            {/* Badge */}
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 border border-violet-200 text-violet-600 dark:bg-violet-500/10 dark:border-violet-500/30 dark:text-violet-400 text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles className="w-3 h-3" />
              {translations.badge}
            </div>

            {/* Title */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
              {translations.title}
            </h2>

            {/* Description */}
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              {formatText(
                translations.description,
                "text-violet-600 dark:text-violet-400"
              )}
            </p>

            {/* Highlights */}
            <div className="space-y-4 mb-10">
              {translations.highlights.map((highlight, index) => {
                const Icon = highlightIcons[index] || Brain;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-violet-400" />
                    </div>
                    <span className="text-foreground font-medium">
                      {highlight}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* CTA */}
            <Link href="/ai-lab/new">
              <Button
                size="lg"
                variant="implement"
                className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-xl shadow-violet-500/20"
              >
                <Brain className="w-5 h-5" />
                {translations.cta}
              </Button>
            </Link>
          </motion.div>

          {/* Visual Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="order-1 lg:order-2"
          >
            <div className="relative rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden shadow-2xl shadow-violet-500/10">
              <NeuralNetworkVisual progress={progressValue} />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AILabSection;
