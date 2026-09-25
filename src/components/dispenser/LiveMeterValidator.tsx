'use client';

import React from 'react';
import { Unit } from '@/types';
import { CheckCircle2, AlertTriangle, XCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveMeterValidatorProps {
  unit: Unit | null;
  currentKm: number | null;
  currentHm: number | null;
  bypassValidation: boolean;
  onToggleBypass: (enabled: boolean) => void;
  bypassReason: string;
  onChangeBypassReason: (reason: string) => void;
  isAdmin: boolean;
}

export default function LiveMeterValidator({
  unit,
  currentKm,
  currentHm,
  bypassValidation,
  onToggleBypass,
  bypassReason,
  onChangeBypassReason,
  isAdmin,
}: LiveMeterValidatorProps) {
  if (!unit) {
    return (
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0D0D0D] border border-dashed border-slate-200 dark:border-white/[0.08] text-center text-slate-500 dark:text-[#888888] text-xs">
        Select a fleet unit above to activate live meter validation telemetry.
      </div>
    );
  }

  const lastKm = unit.lastKm || 0;
  const lastHm = unit.lastHm || 0;

  // KM Validation
  const isKmProvided = currentKm !== null && !isNaN(currentKm);
  const isKmNegative = isKmProvided && currentKm < 0;
  const deltaKm = isKmProvided ? parseFloat((currentKm - lastKm).toFixed(2)) : 0;
  const isKmDecreasing = isKmProvided && !isKmNegative && (lastKm > 0 ? currentKm < lastKm : false);
  const isKmExceeded = isKmProvided && !isKmNegative && deltaKm > 1000;
  const isKmValid = isKmProvided && !isKmNegative && !isKmDecreasing && !isKmExceeded;

  // HM Validation (Current HM must strictly increase if lastHm > 0; cannot be negative if lastHm === 0)
  const isHmProvided = currentHm !== null && !isNaN(currentHm);
  const isHmNegative = isHmProvided && currentHm < 0;
  const deltaHm = isHmProvided ? parseFloat((currentHm - lastHm).toFixed(2)) : 0;
  const isHmDecreasing = isHmProvided && !isHmNegative && (
    lastHm > 0 ? currentHm <= lastHm : false
  );
  const isHmExceeded = isHmProvided && !isHmNegative && deltaHm > 24;
  const isHmValid = isHmProvided && !isHmNegative && !isHmDecreasing;

  return (
    <div className="space-y-3">
      {/* Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Odometer Card */}
        <div
          className={`p-4 rounded-2xl border transition-all duration-300 ${
            !isKmProvided
              ? 'bg-slate-50 dark:bg-[#0D0D0D] border-slate-200 dark:border-white/[0.08]'
              : isKmNegative
              ? 'bg-rose-50/80 dark:bg-[#180A0A] border-rose-300 dark:border-rose-500/40 shadow-sm'
              : isKmValid
              ? 'bg-emerald-50/80 dark:bg-[#0D140E] border-emerald-300 dark:border-emerald-500/30'
              : bypassValidation
              ? 'bg-amber-50/80 dark:bg-[#17130A] border-amber-300 dark:border-amber-500/30'
              : 'bg-rose-50/80 dark:bg-[#180A0A] border-rose-300 dark:border-rose-500/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#888888] tracking-wide">
              Odometer (KM)
            </span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-[#888888]">
              Prev: <strong className="text-slate-900 dark:text-white font-medium">{formatNumber(lastKm, 1)}</strong>
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className={`font-mono text-xl font-bold tracking-tight ${
              isKmNegative ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
            }`}>
              {isKmProvided ? formatNumber(currentKm, 1) : '--'} <span className="text-xs font-normal text-slate-500 dark:text-[#888888]">KM</span>
            </div>

            {isKmProvided && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                  isKmNegative
                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                    : isKmValid
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                    : bypassValidation
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                }`}
              >
                {deltaKm >= 0 ? `+${formatNumber(deltaKm, 1)}` : formatNumber(deltaKm, 1)} KM
              </span>
            )}
          </div>

          {/* Feedback */}
          {isKmProvided && (
            <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-white/[0.06] text-[11px]">
              {isKmNegative && (
                <span className="text-rose-600 dark:text-rose-400 flex items-center space-x-1 font-medium">
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Rule Violation: Nilai KM tidak boleh negatif (&lt; 0)</span>
                </span>
              )}
              {isKmDecreasing && !isKmNegative && (
                <span className="text-rose-600 dark:text-rose-400 flex items-center space-x-1 font-medium">
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Rule 1 Violation: KM turun ({formatNumber(deltaKm, 1)} KM dari {formatNumber(lastKm, 1)} KM)</span>
                </span>
              )}
              {isKmExceeded && !isKmNegative && (
                <span className="text-rose-600 dark:text-rose-400 flex items-center space-x-1 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Rule 1 Violation: Melebihi batas toleransi 1.000 KM per shift</span>
                </span>
              )}
              {isKmValid && (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Valid Odometer Delta (+{formatNumber(deltaKm, 1)} KM)</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Hour Meter Card */}
        <div
          className={`p-4 rounded-2xl border transition-all duration-300 ${
            !isHmProvided
              ? 'bg-slate-50 dark:bg-[#0D0D0D] border-slate-200 dark:border-white/[0.08]'
              : isHmNegative
              ? 'bg-rose-50/80 dark:bg-[#180A0A] border-rose-300 dark:border-rose-500/40 shadow-sm'
              : isHmValid
              ? 'bg-emerald-50/80 dark:bg-[#0D140E] border-emerald-300 dark:border-emerald-500/30'
              : bypassValidation
              ? 'bg-amber-50/80 dark:bg-[#17130A] border-amber-300 dark:border-amber-500/30'
              : 'bg-rose-50/80 dark:bg-[#180A0A] border-rose-300 dark:border-rose-500/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#888888] tracking-wide">
              Hour Meter (HM)
            </span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-[#888888]">
              Prev: <strong className="text-slate-900 dark:text-white font-medium">{formatNumber(lastHm, 1)}</strong>
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className={`font-mono text-xl font-bold tracking-tight ${
              isHmNegative ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
            }`}>
              {isHmProvided ? formatNumber(currentHm, 1) : '--'} <span className="text-xs font-normal text-slate-500 dark:text-[#888888]">HRS</span>
            </div>

            {isHmProvided && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                  isHmNegative
                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                    : isHmValid
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                    : bypassValidation
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                }`}
              >
                {deltaHm >= 0 ? `+${formatNumber(deltaHm, 1)}` : formatNumber(deltaHm, 1)} HRS
              </span>
            )}
          </div>

          {/* Feedback */}
          {isHmProvided && (
            <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-white/[0.06] text-[11px]">
              {isHmNegative && (
                <span className="text-rose-600 dark:text-rose-400 flex items-center space-x-1 font-medium">
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Rule Violation: Hour Meter (HM) tidak boleh bernilai negatif (&lt; 0)</span>
                </span>
              )}
              {isHmDecreasing && !isHmNegative && (
                <span className="text-rose-600 dark:text-rose-400 flex items-center space-x-1 font-medium">
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {currentHm === lastHm
                      ? `Rule 2: HM (${formatNumber(currentHm, 1)}) tidak boleh sama dengan HM sebelumnya (${formatNumber(lastHm, 1)})`
                      : `Rule 2: HM (${formatNumber(currentHm, 1)}) tidak boleh lebih kecil dari HM sebelumnya (${formatNumber(lastHm, 1)})`}
                  </span>
                </span>
              )}
              {isHmExceeded && !isHmDecreasing && !isHmNegative && (
                <span className="text-amber-600 dark:text-amber-400 flex items-center space-x-1 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Info: Delta HM (+{formatNumber(deltaHm, 1)} HRS) melewati 24 jam</span>
                </span>
              )}
              {isHmValid && !isHmExceeded && (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {lastHm === 0 && currentHm === 0
                      ? 'HM Baseline 0.0 HRS (Standby/Unit berbasis KM)'
                      : `Valid Hour Meter Delta (+${formatNumber(deltaHm, 1)} HRS)`}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Admin Bypass Controls */}
      {isAdmin && (
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0D0D0D] border border-slate-200 dark:border-white/[0.08]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Admin Validation Bypass
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={bypassValidation}
                onChange={(e) => onToggleBypass(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-300 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <AnimatePresence>
            {bypassValidation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-1.5 pt-2.5 border-t border-slate-200 dark:border-white/[0.06]"
              >
                <label className="text-[11px] font-medium text-slate-500 dark:text-[#888888]">
                  Override Justification (Audit Logged):
                </label>
                <input
                  type="text"
                  value={bypassReason}
                  onChange={(e) => onChangeBypassReason(e.target.value)}
                  placeholder="e.g. Replaced faulty mechanical gauge with certified new cluster..."
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/[0.12] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#555] focus:outline-none focus:border-slate-400 dark:focus:border-white/40 shadow-sm"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
