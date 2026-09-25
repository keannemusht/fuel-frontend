'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../providers/ThemeProvider';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
      aria-label={isDark ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
      className={`relative inline-flex items-center justify-center p-2 rounded-full transition-all duration-300 active:scale-95 shadow-sm group ${
        isDark
          ? 'bg-white/10 hover:bg-white/15 text-amber-400 border border-white/15'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
      } ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {mounted ? (
          isDark ? (
            <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20 stroke-[2.2px] transition-transform duration-500 rotate-0 scale-100 group-hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-slate-800 fill-slate-800/15 stroke-[2.2px] transition-transform duration-500 rotate-0 scale-100 group-hover:-rotate-12" />
          )
        ) : (
          <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-white/20 animate-pulse" />
        )}
      </div>

      {showLabel && mounted && (
        <span className="ml-2 text-xs font-semibold font-mono uppercase tracking-wider text-slate-800 dark:text-white">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
}
