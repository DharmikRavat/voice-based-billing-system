import React from 'react';
import { AlignLeft, Mic } from 'lucide-react';

export default function TranscriptPanel({ transcript }) {
  if (!transcript) {
    return (
      <div className="bg-slate-800/40 rounded-3xl border border-slate-700/50 p-6 flex flex-col h-full items-center justify-center text-center text-slate-500">
        <AlignLeft size={48} className="mb-4 opacity-20" />
        <p className="font-medium">Voice Transcript</p>
        <p className="text-sm mt-2 max-w-xs">What you say will appear here after you speak into the mic.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/40 rounded-3xl border border-slate-700/50 p-6 flex flex-col h-full shadow-xl">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Mic size={16} />
        Last Voice Input
      </h3>
      <div className="bg-slate-900/50 rounded-2xl border border-slate-700/40 p-4">
        <p className="text-slate-200 text-base italic leading-relaxed font-medium">"{transcript}"</p>
      </div>
      <p className="text-xs text-slate-500 mt-3">Matched against the live menu and added to cart automatically.</p>
    </div>
  );
}
