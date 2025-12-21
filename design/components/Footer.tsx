import React from 'react';
import { Cpu } from 'lucide-react';

export const Footer: React.FC = () => {
    return (
        <footer className="bg-zinc-950 pt-20 pb-10 px-6 md:px-12 border-t border-zinc-900 relative z-10">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                <div className="col-span-1 md:col-span-1">
                     <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 bg-white rounded flex items-center justify-center text-black">
                            <Cpu size={14} strokeWidth={2.5} />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-white">QuantLogic</span>
                    </div>
                    <p className="text-zinc-500 text-sm leading-relaxed mb-6">
                        Empowering traders with professional-grade tools to build, test, and automate profitable strategies.
                    </p>
                    <div className="flex gap-4">
                        {/* Social Icons Placeholder */}
                        <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 hover:bg-white hover:text-black transition-colors cursor-pointer">𝕏</div>
                        <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 hover:bg-white hover:text-black transition-colors cursor-pointer">in</div>
                        <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 hover:bg-white hover:text-black transition-colors cursor-pointer">Dc</div>
                    </div>
                </div>

                <div>
                    <h4 className="font-bold text-white mb-6">Platform</h4>
                    <ul className="space-y-4 text-sm text-zinc-500">
                        <li><a href="#" className="hover:text-emerald-400 transition-colors">Visual Editor</a></li>
                        <li><a href="#" className="hover:text-emerald-400 transition-colors">Backtesting Engine</a></li>
                        <li><a href="#" className="hover:text-emerald-400 transition-colors">Paper Trading</a></li>
                        <li><a href="#" className="hover:text-emerald-400 transition-colors">AI Optimization</a></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-white mb-6">Resources</h4>
                    <ul className="space-y-4 text-sm text-zinc-500">
                        <li><a href="#" className="hover:text-emerald-400 transition-colors">Documentation</a></li>
                        <li><a href="#" className="hover:text-emerald-400 transition-colors">API Reference</a></li>
                        <li><a href="#" className="hover:text-emerald-400 transition-colors">Community Strategies</a></li>
                        <li><a href="#" className="hover:text-emerald-400 transition-colors">Blog</a></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-white mb-6">Company</h4>
                    <ul className="space-y-4 text-sm text-zinc-500">
                        <li><a href="#" className="hover:text-emerald-400 transition-colors">About Us</a></li>
                        <li><a href="#" className="hover:text-emerald-400 transition-colors">Careers</a></li>
                        <li><a href="#" className="hover:text-emerald-400 transition-colors">Legal</a></li>
                        <li><a href="#" className="hover:text-emerald-400 transition-colors">Contact</a></li>
                    </ul>
                </div>
            </div>

            <div className="max-w-7xl mx-auto border-t border-zinc-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-zinc-600 text-xs">
                    &copy; 2024 QuantLogic Inc. All rights reserved.
                </div>
                <div className="flex gap-6">
                    <a href="#" className="text-zinc-600 hover:text-white text-xs transition-colors">Privacy Policy</a>
                    <a href="#" className="text-zinc-600 hover:text-white text-xs transition-colors">Terms of Service</a>
                </div>
            </div>
        </footer>
    )
}