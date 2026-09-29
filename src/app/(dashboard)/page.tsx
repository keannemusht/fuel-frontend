'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Unit, StorageTank, ShiftSummary, SyncTelemetry, FuelLog } from '@/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import {
  Fuel,
  Truck,
  Droplet,
  FileSpreadsheet,
  Download,
  ExternalLink,
  Activity,
  ArrowRight,
  Database,
  CalendarClock,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import Link from 'next/link';
import { toast } from 'react-toastify';

export default function SummaryDashboardPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [isExporting, setIsExporting] = useState(false);
  const [unitFilter, setUnitFilter] = useState('');

  // 1. Fetch Shift / Day Summary KPIs
  const { data: summary, refetch: refetchSummary, isFetching: isFetchingSummary } = useQuery<ShiftSummary>({
    queryKey: ['shiftSummary'],
    queryFn: async () => {
      const res = await api.get('/fuel/summary');
      return res.data.data;
    },
    refetchInterval: 15000,
  });

  // 2. Fetch Storage Tanks
  const { data: tanks = [], refetch: refetchTanks } = useQuery<StorageTank[]>({
    queryKey: ['tanks'],
    queryFn: async () => {
      const res = await api.get('/tanks');
      return res.data.data;
    },
  });

  // 3. Fetch Units Count & Fleet distribution
  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ['units'],
    queryFn: async () => {
      const res = await api.get('/units');
      return res.data.data;
    },
  });

  // 4. Fetch Sync Telemetry (Google Sheets status)
  const { data: syncData, refetch: refetchSync } = useQuery<SyncTelemetry>({
    queryKey: ['sync-status'],
    queryFn: async () => {
      const res = await api.get('/sync/status');
      return res.data.data;
    },
    refetchInterval: 20000,
  });

  // 5. Fetch Recent Transactions
  const { data: rawLogsData, refetch: refetchLogs } = useQuery<any>({
    queryKey: ['recentFuelLogs'],
    queryFn: async () => {
      const res = await api.get('/fuel/logs?limit=10');
      return res.data.data;
    },
    refetchInterval: 15000,
  });

  // Extract recent logs properly from either direct array or pagination wrapper
  const recentLogs: FuelLog[] = useMemo(() => {
    if (!rawLogsData) return [];
    if (Array.isArray(rawLogsData)) return rawLogsData;
    if (Array.isArray(rawLogsData.fuelLogs)) return rawLogsData.fuelLogs;
    if (Array.isArray(rawLogsData.data)) return rawLogsData.data;
    return [];
  }, [rawLogsData]);

  // Filtered logs based on search input
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

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const res = await api.get('/excel/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const today = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `BATARA_FUEL_SUMMARY_${today}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(lang === 'id' ? 'Laporan ringkasan Excel berhasil diunduh!' : 'Summary Excel report downloaded successfully!');
    } catch (e: any) {
      toast.error(lang === 'id' ? 'Gagal mengunduh laporan Excel.' : 'Failed to download Excel report.');
      console.error('Export error:', e);
    } finally {
      setIsExporting(false);
    }
  };

  // Fleet breakdown calculations
  const totalStock = tanks.reduce((acc, t) => acc + (t.currentStockLiters || 0), 0);
  const totalCapacity = tanks.reduce((acc, t) => acc + (t.capacityLiters || 0), 0);
  const stockPercentage = totalCapacity > 0 ? (totalStock / totalCapacity) * 100 : 0;
  const remainingUllage = Math.max(0, totalCapacity - totalStock);

  const activeUnitsCount = units.filter((u) => u.isActive).length;
  const dumpTrucksCount = units.filter((u) => u.category === 'DUMP_TRUCK' || u.unitCode.startsWith('DT')).length;
  const supportVehiclesCount = units.length - dumpTrucksCount;

  return (
    <div className="space-y-5">
      {/* 1. Industrial Header Bar (Clean, High-Contrast, No Slop) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/[0.08]">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t('dash.title', 'Dashboard Operasional Bahan Bakar')}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t('dash.liveTelemetry', 'Telemetri Aktif')}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#888] mt-1">
            {t('dash.siteName', 'PT Batara Perkasa • Site Kutai Barat')} &mdash; {t('dash.subtitle', 'Monitoring Inventori Solar B35, Konsumsi Armada, & Sinkronisasi Site')}
          </p>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Google Sheets Link Button */}
          {syncData?.spreadsheetUrl ? (
            <a
              href={syncData.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-emerald-500/30 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 dark:hover:bg-emerald-500/20 transition-all cursor-pointer shadow-xs"
              title={t('dash.openSheets', 'Buka Google Sheets')}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{t('header.sheets', 'Google Sheets')}</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          ) : null}

          {/* Export Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-white/15 bg-white dark:bg-[#111] hover:bg-slate-50 dark:hover:bg-[#1A1A1A] text-slate-700 dark:text-white transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500 dark:text-[#888] shrink-0" />
            <span>{isExporting ? 'Exporting...' : t('header.exportExcel', 'Ekspor Excel')}</span>
          </button>

          {/* Primary CTA: Terminal Dispenser */}
          <Link
            href="/dispenser"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-black hover:opacity-90 transition-all shadow-xs cursor-pointer ml-1"
          >
            <Fuel className="w-4 h-4 shrink-0" />
            <span>{t('dash.recordDispense', 'Catat Pengisian (Dispenser)')}</span>
          </Link>
        </div>
      </div>

      {/* 2. Key Metrics Bar (High-Density, Crisp Typography, No Pastel Slop) */}
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
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {formatNumber(totalStock, 0)}
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-[#888]">L</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.04]">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-[#888] mb-1">
              <span>{stockPercentage.toFixed(1)}% {t('dash.capacityLabel', 'Kapasitas')}</span>
              <span>/ {formatNumber(totalCapacity, 0)} L</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  stockPercentage > 25 ? 'bg-emerald-500' : 'bg-rose-500'
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
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
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
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {summary?.totalTransactions || 0}
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-[#888]">{t('dash.tickets', 'Tiket')}</span>
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
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
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
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {activeUnitsCount}
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-[#888]">/ {units.length} {lang === 'id' ? 'Unit' : 'Units'}</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.04] text-[11px] text-slate-500 dark:text-[#888] font-mono">
            <span>DT: {dumpTrucksCount} | Support: {supportVehiclesCount}</span>
          </div>
        </div>
      </div>

      {/* 3. Core Operational Telemetry (2 Column Layout: 7 / 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left (7 cols): Status Tangki Penyimpanan & Inventori */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>{t('dash.storageTanksTitle', 'Status Tangki Penyimpanan')}</span>
                <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-[#888]">
                  Solar B35 Industrial
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-[#777] mt-0.5">
                {t('dash.storageTanksSubtitle', 'Kapasitas terukur, batas sounding, dan ruang sisa pengisian')}
              </p>
            </div>
            <Link
              href="/tanks"
              className="text-xs font-semibold text-slate-700 dark:text-white hover:underline flex items-center space-x-1"
            >
              <span>{t('dash.viewAll', 'Kelola Tangki')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Tanks Detail Card */}
          {tanks.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              {t('dash.loadingTanks', 'Memuat data tangki penyimpanan...')}
            </div>
          ) : (
            <div className="space-y-4">
              {tanks.map((tank) => {
                const percent =
                  tank.capacityLiters > 0
                    ? (tank.currentStockLiters / tank.capacityLiters) * 100
                    : 0;
                const isAlert = tank.currentStockLiters <= tank.minStockAlertLiters;
                const ullage = Math.max(0, tank.capacityLiters - tank.currentStockLiters);

                return (
                  <div
                    key={tank.id}
                    className="p-4 rounded-xl bg-slate-50/70 dark:bg-[#111] border border-slate-200/80 dark:border-white/[0.06] space-y-3.5"
                  >
                    {/* Tank Code & Status Chip */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                            {tank.tankCode}
                          </span>
                          <span className="text-xs text-slate-600 dark:text-[#999]">
                            {tank.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {tank.fuelType}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          isAlert
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {percent.toFixed(1)}% {t('dash.filled', 'Terisi')}
                      </span>
                    </div>

                    {/* Progress Bar with Scale Marks */}
                    <div className="space-y-1">
                      <div className="w-full bg-slate-200 dark:bg-white/10 h-3 rounded-full overflow-hidden p-0.5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            percent > 25
                              ? 'bg-emerald-500 dark:bg-emerald-400'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-slate-400">
                        <span>0 L</span>
                        <span>25.000 L</span>
                        <span>{formatNumber(tank.capacityLiters, 0)} L</span>
                      </div>
                    </div>

                    {/* Technical Parameter Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.04]">
                      <div className="p-2 rounded-lg bg-white dark:bg-[#161616] border border-slate-200/60 dark:border-white/[0.04]">
                        <span className="block text-[9px] font-mono uppercase text-slate-400">
                          {t('dash.actualStock', 'Stok Aktual')}
                        </span>
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                          {formatNumber(tank.currentStockLiters, 0)} L
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-white dark:bg-[#161616] border border-slate-200/60 dark:border-white/[0.04]">
                        <span className="block text-[9px] font-mono uppercase text-slate-400">
                          {t('dash.maxCapacity', 'Kapasitas Penuh')}
                        </span>
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                          {formatNumber(tank.capacityLiters, 0)} L
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-white dark:bg-[#161616] border border-slate-200/60 dark:border-white/[0.04]">
                        <span className="block text-[9px] font-mono uppercase text-slate-400">
                          {t('dash.remainingUllage', 'Sisa Ruang')}
                        </span>
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                          {formatNumber(ullage, 0)} L
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-white dark:bg-[#161616] border border-slate-200/60 dark:border-white/[0.04]">
                        <span className="block text-[9px] font-mono uppercase text-slate-400">
                          {t('dash.criticalLimit', 'Batas Alert')}
                        </span>
                        <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400">
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

        {/* Right (5 cols): Status Shift & Armada */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('dash.shiftSummaryTitle', 'Status Shift & Armada')}
              </h2>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                WITA Site Live
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
                  <span className="text-[10px] text-slate-500 dark:text-[#888] block">Dump Truck (DT)</span>
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
      </div>

      {/* 4. Live Refuelling Log Table (High-Density, Search Filterable, Clean) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('dash.recentLogsTitle', 'Log Transaksi Pengisian Terkini')}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-[#888]">
                {filteredLogs.length} {lang === 'id' ? 'dari' : 'of'} {recentLogs.length} {t('dash.logsCount', 'Ditampilkan')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#777] mt-0.5">
              {t('dash.recentLogsSubtitle', 'Audit real-time pengisian unit alat berat')}
            </p>
          </div>

          {/* Quick Filter Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              placeholder={t('dash.filterPlaceholder', 'Filter No Unit (misal: LV, DT, EX)...')}
              className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden w-56 sm:w-64"
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
                          ? `Tidak ada transaksi yang sesuai dengan "${unitFilter}"`
                          : 'Belum ada transaksi pengisian bahan bakar pada shift ini.'}
                      </p>
                      <Link
                        href="/dispenser"
                        className="text-xs font-semibold text-slate-800 dark:text-white underline mt-1"
                      >
                        Buka Terminal Dispenser untuk input pengisian &rarr;
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
                        : (log.no || idx + 1)}
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
                    <td className="py-2.5 px-3 font-mono font-bold text-right text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
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
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold ${
                          log.syncStatus === 'SYNCED'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
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
    </div>
  );
}
