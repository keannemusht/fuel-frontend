'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useSite } from '@/components/providers/SiteProvider';
import { useTanks } from '@/hooks/useFuelData';
import { formatNumber } from '@/lib/utils';
import { ArrowRight, Database, Truck } from 'lucide-react';

export default function StorageTanksSection() {
  const { t } = useLanguage();
  const { site: selectedSite, siteLabel } = useSite();
  const { data: tanks = [] } = useTanks();

  // Filter tanks by selected Jobsite
  const filteredTanks = tanks.filter((tank) => {
    if (selectedSite === 'ALL') return true;
    return (tank.site || 'SENYIUR') === selectedSite;
  });

  return (
    <div className="lg:col-span-7 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
            <span>{t('dash.storageTanksTitle', 'Status Tangki Penyimpanan')}</span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.08]">
              {siteLabel}
            </span>
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-[#777] mt-0.5">
            {t('dash.storageTanksSubtitle', 'Kapasitas terukur, batas sounding, dan ruang sisa pengisian')}
          </p>
        </div>
        <Link
          href="/tanks"
          className="text-xs font-semibold text-slate-700 dark:text-white hover:underline flex items-center space-x-1 shrink-0 self-start sm:self-auto"
        >
          <span>{t('dash.viewAll', 'Kelola Tangki')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Tanks Detail Card */}
      {filteredTanks.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 rounded-xl bg-slate-50/50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 p-4">
          <Database className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-white/20" />
          <p>Belum ada tangki terdaftar untuk {siteLabel}.</p>
          <Link href="/tanks" className="text-blue-600 dark:text-blue-400 font-semibold underline mt-1 inline-block">
            Buka menu Tangki untuk menambahkan
          </Link>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredTanks.map((tank) => {
            const percent =
              tank.capacityLiters > 0
                ? (tank.currentStockLiters / tank.capacityLiters) * 100
                : 0;
            const isAlert = tank.currentStockLiters <= tank.minStockAlertLiters;
            const isLow = isAlert || percent <= 15;
            const ullage = Math.max(0, tank.capacityLiters - tank.currentStockLiters);
            const isMuaraPahu = tank.site === 'MUARA_PAHU';

            return (
              <div
                key={tank.id}
                className="p-3.5 sm:p-4 rounded-xl bg-slate-50/70 dark:bg-[#111] border border-slate-200/80 dark:border-white/[0.06] space-y-3"
              >
                {/* Tank Code & Status Chip - Responsive Wrap */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-white/10">
                        {tank.tankCode}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                        {tank.name}
                      </span>
                      {tank.tankType === 'MOBILE_TRUCK' || tank.tankCode.includes('FT') ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 whitespace-nowrap flex items-center gap-1">
                          <Truck className="w-2.5 h-2.5" />
                          <span>Fuel Truck</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 whitespace-nowrap flex items-center gap-1">
                          <Database className="w-2.5 h-2.5" />
                          <span>Stationary</span>
                        </span>
                      )}
                      {tank.slocCode && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 whitespace-nowrap">
                          Sloc: {tank.slocCode}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-[#777] block mt-1">
                      {tank.fuelType}
                    </span>
                  </div>

                  <div className="shrink-0 self-start sm:self-auto">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold border whitespace-nowrap shadow-2xs transition-colors ${
                        isLow
                          ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                          : percent <= 30
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {percent.toFixed(1)}% {t('dash.filled', 'Terisi')}
                    </span>
                  </div>
                </div>

                {/* Progress Bar with Scale Marks */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-200/80 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isLow
                          ? 'bg-rose-500'
                          : percent <= 30
                          ? 'bg-amber-500'
                          : 'bg-emerald-500 dark:bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>0 L</span>
                    <span>{formatNumber(tank.capacityLiters / 2, 0)} L</span>
                    <span>{formatNumber(tank.capacityLiters, 0)} L</span>
                  </div>
                </div>

                {/* Technical Parameter Grid - Seamless 2-col on mobile, 4-col on desktop */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.04]">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-[#161616] border border-slate-200/60 dark:border-white/[0.06] shadow-2xs">
                    <span className="block text-[9px] font-mono uppercase text-slate-400 dark:text-[#777] truncate">
                      {t('dash.actualStock', 'Stok Aktual')}
                    </span>
                    <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white mt-0.5 block truncate">
                      {formatNumber(tank.currentStockLiters, 0)} L
                    </span>
                  </div>

                  <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-[#161616] border border-slate-200/60 dark:border-white/[0.06] shadow-2xs">
                    <span className="block text-[9px] font-mono uppercase text-slate-400 dark:text-[#777] truncate">
                      {t('dash.maxCapacity', 'Kapasitas Penuh')}
                    </span>
                    <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white mt-0.5 block truncate">
                      {formatNumber(tank.capacityLiters, 0)} L
                    </span>
                  </div>

                  <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-[#161616] border border-slate-200/60 dark:border-white/[0.06] shadow-2xs">
                    <span className="block text-[9px] font-mono uppercase text-slate-400 dark:text-[#777] truncate">
                      {t('dash.remainingUllage', 'Sisa Ruang')}
                    </span>
                    <span className="font-mono font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-0.5 block truncate">
                      {formatNumber(ullage, 0)} L
                    </span>
                  </div>

                  <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-[#161616] border border-slate-200/60 dark:border-white/[0.06] shadow-2xs">
                    <span className="block text-[9px] font-mono uppercase text-slate-400 dark:text-[#777] truncate">
                      {t('dash.criticalLimit', 'Batas Alert')}
                    </span>
                    <span className="font-mono font-bold text-xs sm:text-sm text-amber-600 dark:text-amber-400 mt-0.5 block truncate">
                      {formatNumber(tank.minStockAlertLiters, 0)} L
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

