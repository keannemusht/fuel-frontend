'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Unit } from '@/types';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getUnitVisualConfig } from '@/lib/unitVisuals';

interface SearchableFleetSelectProps {
  units: Unit[];
  selectedUnitId: string;
  onSelectUnit: (unitId: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchableFleetSelect({
  units,
  selectedUnitId,
  onSelectUnit,
  placeholder = '-- Pilih Unit Fleet Target --',
  className = '',
}: SearchableFleetSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Auto focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const selectedUnit = units.find((u) => u.id === selectedUnitId) || null;

  const filteredUnits = useMemo(() => {
    const nonFleetSet = new Set(['PENGISIAN', 'PLANT', 'MUARA PAHU', 'SALDO AWAL']);
    const fleetOnly = units.filter((u) => !nonFleetSet.has(u.unitCode.toUpperCase().trim()));
    if (!search.trim()) return fleetOnly;
    const term = search.toLowerCase();
    return fleetOnly.filter(
      (u) =>
        u.unitCode.toLowerCase().includes(term) ||
        ((u as any).type && (u as any).type.toLowerCase().includes(term)) ||
        (u.makeModel && u.makeModel.toLowerCase().includes(term)) ||
        (u.plateNumber && u.plateNumber.toLowerCase().includes(term)) ||
        u.category.toLowerCase().includes(term)
    );
  }, [units, search]);

  const getCategoryColor = (_cat: string) => {
    return 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border-slate-200/90 dark:border-white/[0.08]';
  };

  return (
    <div className={`relative ${isOpen ? 'z-40' : 'z-10'} ${className}`} ref={containerRef}>
      {/* Trigger Container */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl border text-left transition-all shadow-sm cursor-pointer select-none ${
          isOpen
            ? 'bg-slate-50 dark:bg-[#141414] border-cyan-500/50 dark:border-cyan-400/40 ring-1 ring-cyan-500/20'
            : selectedUnit
            ? 'bg-slate-50 dark:bg-[#141414] border-cyan-500/30 dark:border-cyan-400/20 hover:border-slate-300 dark:hover:border-white/20'
            : 'bg-slate-50 dark:bg-[#141414] border-slate-200 dark:border-white/[0.1] hover:border-slate-300 dark:hover:border-white/20'
        }`}
      >
        {selectedUnit ? (
          (() => {
            const visual = getUnitVisualConfig(selectedUnit.unitCode, selectedUnit.category);
            const SelectedIcon = visual.Icon;
            return (
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${visual.containerClass}`}>
                  <SelectedIcon className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      {selectedUnit.unitCode}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border ${getCategoryColor(
                        selectedUnit.category
                      )}`}
                    >
                      {selectedUnit.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-[#888] font-mono truncate">
                    {(selectedUnit as any).type || selectedUnit.makeModel || selectedUnit.plateNumber || 'Fleet Unit'} • Last KM: {formatNumber(selectedUnit.lastKm, 1)} • Last HM: {formatNumber(selectedUnit.lastHm, 1)}
                  </p>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="flex items-center space-x-2.5 text-slate-400 dark:text-[#777] text-xs">
            <Search className={`w-3.5 h-3.5 ${isOpen ? 'text-cyan-500' : ''}`} />
            <span>{placeholder}</span>
          </div>
        )}

        <div className="flex items-center space-x-1.5 shrink-0 ml-2">
          {selectedUnit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectUnit('');
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-cyan-500' : 'text-slate-400'
            }`}
          />
        </div>
      </div>

      {/* Popover Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 right-0 mt-2 p-2.5 rounded-2xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/[0.12] shadow-2xl backdrop-blur-xl"
          >
            {/* Search Input inside popover */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kode unit, kategori, atau tipe mesin..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
              />
            </div>

            {/* Header info */}
            <div className="px-2 py-1 mb-1.5 flex items-center justify-between text-[10px] text-slate-400 dark:text-[#777] border-b border-slate-100 dark:border-white/[0.06]">
              <span>Daftar Unit Fleet:</span>
              <span className="font-mono">{filteredUnits.length} Tersedia</span>
            </div>

            {/* Units List */}
            <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
              {filteredUnits.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Tidak ada unit yang cocok dengan &quot;{search}&quot;
                </div>
              ) : (
                filteredUnits.map((u) => {
                  const isCurrent = u.id === selectedUnitId;
                  const visual = getUnitVisualConfig(u.unitCode, u.category);
                  const UnitIcon = visual.Icon;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        onSelectUnit(u.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all ${
                        isCurrent
                          ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 font-semibold'
                          : 'hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-transparent text-slate-800 dark:text-white/80'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${visual.containerClass}`}>
                          <UnitIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                              {u.unitCode}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold border ${getCategoryColor(
                                u.category
                              )}`}
                            >
                              {u.category}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">
                            {(u as any).type || u.makeModel || u.plateNumber || 'Fleet Vehicle'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 ml-2">
                        <div className="text-right">
                          <div className="text-[9px] font-mono text-slate-500 dark:text-[#888]">
                            KM: {formatNumber(u.lastKm, 1)}
                          </div>
                          <div className="text-[9px] font-mono text-slate-500 dark:text-[#888]">
                            HM: {formatNumber(u.lastHm, 1)}
                          </div>
                        </div>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-cyan-500 shrink-0 ml-1" />}
                      </div>
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
