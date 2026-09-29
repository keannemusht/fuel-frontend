'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ChevronDown, User, Check, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchableOperatorSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

// Clean messy names (e.g. ",MARKUS", "  BUDI - ", etc.)
const sanitizeOperatorName = (raw: string): string => {
  return raw.replace(/^[\s,.\-_/'"]+/, '').replace(/[\s,.\-_/'"]+$/, '').trim();
};

// Extract clean initial letter
const getInitialLetter = (name: string): string => {
  const clean = sanitizeOperatorName(name);
  const match = clean.match(/[A-Za-z0-9]/);
  return match ? match[0].toUpperCase() : 'O';
};

export default function SearchableOperatorSelect({
  value,
  onChange,
  placeholder = 'Cari atau ketik nama operator...',
  required = false,
  className = '',
}: SearchableOperatorSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch unique operators from API
  const { data: serverOperators = [] } = useQuery<string[]>({
    queryKey: ['operators'],
    queryFn: async () => {
      try {
        const res = await api.get('/fuel/operators');
        return res.data.data || [];
      } catch (e) {
        return [];
      }
    },
  });

  // Default suggestions if database is fresh
  const defaultSuggestions = useMemo(
    () => [
      'Joko Widodo',
      'Budi Santoso',
      'Agus Setiawan',
      'Bambang Pamungkas',
      'Rudi Hartono',
      'Hendra Wijaya',
      'Ahmad Yani',
      'Eko Prasetyo',
    ],
    []
  );

  // Combined and sanitized operator list
  const allOperators = useMemo(() => {
    const set = new Set<string>();
    serverOperators.forEach((op) => {
      const clean = sanitizeOperatorName(op || '');
      if (clean && clean !== '-' && clean.length > 1) {
        set.add(clean);
      }
    });
    defaultSuggestions.forEach((op) => {
      const clean = sanitizeOperatorName(op);
      if (clean) set.add(clean);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [serverOperators, defaultSuggestions]);

  // Filtered operators
  const filteredOperators = useMemo(() => {
    if (!search.trim()) return allOperators;
    const term = sanitizeOperatorName(search).toLowerCase();
    return allOperators.filter((op) => op.toLowerCase().includes(term));
  }, [allOperators, search]);

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

  const handleSelect = (op: string) => {
    const clean = sanitizeOperatorName(op);
    onChange(clean);
    setSearch('');
    setIsOpen(false);
  };

  const cleanSearch = sanitizeOperatorName(search);
  const isExactMatch = allOperators.some(
    (op) => op.toLowerCase() === cleanSearch.toLowerCase()
  );

  return (
    <div className={`relative ${isOpen ? 'z-40' : 'z-10'} ${className}`} ref={containerRef}>
      {/* Input container with dual functionality: text typing + dropdown toggle */}
      <div className="relative flex items-center">
        <User
          className={`w-3.5 h-3.5 absolute left-3.5 pointer-events-none transition-colors ${
            isOpen || value ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-[#666]'
          }`}
        />

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setSearch(value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          required={required}
          className={`w-full text-xs font-medium pl-9 pr-14 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#141414] border text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#555] focus:outline-none shadow-sm transition-all ${
            isOpen
              ? 'border-cyan-500/50 dark:border-cyan-400/40 ring-1 ring-cyan-500/20'
              : value
              ? 'border-cyan-500/30 dark:border-cyan-400/20 hover:border-slate-300 dark:hover:border-white/20'
              : 'border-slate-200 dark:border-white/[0.1] hover:border-slate-300 dark:hover:border-white/20'
          }`}
        />

        <div className="absolute right-2.5 flex items-center space-x-1">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setSearch('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
              title="Clear operator"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen((prev) => !prev);
              if (!isOpen) inputRef.current?.focus();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-cyan-500' : 'text-slate-400'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown Suggestions Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 right-0 mt-2 p-2.5 rounded-2xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/[0.12] shadow-2xl backdrop-blur-xl"
          >
            {/* Header info */}
            <div className="px-2 py-1 mb-1.5 flex items-center justify-between text-[10px] text-slate-400 dark:text-[#777] border-b border-slate-100 dark:border-white/[0.06]">
              <span>Daftar Operator / Driver:</span>
              <span className="font-mono">{filteredOperators.length} Tersedia</span>
            </div>

            {/* If user typed a new name that isn't in the list */}
            {cleanSearch && !isExactMatch && (
              <button
                type="button"
                onClick={() => handleSelect(cleanSearch)}
                className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl text-left text-xs bg-cyan-500/10 hover:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-semibold mb-1 border border-cyan-500/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 shrink-0 text-cyan-500" />
                <span className="truncate">Gunakan operator baru: &quot;{cleanSearch}&quot;</span>
              </button>
            )}

            {/* Operators List */}
            <div className="max-h-52 overflow-y-auto space-y-0.5 pr-1">
              {filteredOperators.length === 0 && !cleanSearch ? (
                <div className="p-3 text-center text-xs text-slate-400">
                  Belum ada daftar operator
                </div>
              ) : (
                filteredOperators.map((op) => {
                  const isSelected = value.trim().toLowerCase() === op.toLowerCase();
                  return (
                    <button
                      key={op}
                      type="button"
                      onClick={() => handleSelect(op)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-all ${
                        isSelected
                          ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 font-semibold'
                          : 'hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-transparent text-slate-800 dark:text-white/80'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200 dark:border-white/[0.08]">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate">{op}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-500 shrink-0 ml-1.5" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
