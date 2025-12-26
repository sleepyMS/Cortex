"use client";

import React from "react";
import { motion } from "framer-motion";

interface StrategySparklineProps {
  data?: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function StrategySparkline({
  data = [10, 15, 12, 18, 25, 22, 30, 45, 40, 50], // Default placeholder data
  color = "#8b5cf6",
  width = 100,
  height = 40,
}: StrategySparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / range) * height;
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(" L ")}`;

  return (
    <div className="relative group/sparkline" style={{ width, height }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Subtle background glow */}
        <motion.path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.15 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="blur-sm"
        />
        {/* Main path */}
        <motion.path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
}
