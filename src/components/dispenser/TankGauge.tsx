'use client';

import React from 'react';
import { StorageTank } from '@/types';
import { Database, Fuel } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface TankGaugeProps {
  tanks: StorageTank[];
  selectedTankId: string;
  onSelectTank: (id: string) => void;
}

export default function TankGauge({ tanks, selectedTankId, onSelectTank }: TankGaugeProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-600 dark:text-[#888888] flex items-center space-x-1.5">
          <Database className="w-3.5 h-3.5 text-cyan-500" />
          <span>Source Fuel Storage Tank</span>
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
                  ? 'bg-slate-50 dark:bg-[#141414] border-cyan-500/40 dark:border-cyan-400/40 shadow-sm ring-1 ring-cyan-500/20'
                  : 'bg-white dark:bg-[#0D0D0D] border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.18] hover:bg-slate-50/50 dark:hover:bg-[#111111]'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white tracking-tight">
                    {tank.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-[#777777] font-mono">
                    {tank.tankCode} • {tank.fuelType}
                  </p>
                </div>
                <div
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-colors border ${
                    isLow || percentage <= 15
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      : percentage <= 30
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  <span>{percentage}%</span>
                </div>
              </div>

              {/* Interactive Fuel Level Progress Bar: matches Backdate page */}
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden my-2.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isLow || percentage <= 15
                      ? 'bg-rose-500'
                      : percentage <= 30
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                  } ${!isSelected ? 'opacity-40' : 'opacity-100'}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-[#888888]">
                <span>Available Fuel</span>
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
