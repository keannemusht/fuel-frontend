'use client';

import React from 'react';
import { Delete } from 'lucide-react';

interface GloveKeypadProps {
  onKeyPress: (val: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  onQuickAdd: (liters: number) => void;
}

export default function GloveKeypad({
  onKeyPress,
  onClear,
  onBackspace,
  onQuickAdd,
}: GloveKeypadProps) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'];

  return (
    <div className="p-4 rounded-3xl bg-white dark:bg-[#0D0D0D] border border-slate-200 dark:border-white/[0.08] shadow-md dark:shadow-2xl space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/[0.06]">
        <span className="text-xs font-semibold text-slate-900 dark:text-white tracking-wide">
          Tactile Numeric Pad
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#888888] border border-slate-200 dark:border-white/[0.08]">
          Touch Mode
        </span>
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-4 gap-2">
        {[50, 100, 200, 500].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onQuickAdd(preset)}
            className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-900 active:text-white dark:bg-white/[0.04] dark:hover:bg-white/[0.1] dark:active:bg-white dark:active:text-black font-mono text-xs font-semibold text-slate-800 dark:text-white border border-slate-200 dark:border-white/[0.08] transition-all shadow-sm"
          >
            +{preset}L
          </button>
        ))}
      </div>

      {/* Numeric Keys */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onKeyPress(k)}
            className="h-13 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-[#141414] dark:hover:bg-[#202020] active:scale-95 text-slate-900 dark:text-white font-mono text-lg font-semibold border border-slate-200 dark:border-white/[0.08] transition-all flex items-center justify-center shadow-sm"
          >
            {k}
          </button>
        ))}

        <button
          type="button"
          onClick={onBackspace}
          className="h-13 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 active:scale-95 transition-all flex items-center justify-center"
          title="Backspace"
        >
          <Delete className="w-4 h-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={onClear}
        className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-[#888888] dark:hover:text-white transition-colors border border-slate-200 dark:border-transparent"
      >
        Clear Input
      </button>
    </div>
  );
}
