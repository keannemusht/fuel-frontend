'use client';

import React from 'react';
import { StorageTank } from '@/types';
import { Database, Fuel } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface TankGaugeProps {
  tanks: StorageTank[];
  selectedTankId: string;
  onSelectTank: (id: string) => void;
  title?: string;
  icon?: React.ReactNode;
}

export default function TankGauge({
  tanks,
  selectedTankId,
  onSelectTank,
  title,
  icon,
}: TankGaugeProps) {
  const { lang } = useLanguage();
  const effectiveTitle = title || (lang === 'id' ? 'Sumber Tangki Penyimpanan BBM' : 'Source Fuel Storage Tank');

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-600 dark:text-[#888888] flex items-center space-x-1.5">
          {icon || <Database className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
          <span>{effectiveTitle}</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tanks.map((tank) => {
          const isSelected = tank.id === selectedTankId;
          const percentage = Math.round((tank.currentStockLiters / tank.capacityLiters) * 100);
          const isLow = tank.currentStockLiters <= tank.minStockAlertLiters;

          return (
            <div
              key={tank.id}
              onClick={() => onSelectTank(tank.id)}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'bg-slate-100/70 dark:bg-slate-800/60 border-slate-400 dark:border-slate-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white tracking-tight">
                    {tank.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {tank.tankCode} • {tank.fuelType}
                  </p>
                </div>
                <div
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold transition-colors border flex items-center space-x-1 ${
                    isLow || percentage <= 15
                      ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                      : percentage <= 30
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                      : isSelected
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent shadow-xs'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
                  }`}
                >
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                  <span>{percentage}%</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden my-2.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isLow || percentage <= 15
                      ? 'bg-rose-500'
                      : percentage <= 30
                      ? 'bg-amber-500'
                      : 'bg-slate-900 dark:bg-slate-200'
                  } ${!isSelected ? 'opacity-30' : 'opacity-100'}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <span>{lang === 'id' ? 'Stok Tersedia' : 'Available Fuel'}</span>
                <span className="text-slate-900 dark:text-white font-medium">
                  {formatNumber(tank.currentStockLiters, 0)} / {formatNumber(tank.capacityLiters, 0)} L
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
