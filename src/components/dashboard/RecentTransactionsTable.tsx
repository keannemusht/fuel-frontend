'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useSite } from '@/components/providers/SiteProvider';
import { useFuelLogs } from '@/hooks/useFuelData';
import { formatNumber } from '@/lib/utils';
import { FuelLog } from '@/types';
import { Fuel, Search, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function RecentTransactionsTable() {
  const { t, lang } = useLanguage();
  const { site: selectedSite } = useSite();
  const [unitFilter, setUnitFilter] = useState('');

  const { data: logsResponse } = useFuelLogs({ limit: 10, site: selectedSite });
  const recentLogs: FuelLog[] = logsResponse?.fuelLogs || [];

  // Filtered logs based on search input (strictly isolated to this component)
  const filteredLogs = useMemo(() => {
    if (!unitFilter.trim()) return recentLogs;
    const q = unitFilter.toLowerCase();
    return recentLogs.filter(
      (log) =>
        log.unitCode?.toLowerCase().includes(q) ||
        log.operator?.toLowerCase().includes(q) ||
        log.category?.toLowerCase().includes(q)
    );
  }, [recentLogs, unitFilter]);

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('dash.recentLogsTitle', 'Log Transaksi Pengisian Terkini')}
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-[#888]">
              {filteredLogs.length} {lang === 'id' ? 'dari' : 'of'} {recentLogs.length}{' '}
              {t('dash.logsCount', 'Ditampilkan')}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#777] mt-0.5">
            {t('dash.recentLogsSubtitle', 'Audit real-time pengisian unit alat berat')}
          </p>
        </div>

        {/* Quick Filter Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            placeholder={t('dash.filterPlaceholder', 'Filter No Unit (misal: LV, DT, EX)...')}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Compact Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-[#777] font-semibold text-[11px] bg-slate-50/50 dark:bg-white/[0.02]">
              <th className="py-2.5 px-3">NO ID.</th>
              <th className="py-2.5 px-3">{t('dash.dateTime', 'Waktu (WITA)')}</th>
              <th className="py-2.5 px-3">{t('dash.noUnit', 'No Unit')}</th>
              <th className="py-2.5 px-3">{t('dash.category', 'Kategori')}</th>
              <th className="py-2.5 px-3 font-mono">HM Terakhir</th>
              <th className="py-2.5 px-3 font-mono">KM Terakhir</th>
              <th className="py-2.5 px-3 font-mono text-right">{t('dash.volume', 'Volume (L)')}</th>
              <th className="py-2.5 px-3">Shift</th>
              <th className="py-2.5 px-3">{t('dash.operator', 'Operator')}</th>
              <th className="py-2.5 px-3">{t('dash.fuelman', 'Fuelman')}</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Fuel className="w-6 h-6 text-slate-300 dark:text-white/20" />
                    <p className="text-xs">
                      {unitFilter
                        ? lang === 'id'
                          ? `Tidak ada transaksi yang sesuai dengan "${unitFilter}"`
                          : `No transactions matching "${unitFilter}"`
                        : lang === 'id'
                        ? 'Belum ada transaksi pengisian bahan bakar pada shift ini.'
                        : 'No fuel dispensing transactions on this shift yet.'}
                    </p>
                    <Link
                      href="/dispenser"
                      className="text-xs font-semibold text-slate-800 dark:text-white underline mt-1"
                    >
                      {lang === 'id'
                        ? 'Buka Terminal Dispenser untuk input pengisian →'
                        : 'Open Dispenser Terminal to record refuelling →'}
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              filteredLogs.map((log, idx) => (
                <tr
                  key={log.id || idx}
                  className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-2.5 px-3 font-mono text-slate-500 text-[10px] whitespace-nowrap">
                    {log.logNumber && (log.logNumber.startsWith('F-') || log.logNumber.startsWith('R-'))
                      ? log.logNumber
                      : log.no || idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-[#888] whitespace-nowrap">
                    {log.dateStr} <span className="text-slate-400">{log.jamStr}</span>
                  </td>
                  <td className="py-2.5 px-3 font-bold font-mono text-slate-900 dark:text-white whitespace-nowrap">
                    {log.unitCode}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#888]">
                      {log.category || 'ARMADA'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-white">
                    {log.currentHm > 0 ? (
                      <span>{formatNumber(log.currentHm, 1)} HRS</span>
                    ) : (
                      <span className="text-slate-400">&mdash;</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-white">
                    {log.currentKm > 0 ? (
                      <span>{formatNumber(log.currentKm, 1)} KM</span>
                    ) : (
                      <span className="text-slate-400">&mdash;</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-right text-slate-900 dark:text-white whitespace-nowrap">
                    +{formatNumber(log.volumeLiters, 1)} L
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-white">
                      {log.shift}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 dark:text-white/90 truncate max-w-[120px]">
                    {log.operator || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-[#888] truncate max-w-[120px]">
                    {log.fuelmanName || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[9px] font-mono font-medium bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.06]">
                      <span className={`w-1.5 h-1.5 rounded-full ${log.syncStatus === 'SYNCED' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span>{log.syncStatus === 'SYNCED' ? 'Synced' : 'Pending'}</span>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Card Footer: View Full Monthly History Link */}
      <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-[11px] text-slate-400 dark:text-[#666]">
          {lang === 'id'
            ? 'Menampilkan transaksi pengisian terkini pada shift aktif'
            : 'Showing recent dispensing transactions for active shift'}
        </p>
        <Link
          href="/history"
          className="text-xs font-semibold text-slate-700 dark:text-white hover:text-slate-900 dark:hover:text-white/80 hover:underline flex items-center space-x-1.5 transition-colors"
        >
          <span>{t('dash.viewFullHistory', 'Lihat Semua di Histori Bulanan')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

