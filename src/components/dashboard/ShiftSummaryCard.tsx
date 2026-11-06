'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useUnits } from '@/hooks/useFuelData';
import { ArrowRight } from 'lucide-react';

export default function ShiftSummaryCard() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { data: units = [] } = useUnits();

  const dumpTrucksCount = units.filter(
    (u) => u.category === 'DUMP_TRUCK' || u.unitCode.startsWith('DT')
  ).length;
  const supportVehiclesCount = units.length - dumpTrucksCount;

  return (
    <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {t('dash.shiftSummaryTitle', 'Status Shift & Armada')}
          </h2>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-slate-500 dark:text-[#888]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>WITA Site Live</span>
          </span>
        </div>

        {/* Shift & Duty Officer Telemetry */}
        <div className="mt-3.5 space-y-2.5">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111] border border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                {t('dash.activeShift', 'Shift Operasional')}
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                Shift 1 (06:00 - 18:00 WITA)
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold tracking-wider bg-slate-100 text-slate-800 dark:bg-white/[0.08] dark:text-slate-200 border border-slate-200/90 dark:border-white/10">
              {t('dash.shiftDay', 'Siang')}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#111] border border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                {t('dash.dutyOfficer', 'Petugas Jaga')}
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {user?.fullName || 'Administrator'}
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono tracking-wider ${
                (user?.role || 'ADMIN') === 'ADMIN'
                  ? 'font-bold bg-slate-900 text-white dark:bg-white dark:text-black border border-slate-900 dark:border-white shadow-xs'
                  : 'font-semibold bg-slate-100 text-slate-800 dark:bg-white/[0.08] dark:text-slate-200 border border-slate-200/90 dark:border-white/10'
              }`}
            >
              {user?.role || 'ADMIN'}
            </span>
          </div>
        </div>

        {/* Fleet Composition Breakdown */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-white/[0.06]">
          <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-500 dark:text-[#777] block mb-2">
            {t('dash.fleetDistribution', 'Distribusi Unit Armada Terdaftar')}
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#111] border border-slate-200/60 dark:border-white/[0.04] flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 dark:text-[#888] block">
                Dump Truck (DT)
              </span>
              <span className="text-base font-bold font-mono text-slate-900 dark:text-white block mt-1">
                {dumpTrucksCount} {lang === 'id' ? 'Unit' : 'Units'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#111] border border-slate-200/60 dark:border-white/[0.04] flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 dark:text-[#888] block">Support & LV</span>
              <span className="text-base font-bold font-mono text-slate-900 dark:text-white block mt-1">
                {supportVehiclesCount} {lang === 'id' ? 'Unit' : 'Units'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Direct Operational Links */}
      <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs">
        <Link
          href="/dispenser"
          className="font-medium text-slate-700 dark:text-white hover:underline flex items-center space-x-1"
        >
          <span>{t('nav.dispenser', 'Terminal Dispenser')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <span className="text-slate-300 dark:text-white/20">•</span>
        <Link
          href="/backdate"
          className="font-medium text-slate-700 dark:text-white hover:underline flex items-center space-x-1"
        >
          <span>{t('nav.backdate', 'Input Susulan')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <span className="text-slate-300 dark:text-white/20">•</span>
        <Link
          href="/history"
          className="font-medium text-slate-700 dark:text-white hover:underline flex items-center space-x-1"
        >
          <span>{t('nav.history', 'Histori Bulanan')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

