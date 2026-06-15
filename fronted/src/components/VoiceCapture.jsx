import React from 'react';
import { Mic, Square, RefreshCw, WifiOff, Globe } from 'lucide-react';

/** Language options shown in the selector */
const LANG_OPTIONS = [
  { code: 'en-IN', label: 'EN',    title: 'English (India)' },
  { code: 'hi-IN', label: 'हिं',   title: 'Hindi' },
  { code: 'hinglish', label: 'HG', title: 'Hinglish (EN + Hindi mix)' },
];

/**
 * VoiceCapture — Production UI for the continuous voice engine.
 *
 * States:  idle | listening | reconnecting | error
 * Shows language selector to switch between English / Hindi / Hinglish.
 * Language changes hot-restart the recognition engine instantly.
 */
export default function VoiceCapture({
  isRecording,
  interimText,
  duration,
  status,
  error,
  lang,
  onLangChange,
  onStart,
  onStop,
}) {
  const isReconnecting = status === 'reconnecting';
  const isError        = status === 'error';

  const formatDuration = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const accentColor =
    isError        ? 'via-red-500/60'    :
    isReconnecting ? 'via-amber-500/60'  :
    isRecording    ? 'via-emerald-500/50':
                     'via-indigo-500/50';

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-800/40 rounded-3xl border border-slate-700/50 shadow-xl overflow-hidden relative">
      {/* Top accent bar — colour reflects state */}
      <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent to-transparent ${accentColor}`} />

      {/* Language selector */}
      <div className="flex items-center gap-1 self-end mb-4">
        <Globe size={12} className="text-slate-500" />
        {LANG_OPTIONS.map(opt => (
          <button
            key={opt.code}
            title={opt.title}
            onClick={() => onLangChange?.(opt.code)}
            disabled={isError}
            className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
              lang === opt.code
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-700/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Mic / Stop button */}
      <div className="relative mb-5">
        {isRecording && !isReconnecting && (
          <>
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping blur-md" />
            <div className="absolute -inset-4 border border-emerald-500/30 rounded-full animate-pulse" />
            <div className="absolute -inset-8 border border-emerald-500/10 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
          </>
        )}
        {isReconnecting && (
          <div className="absolute -inset-4 border border-amber-500/40 rounded-full animate-pulse" />
        )}

        <button
          onClick={isRecording ? onStop : onStart}
          disabled={isError}
          className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
            isError
              ? 'bg-red-900/50 border-2 border-red-500/40 cursor-not-allowed'
              : isReconnecting
                ? 'bg-amber-500/80 shadow-amber-500/30'
                : isRecording
                  ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/40 scale-105'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30 hover:scale-105'
          }`}
        >
          {isError       ? <WifiOff   size={44} className="text-red-400" /> :
           isReconnecting? <RefreshCw  size={44} className="text-white animate-spin" /> :
           isRecording   ? <Square    size={42} className="text-white fill-current" /> :
                           <Mic       size={48} className="text-white" />}
        </button>
      </div>

      {/* Status text */}
      <div className="text-center w-full px-2 space-y-2">
        <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">
          {isError ? (
            <span className="text-red-400">Mic Unavailable</span>
          ) : isReconnecting ? (
            <span className="flex items-center justify-center gap-2 text-amber-300">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse inline-block" />
              Reconnecting…
            </span>
          ) : isRecording ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse inline-block" />
              Listening — Speak to Order
            </span>
          ) : 'Tap Mic to Start'}
        </h2>

        {/* Error block */}
        {isError && error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <p className="text-red-400 text-xs leading-relaxed">{error}</p>
            <button
              onClick={onStart}
              className="mt-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Soft error (network/audio warnings while still running) */}
        {!isError && error && (
          <p className="text-amber-400 text-xs font-medium">{error}</p>
        )}

        {/* Live interim text */}
        {isRecording && !isReconnecting && (
          <div className="min-h-[3rem] bg-slate-900/60 rounded-xl px-4 py-2 border border-emerald-500/20">
            {interimText ? (
              <p className="text-emerald-300 text-sm italic leading-relaxed animate-pulse">
                "{interimText}…"
              </p>
            ) : (
              <p className="text-slate-500 text-xs">
                {lang === 'hi-IN'
                  ? 'बोलें — जैसे "दो बटर नान"'
                  : lang === 'hinglish'
                    ? 'Boliye — e.g. "ek butter naan chahiye"'
                    : 'Say an item — e.g. "2 butter naan"'}
              </p>
            )}
          </div>
        )}

        {/* Reconnecting hint */}
        {isReconnecting && (
          <p className="text-amber-400/70 text-xs">Auto-restarting…</p>
        )}

        {/* Idle hint — shows language-aware example */}
        {!isRecording && !isError && (
          <p className="text-slate-500 text-xs max-w-[260px] leading-relaxed mx-auto">
            Mic stays on <strong className="text-slate-400">indefinitely</strong>.
            {lang === 'hi-IN'    ? ' Hindi में बोलें।' :
             lang === 'hinglish' ? ' Mix Hindi & English freely.' :
                                   ' Stops only when you tap Stop.'}
          </p>
        )}

        {/* Elapsed timer */}
        {isRecording && (
          <p className={`font-mono text-xs tracking-widest ${isReconnecting ? 'text-amber-400/60' : 'text-emerald-500/70'}`}>
            {formatDuration(duration)}
          </p>
        )}
      </div>
    </div>
  );
}
