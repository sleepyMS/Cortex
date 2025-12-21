import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { 
  Cpu, 
  Workflow, 
  Zap, 
  Globe, 
  ShieldCheck, 
  Code2,
  Lock,
  LineChart
} from "lucide-react";
import clsx from "clsx";

interface BentoCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

const SpotlightCard: React.FC<BentoCardProps> = ({ title, description, icon, className = "", children }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;

    const div = divRef.current;
    const rect = div.getBoundingClientRect();

    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleFocus}
      onMouseLeave={handleBlur}
      className={clsx(
        "relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 transition-colors duration-300 group",
        className
      )}
    >
      {/* Spotlight Effect Layer */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.06), transparent 40%)`,
        }}
      />
      {/* Spotlight Border */}
      <div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(16, 185, 129, 0.4), transparent 40%)`,
          maskImage: "linear-gradient(black, black) content-box, linear-gradient(black, black)",
          WebkitMaskImage: "linear-gradient(black, black) content-box, linear-gradient(black, black)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
        }}
      />
      
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 group-hover:text-emerald-400 group-hover:scale-110 transition-all duration-300 shadow-lg">
          {icon}
        </div>
        
        {children && <div className="mb-6 flex-1 w-full">{children}</div>}
        
        <div>
          <h3 className="mb-2 text-xl font-semibold text-zinc-100 group-hover:text-white transition-colors">{title}</h3>
          <p className="text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">{description}</p>
        </div>
      </div>
    </div>
  );
};

export const FeaturesSection: React.FC = () => {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 md:px-12" id="platform">
      <div className="mb-20 md:text-center max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl mb-6">
          A Complete Quantitative Stack
        </h2>
        <p className="text-lg text-zinc-400 leading-relaxed">
          From idea to execution in minutes. Our platform provides the infrastructure hedge funds spend millions building, accessible to everyone.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8 lg:grid-rows-2 h-auto md:h-[850px]">
        {/* Large Feature - Visual Logic */}
        <SpotlightCard
          title="Visual Strategy Builder"
          description="Drag, drop, and connect logic blocks to create complex trading algorithms. Supports advanced math, technical indicators, and custom logic."
          icon={<Workflow />}
          className="md:col-span-2 md:row-span-2"
        >
          <div className="relative h-full min-h-[250px] w-full overflow-hidden rounded-xl border border-zinc-800 bg-[#0c0c0e] p-4 shadow-inner">
             <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_14px]"></div>
             
             {/* Animated Elements */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md h-40">
                {/* Floating Blocks */}
                <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-0 left-0 bg-zinc-900 border border-zinc-700 p-3 rounded-lg shadow-xl z-20 flex items-center gap-3"
                >
                    <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center text-blue-400"><Code2 size={16}/></div>
                    <div className="space-y-1">
                        <div className="h-2 w-16 bg-zinc-700 rounded"></div>
                        <div className="h-1.5 w-10 bg-zinc-800 rounded"></div>
                    </div>
                </motion.div>

                <motion.div 
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-0 right-10 bg-zinc-900 border border-emerald-500/30 p-3 rounded-lg shadow-xl z-20 flex items-center gap-3"
                >
                    <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400"><LineChart size={16}/></div>
                    <div className="space-y-1">
                        <div className="h-2 w-20 bg-zinc-700 rounded"></div>
                        <div className="h-1.5 w-12 bg-zinc-800 rounded"></div>
                    </div>
                </motion.div>
                
                {/* Connection Line */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    <path d="M50 40 Q 150 100, 280 120" stroke="#3f3f46" strokeWidth="2" fill="none" strokeDasharray="4 4" />
                </svg>
             </div>
          </div>
        </SpotlightCard>

        {/* Small Feature - Backtesting */}
        <SpotlightCard
          title="Tick-Level Backtesting"
          description="Test your strategies against 5 years of historical data in milliseconds with 99.9% accuracy."
          icon={<Zap />}
          className="md:col-span-1 md:row-span-1"
        >
             <div className="h-28 w-full relative overflow-hidden rounded-lg bg-zinc-900/50 border border-zinc-800 flex items-end justify-between px-2 pb-0 pt-8 gap-1">
                 {[40, 70, 45, 90, 60, 85, 75, 95, 60].map((h, i) => (
                     <motion.div 
                        key={i}
                        initial={{ height: 10 }}
                        whileInView={{ height: `${h}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1, ease: "backOut" }}
                        className="flex-1 bg-emerald-500/80 rounded-t-sm hover:bg-emerald-400 transition-colors"
                     />
                 ))}
            </div>
        </SpotlightCard>

        {/* Small Feature - AI Optimization */}
        <SpotlightCard
          title="AI Parameter Optimization"
          description="Let our ML models find the perfect settings to maximize Sharpe ratio and minimize drawdown."
          icon={<Cpu />}
          className="md:col-span-1 md:row-span-1"
        />

        {/* Wide Feature - Connectivity */}
        <SpotlightCard
          title="Universal Exchange Connectivity"
          description="Deploy to Binance, Bybit, Coinbase, and 10+ other exchanges via API keys. Non-custodial and secure."
          icon={<Globe />}
          className="md:col-span-3 lg:col-span-1"
        >
             <div className="flex gap-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-500 mt-4">
                <div className="h-10 w-10 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center text-[10px] text-yellow-500 font-bold">BNB</div>
                <div className="h-10 w-10 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-[10px] text-blue-500 font-bold">CB</div>
                <div className="h-10 w-10 rounded-full bg-zinc-500/20 border border-zinc-500/50 flex items-center justify-center text-[10px] text-zinc-500 font-bold">BYB</div>
                <div className="h-10 w-10 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-[10px] text-purple-500 font-bold">KRN</div>
             </div>
        </SpotlightCard>

        {/* Wide Feature - Security */}
         <SpotlightCard
          title="Enterprise Grade Security"
          description="Your strategies run in isolated sandboxes. API keys are encrypted using AES-256."
          icon={<ShieldCheck />}
          className="md:col-span-3 lg:col-span-2"
        >
             <div className="mt-4 flex items-center space-x-2 font-mono text-xs text-emerald-400 bg-emerald-500/10 w-fit px-3 py-1.5 rounded-full border border-emerald-500/20">
                <Lock className="w-3 h-3" />
                <span>Audited by Certik & Trail of Bits</span>
             </div>
        </SpotlightCard>
      </div>
    </section>
  );
};