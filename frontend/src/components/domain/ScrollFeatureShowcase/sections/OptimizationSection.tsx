"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Cpu, Brain, TrendingUp, Settings2 } from "lucide-react";
import { formatText } from "../utils/formatText";

interface OptimizationSectionProps {
  translations: {
    badge: string;
    title: string;
    description: string;
    highlights: string[];
    cta: string;
  };
}

// Parameter Space Visualization
const ParameterSpaceVisual: React.FC<{ progress: number }> = ({ progress }) => {
  // Generate random sample points for visualization
  const points = React.useMemo(() => {
    const samples: { x: number; y: number; score: number; trial: number }[] =
      [];
    for (let i = 0; i < 30; i++) {
      samples.push({
        x: 20 + Math.random() * 260,
        y: 20 + Math.random() * 180,
        score: 0.5 + Math.random() * 0.5,
        trial: i,
      });
    }
    // Add optimal point
    samples.push({ x: 180, y: 70, score: 1, trial: 30 });
    return samples;
  }, []);

  const visiblePoints = Math.floor(progress * points.length);
  const bestPoint = points[points.length - 1];

  return (
    <div className="relative w-full h-full min-h-[400px] p-6">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:20px_20px] rounded-xl" />

      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-violet-500/5 rounded-xl" />

      <svg className="w-full h-full" viewBox="0 0 300 220">
        {/* Contour Lines (simplified) */}
        <motion.ellipse
          cx={180}
          cy={70}
          rx={100}
          ry={80}
          fill="none"
          stroke="rgba(139, 92, 246, 0.1)"
          strokeWidth={1}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progress > 0.2 ? 1 : 0 }}
        />
        <motion.ellipse
          cx={180}
          cy={70}
          rx={70}
          ry={55}
          fill="none"
          stroke="rgba(139, 92, 246, 0.2)"
          strokeWidth={1}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progress > 0.3 ? 1 : 0 }}
        />
        <motion.ellipse
          cx={180}
          cy={70}
          rx={40}
          ry={30}
          fill="none"
          stroke="rgba(139, 92, 246, 0.3)"
          strokeWidth={1}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progress > 0.4 ? 1 : 0 }}
        />
        <motion.ellipse
          cx={180}
          cy={70}
          rx={15}
          ry={12}
          fill="rgba(139, 92, 246, 0.2)"
          stroke="rgba(139, 92, 246, 0.5)"
          strokeWidth={1}
          initial={{ scale: 0 }}
          animate={{ scale: progress > 0.5 ? 1 : 0 }}
        />

        {/* Sample Points */}
        {points.slice(0, visiblePoints).map((point, i) => (
          <motion.circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={i === points.length - 1 ? 8 : 4}
            fill={
              i === points.length - 1
                ? "rgba(34, 197, 94, 0.8)"
                : `rgba(139, 92, 246, ${0.3 + point.score * 0.5})`
            }
            stroke={
              i === points.length - 1
                ? "rgba(34, 197, 94, 1)"
                : "rgba(139, 92, 246, 0.5)"
            }
            strokeWidth={i === points.length - 1 ? 2 : 1}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        ))}

        {/* Axis Labels */}
        <text
          x={150}
          y={215}
          fill="rgba(255,255,255,0.5)"
          fontSize={10}
          textAnchor="middle"
        >
          Learning Rate
        </text>
        <text
          x={10}
          y={110}
          fill="rgba(255,255,255,0.5)"
          fontSize={10}
          textAnchor="middle"
          transform="rotate(-90, 10, 110)"
        >
          Hidden Size
        </text>
      </svg>

      {/* Metrics Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: progress > 0.3 ? 1 : 0,
          y: progress > 0.3 ? 0 : 20,
        }}
        className="absolute bottom-4 left-4 right-4 flex justify-between gap-4"
      >
        {/* Trial Counter */}
        <div className="bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2 flex-1">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Trials
          </div>
          <div className="text-lg font-mono font-bold text-foreground flex items-center gap-1">
            <span className="text-violet-400">
              {Math.min(visiblePoints, 30)}
            </span>
            <span className="text-muted-foreground">/30</span>
          </div>
          {/* Progress Bar */}
          <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-violet-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(visiblePoints / 30, 1) * 100}%` }}
            />
          </div>
        </div>

        {/* Best Score */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: progress > 0.7 ? 1 : 0 }}
          className="bg-background/80 backdrop-blur-sm border border-green-500/30 rounded-lg px-3 py-2 flex-1"
        >
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Best Sharpe
          </div>
          <div className="text-lg font-mono font-bold text-green-400">3.82</div>
          <div className="text-[9px] text-green-400/70 mt-0.5">
            ↑ Optimal Found
          </div>
        </motion.div>
      </motion.div>

      {/* TPE Engine Label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: progress > 0.1 ? 1 : 0 }}
        className="absolute top-4 right-4 flex items-center gap-2"
      >
        <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
        <span className="text-xs text-violet-400 font-mono">TPE Engine</span>
      </motion.div>
    </div>
  );
};

export const OptimizationSection: React.FC<OptimizationSectionProps> = ({
  translations,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: false, margin: "-20%" });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const progress = useTransform(scrollYProgress, [0.15, 0.45], [0, 1]);
  const [progressValue, setProgressValue] = useState(0);

  useEffect(() => {
    return progress.on("change", (v) => setProgressValue(v));
  }, [progress]);

  const highlightIcons = [Brain, TrendingUp, Settings2];

  return (
    <section
      id="section-optimization"
      ref={containerRef}
      className="scroll-mt-[30px] relative min-h-screen flex items-center py-24 px-6 md:px-12 overflow-hidden"
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent pointer-events-none" />

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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold uppercase tracking-wider mb-6">
              <Cpu className="w-3 h-3" />
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
              {translations.highlights.map((highlight, index) => {
                const Icon = highlightIcons[index];
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-orange-400" />
                    </div>
                    <span className="text-foreground font-medium">
                      {highlight}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* CTA */}
            <Link href="/optimization">
              <Button size="lg" className="gap-2">
                <Cpu className="w-5 h-5" />
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
            <div className="relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden shadow-2xl">
              <ParameterSpaceVisual progress={progressValue} />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default OptimizationSection;
