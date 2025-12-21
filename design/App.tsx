import React from 'react';
import { HeroSection } from './components/HeroSection';
import { FeaturesSection } from './components/FeaturesSection';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

const App: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-zinc-950 font-sans overflow-x-hidden selection:bg-emerald-500/20 selection:text-emerald-200">
      {/* Background Grid & Ambient Light */}
      <div className="fixed inset-0 z-0 h-full w-full bg-zinc-950 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]">
        <div className="absolute left-0 right-0 top-[-10%] h-[1000px] w-[1000px] rounded-full bg-[radial-gradient(circle_400px_at_50%_300px,#10b98115,transparent)]"></div>
        <div className="absolute top-0 right-0 z-[-1] h-screen w-screen bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]"></div>
      </div>

      <Navbar />
      
      <main className="relative z-10">
        <HeroSection />
        <FeaturesSection />
        
        {/* CTA Section */}
        <section className="relative py-32 px-6 md:px-12 max-w-7xl mx-auto text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-900/50 pointer-events-none" />
          <div className="relative z-10">
             <h2 className="text-4xl md:text-5xl font-bold mb-8 tracking-tight text-white">
              Ready to deploy your <span className="text-emerald-400">alpha</span>?
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto mb-10 text-lg leading-relaxed">
              Join thousands of quantitative traders building the future of finance without writing a single line of code. Start backtesting today.
            </p>
            <button className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-md bg-white px-8 font-medium text-black transition-all duration-300 hover:bg-zinc-200 hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
              <span className="mr-2">Start Building Free</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default App;