import React from 'react';
import { UtensilsCrossed, CircleDot } from 'lucide-react';

export default function TopBar({ currentTime }) {
  return (
    <header className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400 shadow-inner">
            <UtensilsCrossed size={24} />
          </div>
          <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 tracking-tight">
            VoicePOS
          </h1>
          <div className="ml-4 flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
             <CircleDot size={12} className="text-green-400 animate-pulse" />
             <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Online</span>
          </div>
        </div>
        <div className="text-sm font-medium text-slate-400 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-700/50 shadow-inner">
          {currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          <span className="mx-2 text-slate-600">|</span>
          <span className="text-slate-300">{currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </header>
  );
}
