import React, { useState, useEffect } from "react";
import { Menu, X, Cpu, ChevronRight } from "lucide-react";

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b ${
        scrolled
          ? "glass-nav border-white/5 py-3"
          : "bg-transparent border-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer group">
          <div className="w-8 h-8 bg-gradient-to-tr from-white to-zinc-400 rounded-lg flex items-center justify-center text-black shadow-lg shadow-white/10 group-hover:shadow-white/20 transition-all">
            <Cpu size={18} strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold tracking-tight text-white group-hover:text-zinc-200 transition-colors">QuantLogic</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {["Platform", "Pricing", "Documentation", "Marketplace"].map((item) => (
            <a 
              key={item} 
              href={`#${item.toLowerCase()}`} 
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors relative group"
            >
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-emerald-500 transition-all group-hover:w-full"></span>
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <button className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
            Log in
          </button>
          <button className="text-xs font-semibold bg-white/10 border border-white/10 text-white px-4 py-2 rounded-full hover:bg-white/20 transition-all backdrop-blur-sm flex items-center gap-1">
            Get Started <ChevronRight size={14} />
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-zinc-300 hover:text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-zinc-950 border-b border-zinc-800 p-6 flex flex-col gap-4 animate-in slide-in-from-top-5">
          <a href="#" className="text-zinc-300 hover:text-white text-lg font-medium">Platform</a>
          <a href="#" className="text-zinc-300 hover:text-white text-lg font-medium">Pricing</a>
          <a href="#" className="text-zinc-300 hover:text-white text-lg font-medium">Docs</a>
          <hr className="border-zinc-800" />
          <button className="w-full py-3 border border-zinc-800 rounded-lg text-white hover:bg-zinc-900 transition-colors">Log in</button>
          <button className="w-full py-3 bg-white text-black rounded-lg font-bold hover:bg-zinc-200 transition-colors">Get Started</button>
        </div>
      )}
    </header>
  );
};