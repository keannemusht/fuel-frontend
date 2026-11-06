'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Unit } from '@/types';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getUnitVisualConfig } from '@/lib/unitVisuals';
import { useLanguage } from '@/components/providers/LanguageProvider';

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
  placeholder,
  className = '',
}: SearchableFleetSelectProps) {
  const { lang } = useLanguage();
  const effectivePlaceholder = placeholder || (lang === 'id' ? '-- Pilih Unit Fleet Target --' : '-- Select Target Fleet Unit --');
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
            ? 'bg-slate-50 dark:bg-slate-900 border-slate-400 dark:border-slate-600 ring-1 ring-slate-400/20 dark:ring-slate-600/30'
            : selectedUnit
            ? 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        {selectedUnit ? (
          (() => {
            const visual = getUnitVisualConfig(selectedUnit.unitCode, selectedUnit.category);
            const SelectedIcon = visual.Icon;
            const meterParts: string[] = [];
            if (selectedUnit.hasKm) meterParts.push(`Last KM: ${formatNumber(selectedUnit.lastKm, 1)}`);
            if (selectedUnit.hasHm) meterParts.push(`Last HM: ${formatNumber(selectedUnit.lastHm, 1)}`);
            if (selectedUnit.hasKwh) meterParts.push(`Last KWH: ${formatNumber((selectedUnit as any).lastKwh || 0, 1)}`);
            if (meterParts.length === 0) meterParts.push(lang === 'id' ? 'Pengisian Langsung (Non-Meter)' : 'Direct Volume');

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
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                    {selectedUnit.makeModel || visual.label || (selectedUnit as any).type || 'Fleet Unit'} • {meterParts.join(' • ')}
                  </p>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="flex items-center space-x-2.5 text-slate-400 dark:text-slate-500 text-xs">
            <Search className={`w-3.5 h-3.5 ${isOpen ? 'text-slate-700 dark:text-slate-300' : ''}`} />
            <span>{effectivePlaceholder}</span>
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
              className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              title={lang === 'id' ? 'Hapus pilihan unit' : 'Clear selection'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'
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
            className="absolute z-50 left-0 right-0 mt-2 p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-xl"
          >
            {/* Search Input inside popover */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === 'id' ? 'Cari kode unit, kategori, atau tipe mesin...' : 'Search unit code, category, or model...'}
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
              />
            </div>

            {/* Header info */}
            <div className="px-2 py-1 mb-1.5 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
              <span>{lang === 'id' ? 'Daftar Unit Fleet:' : 'Fleet Units List:'}</span>
              <span className="font-mono">{filteredUnits.length} {lang === 'id' ? 'Tersedia' : 'Available'}</span>
            </div>

            {/* Units List */}
            <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
              {filteredUnits.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  {lang === 'id'
                    ? `Tidak ada unit yang cocok dengan "${search}"`
                    : `No fleet units match "${search}"`}
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
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200'
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
                            {u.makeModel || visual.label || (u as any).type || 'Fleet Vehicle'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 ml-2">
                        <div className="text-right">
                          {u.hasKm && (
                            <div className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
                              KM: {formatNumber(u.lastKm, 1)}
                            </div>
                          )}
                          {u.hasHm && (
                            <div className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
                              HM: {formatNumber(u.lastHm, 1)}
                            </div>
                          )}
                          {u.hasKwh && (
                            <div className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
                              KWH: {formatNumber((u as any).lastKwh || 0, 1)}
                            </div>
                          )}
                          {!u.hasKm && !u.hasHm && !u.hasKwh && (
                            <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500 italic">
                              Non-Meter
                            </div>
                          )}
                        </div>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-slate-900 dark:text-white shrink-0 ml-1" />}
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
