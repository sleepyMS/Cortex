import React from 'react';
import { ContainerScroll } from './ui/container-scroll-animation';
import { Activity, BarChart2, GitBranch, Play, Settings, Wallet, Search, Bell, Menu, Layout, ChevronDown, MoreHorizontal, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const mockData = [
  { name: '09:00', val: 102400 },
  { name: '10:00', val: 103398 },
  { name: '11:00', val: 104800 },
  { name: '12:00', val: 103908 },
  { name: '13:00', val: 104800 },
  { name: '14:00', val: 105800 },
  { name: '15:00', val: 106300 },
  { name: '16:00', val: 105800 },
  { name: '17:00', val: 107000 },
  { name: '18:00', val: 108500 },
  { name: '19:00', val: 109200 },
  { name: '20:00', val: 112400 },
];

export const HeroSection: React.FC = () => {
  return (
    <div className="flex flex-col overflow-hidden">
      <ContainerScroll
        titleComponent={
          <>
            <div className="flex items-center justify-center space-x-2 mb-6 animate-fade-in-up">
                <span className="px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] md:text-xs font-mono uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    QuantLogic 2.0
                </span>
            </div>
            <h1 className="text-5xl md:text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/20 pb-4 tracking-tight">
              Algorithmic Trading <br />
              <span className="text-4xl md:text-[6rem] font-bold mt-2 leading-none text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
                Democratized.
              </span>
            </h1>
            <p className="max-w-xl mx-auto text-zinc-400 mt-6 text-lg md:text-xl font-light leading-relaxed">
                The first professional-grade visual strategy builder. <br className="hidden md:block"/> Connect logic blocks, backtest on tick data, and deploy to the cloud.
            </p>
          </>
        }
      >
        {/* Mock UI: Professional Trading Terminal */}
        <div className="w-full h-full flex flex-col bg-[#0c0c0e] text-zinc-300 font-sans text-xs select-none">
            
            {/* App Header */}
            <div className="h-10 border-b border-zinc-800 flex items-center px-4 justify-between bg-[#0c0c0e]">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-pointer">
                        <Menu size={14} />
                    </div>
                    <div className="h-4 w-[1px] bg-zinc-800"></div>
                    <div className="flex items-center gap-2 px-2 py-1 bg-zinc-900 rounded border border-zinc-800 text-zinc-300 cursor-pointer hover:bg-zinc-800">
                        <span className="font-medium text-emerald-400">Main Strategy</span>
                        <ChevronDown size={12} className="opacity-50" />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded cursor-pointer hover:bg-emerald-500/20 transition-colors">
                        <Play size={10} fill="currentColor" />
                        <span className="font-bold tracking-wide">DEPLOY</span>
                    </div>
                    <div className="p-1.5 hover:bg-zinc-800 rounded cursor-pointer text-zinc-500">
                        <Bell size={14} />
                    </div>
                    <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-500"></div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Icons */}
                <div className="w-12 border-r border-zinc-800 flex flex-col items-center py-4 gap-4 bg-[#0c0c0e]">
                    {[Layout, GitBranch, Search, BarChart2, Settings].map((Icon, i) => (
                        <div key={i} className={`p-2 rounded-lg cursor-pointer transition-all ${i === 1 ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900'}`}>
                            <Icon size={18} strokeWidth={1.5} />
                        </div>
                    ))}
                </div>

                {/* Secondary Sidebar - Nodes */}
                <div className="w-48 border-r border-zinc-800 bg-[#0c0c0e] flex flex-col hidden lg:flex">
                    <div className="p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800">Logic Blocks</div>
                    <div className="p-2 space-y-1 overflow-y-auto">
                        {['Market Data', 'Technical Indicators', 'Math Operators', 'Order Execution', 'Risk Management', 'Portfolio'].map((cat) => (
                            <div key={cat} className="px-3 py-2 text-zinc-400 hover:bg-zinc-900 hover:text-white rounded cursor-pointer flex items-center justify-between group">
                                {cat}
                                <ChevronDown size={10} className="opacity-0 group-hover:opacity-100" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Canvas Area */}
                <div className="flex-1 flex flex-col bg-[#121214] relative overflow-hidden">
                    
                    {/* Grid Background */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none" 
                         style={{ backgroundImage: 'radial-gradient(#3f3f46 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                    </div>

                    {/* Nodes Container */}
                    <div className="relative w-full h-full p-8">
                        {/* Connecting Lines */}
                        <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible">
                            <path d="M260 120 C 320 120, 320 200, 380 200" stroke="#52525b" strokeWidth="2" fill="none" className="animate-pulse" strokeOpacity="0.5"/>
                            <path d="M260 300 C 320 300, 320 230, 380 230" stroke="#52525b" strokeWidth="2" fill="none" strokeOpacity="0.5" />
                            <path d="M580 215 C 640 215, 640 215, 700 215" stroke="#10b981" strokeWidth="2" fill="none" strokeDasharray="4 4" className="animate-[dash_1s_linear_infinite]" />
                        </svg>

                        {/* Node 1: RSI Source */}
                        <div className="absolute top-20 left-10 w-64 bg-[#18181b] border border-zinc-700 rounded-lg shadow-xl overflow-hidden group hover:border-zinc-500 transition-colors">
                            <div className="px-3 py-2 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
                                <div className="font-bold text-zinc-200 flex items-center gap-2">
                                    <Activity size={12} className="text-blue-400" /> RSI Indicator
                                </div>
                                <MoreHorizontal size={12} className="text-zinc-600" />
                            </div>
                            <div className="p-3 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-500">Period</span>
                                    <span className="bg-zinc-950 px-2 py-0.5 rounded text-blue-300 font-mono">14</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-500">Source</span>
                                    <span className="bg-zinc-950 px-2 py-0.5 rounded text-zinc-300 font-mono">Close</span>
                                </div>
                            </div>
                            <div className="px-3 py-1.5 bg-zinc-900/50 border-t border-zinc-800 flex justify-end">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            </div>
                        </div>

                         {/* Node 2: Price Data */}
                         <div className="absolute top-64 left-10 w-64 bg-[#18181b] border border-zinc-700 rounded-lg shadow-xl overflow-hidden group hover:border-zinc-500 transition-colors">
                            <div className="px-3 py-2 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
                                <div className="font-bold text-zinc-200 flex items-center gap-2">
                                    <BarChart2 size={12} className="text-purple-400" /> Market Data
                                </div>
                                <MoreHorizontal size={12} className="text-zinc-600" />
                            </div>
                            <div className="p-3 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-500">Symbol</span>
                                    <span className="bg-zinc-950 px-2 py-0.5 rounded text-purple-300 font-mono">BTC-USDT</span>
                                </div>
                            </div>
                            <div className="px-3 py-1.5 bg-zinc-900/50 border-t border-zinc-800 flex justify-end">
                                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                            </div>
                        </div>

                        {/* Node 3: Logic */}
                        <div className="absolute top-40 left-[380px] w-52 bg-[#18181b] border border-zinc-700 rounded-lg shadow-xl overflow-hidden group hover:border-zinc-500 transition-colors ring-2 ring-emerald-500/20">
                            <div className="px-3 py-2 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
                                <div className="font-bold text-zinc-200 flex items-center gap-2">
                                    <GitBranch size={12} className="text-orange-400" /> CrossOver Logic
                                </div>
                            </div>
                            <div className="p-3">
                                <div className="text-center text-zinc-500 py-2 font-mono text-[10px]">Processing Signal...</div>
                            </div>
                             <div className="px-3 py-1.5 bg-zinc-900/50 border-t border-zinc-800 flex justify-between">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            </div>
                        </div>

                        {/* Node 4: Execution */}
                        <div className="absolute top-40 left-[700px] w-60 bg-[#18181b] border border-zinc-700 rounded-lg shadow-xl overflow-hidden group hover:border-zinc-500 transition-colors">
                            <div className="px-3 py-2 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
                                <div className="font-bold text-zinc-200 flex items-center gap-2">
                                    <Wallet size={12} className="text-emerald-400" /> Execution
                                </div>
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-700"></div>
                                </div>
                            </div>
                            <div className="p-3 bg-emerald-950/10">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-emerald-400 font-bold">LONG 5x</span>
                                    <span className="text-zinc-500">Limit Order</span>
                                </div>
                                <div className="h-1 w-full bg-zinc-800 rounded overflow-hidden">
                                    <div className="h-full w-[60%] bg-emerald-500"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Analytics */}
                <div className="w-80 border-l border-zinc-800 bg-[#0c0c0e] flex flex-col z-10 hidden xl:flex">
                     <div className="p-3 border-b border-zinc-800 flex justify-between items-center">
                        <span className="font-bold text-zinc-300">Live Simulation</span>
                        <div className="flex items-center gap-1 text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            Active
                        </div>
                     </div>
                     
                     <div className="p-4 flex-1 overflow-hidden flex flex-col">
                        <div className="h-32 w-full mb-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={mockData}>
                                    <defs>
                                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                    <YAxis hide domain={['dataMin', 'dataMax']} />
                                    <Area type="monotone" dataKey="val" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorVal)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-zinc-900 rounded p-2 border border-zinc-800">
                                <div className="text-[10px] text-zinc-500 mb-1">Total PnL</div>
                                <div className="text-lg font-mono text-emerald-400 flex items-center gap-1">
                                    +$12,450 <ArrowUpRight size={14}/>
                                </div>
                            </div>
                             <div className="bg-zinc-900 rounded p-2 border border-zinc-800">
                                <div className="text-[10px] text-zinc-500 mb-1">Win Rate</div>
                                <div className="text-lg font-mono text-white">
                                    68.4%
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                             <div className="text-[10px] uppercase text-zinc-600 font-bold">Recent Trades</div>
                             {[1,2,3].map(i => (
                                 <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b border-zinc-800/50">
                                     <span className="text-emerald-400">LONG BTC</span>
                                     <span className="text-zinc-500 font-mono">14:02:2{i}</span>
                                     <span className="text-white font-mono">+$24{i}.00</span>
                                 </div>
                             ))}
                        </div>
                     </div>
                </div>
            </div>
        </div>
      </ContainerScroll>
    </div>
  );
};