"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface TechStackShowcaseProps {
  title: string;
}

const techLogos = [
  { name: "Python", icon: "🐍" },
  { name: "FastAPI", icon: "⚡" },
  { name: "PyTorch", icon: "🔥" },
  { name: "Optuna", icon: "🎯" },
  { name: "Next.js", icon: "▲" },
  { name: "TypeScript", icon: "📘" },
  { name: "Docker", icon: "🐳" },
  { name: "PostgreSQL", icon: "🐘" },
];

export const TechStackShowcase: React.FC<TechStackShowcaseProps> = ({
  title,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.6 }}
      className="py-20 px-6 md:px-12"
    >
      <div className="max-w-7xl mx-auto text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-sm text-muted-foreground uppercase tracking-widest mb-8"
        >
          {title}
        </motion.p>

        <div className="flex flex-wrap justify-center gap-6 md:gap-10">
          {techLogos.map((tech, index) => (
            <motion.div
              key={tech.name}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center text-2xl md:text-3xl dark:grayscale dark:group-hover:grayscale-0 transition-all duration-300 group-hover:border-violet-500/50 group-hover:bg-violet-500/10">
                {tech.icon}
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                {tech.name}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default TechStackShowcase;
