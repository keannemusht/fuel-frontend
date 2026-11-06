'use client';

import React from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useSite } from '@/components/providers/SiteProvider';
import { useShiftSummary, useTanks, useUnits } from '@/hooks/useFuelData';
import { formatNumber } from '@/lib/utils';
import { Database, Fuel, Activity, Droplet, Truck } from 'lucide-react';

export default function DashboardMetricsGrid() {
  const { t, lang } = useLanguage();
  const { site: selectedSite } = useSite();

  const { data: summary } = useShiftSummary(undefined, undefined, selectedSite);
  const { data: tanks = [] } = useTanks();
  const { data: units = [] } = useUnits();

  // Filter tanks based on active jobsite
  const filteredTanks = tanks.filter((t) => {
    if (selectedSite === 'ALL') return true;
    return (t.site || 'SENYIUR') === selectedSite;
  });

  // Fleet breakdown calculations
  const totalStock = filteredTanks.reduce((acc, t) => acc + (t.currentStockLiters || 0), 0);
  const totalCapacity = filteredTanks.reduce((acc, t) => acc + (t.capacityLiters || 0), 0);
  const stockPercentage = totalCapacity > 0 ? (totalStock / totalCapacity) * 100 : 0;

  const activeUnitsCount = units.filter((u) => u.isActive).length;
  const dumpTrucksCount = units.filter(
    (u) => u.category === 'DUMP_TRUCK' || u.unitCode.startsWith('DT')
  ).length;
  const supportVehiclesCount = units.length - dumpTrucksCount;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* Metric 1: Total Stok Tangki */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/[0.08] shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-500 dark:text-[#777]">
              {t('dash.totalStock', 'Stok Tangki Utama')}
            </span>
            <Database className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-1.5 flex items-baseline space-x-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white truncate">
              {formatNumber(totalStock, 0)}
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-[#888]">L</span>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.04]">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-[#888] mb-1">
            <span>
              {stockPercentage.toFixed(1)}% {t('dash.capacityLabel', 'Kapasitas')}
            </span>
            <span>/ {formatNumber(totalCapacity, 0)} L</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                stockPercentage > 25 ? 'bg-slate-900 dark:bg-white' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, stockPercentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Metric 2: Solar Keluar Hari Ini */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/[0.08] shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-500 dark:text-[#777]">
              {t('dash.totalDispensedToday', 'Solar Keluar (Hari Ini)')}
            </span>
            <Fuel className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-1.5 flex items-baseline space-x-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white truncate">
              {formatNumber(summary?.totalDispensedLiters || 0, 1)}
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-[#888]">L</span>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.04] text-[11px] text-slate-500 dark:text-[#888] flex items-center justify-between font-mono">
          <span>{t('dash.shiftActive', 'Shift 1 & 2 Aktif')}</span>
          <span className="text-slate-400 dark:text-[#666]">WITA</span>
        </div>
      </div>

      {/* Metric 3: Total Transaksi Pengisian */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/[0.08] shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-500 dark:text-[#777]">
              {t('dash.totalTransactions', 'Transaksi Dispenser')}
            </span>
            <Activity className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-1.5 flex items-baseline space-x-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white truncate">
              {summary?.totalTransactions || 0}
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-[#888]">
              {t('dash.tickets', 'Tiket')}
            </span>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.04] text-[11px] text-slate-500 dark:text-[#888] font-mono">
          <span>51.088 {t('dash.totalRecords', 'Total Data Site')}</span>
        </div>
      </div>

      {/* Metric 4: BBM Masuk (Inbound Refill) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/[0.08] shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-500 dark:text-[#777]">
              {t('dash.inboundRefills', 'BBM Masuk (Supplier)')}
            </span>
            <Droplet className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-1.5 flex items-baseline space-x-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white truncate">
              {formatNumber(summary?.totalFuelInLiters || 0, 1)}
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-[#888]">L</span>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.04] text-[11px] text-slate-500 dark:text-[#888] font-mono">
          <span>Solar B35 Industrial</span>
        </div>
      </div>

      {/* Metric 5: Kesiapan Armada */}
      <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/[0.08] shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-500 dark:text-[#777]">
              {t('dash.activeFleet', 'Armada Beroperasi')}
            </span>
            <Truck className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-1.5 flex items-baseline space-x-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white truncate">
              {activeUnitsCount}
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-[#888]">
              / {units.length} {lang === 'id' ? 'Unit' : 'Units'}
            </span>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.04] text-[11px] text-slate-500 dark:text-[#888] font-mono">
          <span>DT: {dumpTrucksCount} | Support: {supportVehiclesCount}</span>
        </div>
      </div>
    </div>
  );
}

