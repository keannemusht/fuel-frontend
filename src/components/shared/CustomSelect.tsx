'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CustomSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeColor?: 'amber' | 'cyan' | 'indigo' | 'emerald' | 'rose' | 'purple' | 'slate';
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Pilih opsi...',
  icon,
  disabled = false,
  className = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const getBadgeStyle = (color?: string) => {
    switch (color) {
      case 'amber':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'indigo':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'rose':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'purple':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'cyan':
      default:
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
    }
  };

  return (
    <div className={`relative ${isOpen ? 'z-40' : 'z-10'} ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl border text-left transition-all shadow-sm ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.08]'
            : isOpen
            ? 'bg-slate-50 dark:bg-[#141414] border-cyan-500/50 dark:border-cyan-400/40 ring-1 ring-cyan-500/20'
            : selectedOption
            ? 'bg-slate-50 dark:bg-[#141414] border-cyan-500/30 dark:border-cyan-400/20 hover:border-slate-300 dark:hover:border-white/20'
            : 'bg-slate-50 dark:bg-[#141414] border-slate-200 dark:border-white/[0.1] hover:border-slate-300 dark:hover:border-white/20'
        }`}
      >
        <div className="flex items-center space-x-2.5 truncate min-w-0">
          {/* Leading Icon */}
          {selectedOption?.icon ? (
            <div className="shrink-0">{selectedOption.icon}</div>
          ) : icon ? (
            <div className={`shrink-0 transition-colors ${isOpen || selectedOption ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-[#666]'}`}>
              {icon}
            </div>
          ) : null}

          {/* Label & Details */}
          {selectedOption ? (
            <div className="flex items-center space-x-2 truncate">
              <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {selectedOption.label}
              </span>
              {selectedOption.sublabel && (
                <span className="text-[10px] text-slate-400 dark:text-[#777] font-mono truncate hidden sm:inline">
                  {selectedOption.sublabel}
                </span>
              )}
              {selectedOption.badge && (
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold border shrink-0 ${getBadgeStyle(
                    selectedOption.badgeColor
                  )}`}
                >
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-400 dark:text-[#666] truncate">{placeholder}</span>
          )}
        </div>

        {/* Dropdown Chevron */}
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 ml-2 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-cyan-500' : 'text-slate-400'
          }`}
        />
      </button>

      {/* Popover Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 right-0 mt-2 p-2 rounded-2xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/[0.12] shadow-2xl backdrop-blur-xl space-y-1"
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-all ${
                    isSelected
                      ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 font-semibold'
                      : 'hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-transparent text-slate-800 dark:text-white/80'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    {/* Option leading icon/badge */}
                    {option.icon ? (
                      <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                        {option.icon}
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-lg bg-slate-200/70 dark:bg-white/10 flex items-center justify-center font-mono font-bold text-[10px] text-slate-700 dark:text-white shrink-0">
                        {option.label.charAt(0)}
                      </div>
                    )}

                    <div className="truncate">
                      <div className="flex items-center space-x-1.5">
                        <span className="truncate">{option.label}</span>
                        {option.badge && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold border shrink-0 ${getBadgeStyle(
                              option.badgeColor
                            )}`}
                          >
                            {option.badge}
                          </span>
                        )}
                      </div>
                      {option.sublabel && (
                        <p className="text-[10px] text-slate-400 dark:text-[#777] font-mono truncate">
                          {option.sublabel}
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && <Check className="w-3.5 h-3.5 text-cyan-500 shrink-0 ml-1.5" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
