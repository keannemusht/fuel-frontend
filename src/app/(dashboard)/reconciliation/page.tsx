'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useSite } from '@/components/providers/SiteProvider';
import {
  CheckCheck,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  Download,
  Fuel,
  ArrowRight,
  Info,
  Calendar,
  Sparkles,
  Check,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import ErpExportModal from '@/components/history/ErpExportModal';
import { toast } from 'react-toastify';

const MONTH_NAMES_ID = [
  { value: '01', name: 'Januari' },
  { value: '02', name: 'Februari' },
  { value: '03', name: 'Maret' },
  { value: '04', name: 'April' },
  { value: '05', name: 'Mei' },
  { value: '06', name: 'Juni' },
  { value: '07', name: 'Juli' },
  { value: '08', name: 'Agustus' },
  { value: '09', name: 'September' },
  { value: '10', name: 'Oktober' },
  { value: '11', name: 'November' },
  { value: '12', name: 'Desember' },
];

const MONTH_NAMES_EN = [
  { value: '01', name: 'January' },
  { value: '02', name: 'February' },
  { value: '03', name: 'March' },
  { value: '04', name: 'April' },
  { value: '05', name: 'May' },
  { value: '06', name: 'June' },
  { value: '07', name: 'July' },
  { value: '08', name: 'August' },
  { value: '09', name: 'September' },
  { value: '10', name: 'October' },
  { value: '11', name: 'November' },
  { value: '12', name: 'December' },
];

const AVAILABLE_YEARS = ['2024', '2025', '2026', '2027'];

interface AnomalyItem {
  id: string;
  unitCode: string;
  category: string;
  type: string;
  dateStr: string;
  jamStr: string;
  shift: string;
  operator: string;
  volumeLiters: number;
  site: string;
  meterType: 'HM' | 'KM';
  currentMeter: number;
  previousMeter: number;
  deltaMeter: number;
  anomalyType: 'METER_DECREASE' | 'METER_ZERO' | 'METER_EQUAL' | 'METER_JUMP' | 'NON_DISPENSE' | 'TIMESTAMP_DUPLICATE';
  description: string;
  proposedPrevious: number;
  proposedCurrent: number;
  confidence: 'HIGH' | 'MEDIUM' | 'REVIEW_NEEDED';
  fixStrategy: string;
}

interface AuditResponse {
  monthStr: string;
  site: string;
  totalLogs: number;
  validLogs: number;
  healthScore: number;
  categories: {
    meterDecrease: number;
    meterZero: number;
    meterEqual: number;
    meterJump: number;
    nonDispense: number;
    duplicateTimestamp: number;
  };
  anomalies: AnomalyItem[];
}

export default function ReconciliationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { site } = useSite();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (user && user.role === 'FUELMAN') {
      router.replace('/dispenser');
    }
  }, [user, router]);

  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('08');
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isConfirmApplyOpen, setIsConfirmApplyOpen] = useState<boolean>(false);
  const [isConfirmRollbackOpen, setIsConfirmRollbackOpen] = useState<boolean>(false);

  const monthParam = `${selectedYear}-${selectedMonth}`;
  const siteParam = site === 'ALL' ? 'ALL' : site;

  // Query Audit Diagnostics
  const { data: auditData, isLoading, isFetching, refetch } = useQuery<AuditResponse>({
    queryKey: ['reconciliationAudit', monthParam, siteParam],
    queryFn: async () => {
      const res = await api.get(`/api/reconciliation/health?monthStr=${monthParam}&site=${siteParam}`);
      return res.data?.data;
    },
    refetchOnWindowFocus: false,
  });

  // Mutation: Apply Fixes
  const applyMutation = useMutation({
    mutationFn: async (fixes: any[]) => {
      const res = await api.post('/api/reconciliation/apply', { fixes });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Data rekonsiliasi berhasil diterapkan ke database.');
      setSelectedIds(new Set());
      setIsConfirmApplyOpen(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['fuelLogs'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menerapkan perbaikan rekonsiliasi.');
    },
  });

  // Mutation: Rollback Fixes
  const rollbackMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/reconciliation/rollback', {});
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Berhasil me-rollback data ke nilai sebelumnya.');
      setIsConfirmRollbackOpen(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['fuelLogs'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal me-rollback rekonsiliasi.');
    },
  });

  const monthOptions = lang === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_ID;
  const anomalies = auditData?.anomalies || [];

  // Filtered anomalies by category tab and search query
  const filteredAnomalies = useMemo(() => {
    return anomalies.filter((item) => {
      // Category match
      if (activeCategoryTab !== 'ALL' && item.anomalyType !== activeCategoryTab) {
        return false;
      }
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesUnit = item.unitCode.toLowerCase().includes(q);
        const matchesOpr = item.operator.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        if (!matchesUnit && !matchesOpr && !matchesDesc) return false;
      }
      return true;
    });
  }, [anomalies, activeCategoryTab, searchQuery]);

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(filteredAnomalies.map((a) => a.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleApplySelected = () => {
    if (selectedIds.size === 0) return;
    setIsConfirmApplyOpen(true);
  };

  const executeApply = () => {
    const selectedItems = anomalies.filter((a) => selectedIds.has(a.id));
    const fixes = selectedItems.map((item) => ({
      logId: item.id,
      proposedPrevious: item.proposedPrevious,
      proposedCurrent: item.proposedCurrent,
      meterType: item.meterType,
      reason: `Rekonsiliasi Integritas ${item.anomalyType}: ${item.fixStrategy}`,
    }));
    applyMutation.mutate(fixes);
  };

  const healthScore = auditData?.healthScore ?? 100;
  const healthBadgeColor =
    healthScore >= 95
      ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
      : healthScore >= 80
      ? 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
      : 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800';

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* 1. Header & Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <CheckCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  {lang === 'en' ? 'Data Integrity & ERP Reconciliation Engine' : 'Rekonsiliasi Integritas Data & Ekspor ERP'}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {lang === 'en'
                    ? 'Automated diagnostics, chronological meter validation, and one-click clean Syshab generation.'
                    : 'Pemeriksaan integritas meter kronologis, perbaikan inkonsistensi, dan pembuatan ekspor Syshab bersih.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Month & Year Selectors */}
            <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs">
              <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400 mr-1" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer"
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value} className="dark:bg-slate-900">
                    {m.name}
                  </option>
                ))}
              </select>
              <span className="text-slate-400">/</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer"
              >
                {AVAILABLE_YEARS.map((y) => (
                  <option key={y} value={y} className="dark:bg-slate-900">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Re-Scan Button */}
            <button
              onClick={() => refetch()}
              disabled={isLoading || isFetching}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>{lang === 'en' ? 'Re-Scan Data' : 'Pindai Ulang'}</span>
            </button>

            {/* Rollback Button */}
            <button
              onClick={() => setIsConfirmRollbackOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Rollback Fixes' : 'Rollback Terakhir'}</span>
            </button>

            {/* Export Syshab Button */}
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Export Clean Syshab' : 'Unduh Syshab Bersih'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI / Health Score Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Health Score */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {lang === 'en' ? 'Data Health Score' : 'Skor Kesehatan Data'}
            </span>
            <div className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${healthBadgeColor}`}>
              {healthScore >= 95 ? 'SEHAT' : healthScore >= 80 ? 'PERLU TINDAKAN' : 'KRITIS'}
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {isLoading ? '...' : `${healthScore}%`}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {auditData ? `${formatNumber(auditData.validLogs)} / ${formatNumber(auditData.totalLogs)} log valid` : ''}
            </span>
          </div>
          {/* Visual Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                healthScore >= 95 ? 'bg-emerald-500' : healthScore >= 80 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.max(5, healthScore)}%` }}
            />
          </div>
        </div>

        {/* Total Examined */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {lang === 'en' ? 'Total Transactions' : 'Total Transaksi Diperiksa'}
          </span>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {isLoading ? '...' : formatNumber(auditData?.totalLogs || 0)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">records</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3">
            Periode {selectedMonth}/{selectedYear} • Site {siteParam}
          </p>
        </div>

        {/* Valid Records */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {lang === 'en' ? 'Valid & Clean Records' : 'Transaksi Valid & Normal'}
          </span>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {isLoading ? '...' : formatNumber(auditData?.validLogs || 0)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">records</span>
          </div>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-3 flex items-center">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Lolos validasi ERP tanpa modifikasi
          </p>
        </div>

        {/* Anomalies Detected */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {lang === 'en' ? 'Detected Anomalies' : 'Total Anomali Ditemukan'}
          </span>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {isLoading ? '...' : formatNumber(auditData?.anomalies?.length || 0)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">kasus</span>
          </div>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-3 flex items-center">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Dapat diperbaiki sekali klik atau via auto-sanitize
          </p>
        </div>
      </div>

      {/* 3. Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveCategoryTab('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeCategoryTab === 'ALL'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              Semua Anomali ({auditData?.anomalies?.length || 0})
            </button>
            <button
              onClick={() => setActiveCategoryTab('METER_DECREASE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeCategoryTab === 'METER_DECREASE'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              Meter Mundur / Typo ({auditData?.categories?.meterDecrease || 0})
            </button>
            <button
              onClick={() => setActiveCategoryTab('METER_ZERO')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeCategoryTab === 'METER_ZERO'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              Meter 0 / Genset ({auditData?.categories?.meterZero || 0})
            </button>
            <button
              onClick={() => setActiveCategoryTab('METER_EQUAL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeCategoryTab === 'METER_EQUAL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              Meter Sama / Standstill ({auditData?.categories?.meterEqual || 0})
            </button>
            <button
              onClick={() => setActiveCategoryTab('METER_JUMP')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeCategoryTab === 'METER_JUMP'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              Lompatan Ekstrem ({auditData?.categories?.meterJump || 0})
            </button>
            <button
              onClick={() => setActiveCategoryTab('NON_DISPENSE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeCategoryTab === 'NON_DISPENSE'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              Non-Dispense ({auditData?.categories?.nonDispense || 0})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={lang === 'en' ? 'Search unit, operator, description...' : 'Cari kode unit, operator, deskripsi...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
        </div>
      </div>

      {/* 4. Interactive Review Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {lang === 'en' ? 'Anomaly Diagnostic & Smart Fix Matrix' : 'Matriks Diagnostik Anomali & Rekomendasi Koreksi'}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {filteredAnomalies.length} anomali ditampilkan
            </span>
          </div>

          {/* Selection indicator & Quick action */}
          {selectedIds.size > 0 && (
            <div className="flex items-center space-x-3">
              <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
                {selectedIds.size} baris dipilih
              </span>
              <button
                onClick={handleApplySelected}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Terapkan Koreksi ({selectedIds.size})</span>
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredAnomalies.length > 0 && selectedIds.size === filteredAnomalies.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Unit & Tipe</th>
                <th className="py-3 px-4">Waktu & Shift</th>
                <th className="py-3 px-4">Petugas / Opr</th>
                <th className="py-3 px-4">Nilai Saat Ini (DB)</th>
                <th className="py-3 px-4">Usulan Koreksi Rekonsiliasi</th>
                <th className="py-3 px-4">Diagnosis & Strategi</th>
                <th className="py-3 px-4 text-center">Keyakinan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                    Memindai data riwayat & menjalankan analisis integritas...
                  </td>
                </tr>
              ) : filteredAnomalies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700 dark:text-slate-200">
                      Tidak ditemukan anomali pada filter ini!
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Seluruh data transaksi konsisten dan siap untuk diekspor ke Syshab ERP.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAnomalies.map((item) => {
                  const isChecked = selectedIds.has(item.id);
                  const isNonDispense = item.anomalyType === 'NON_DISPENSE';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition ${
                        isChecked ? 'bg-orange-50/40 dark:bg-orange-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleItem(item.id)}
                          disabled={isNonDispense}
                          className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer disabled:opacity-30"
                        />
                      </td>

                      {/* Unit & Type */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                          <span>{item.unitCode}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{item.type || item.category}</span>
                      </td>

                      {/* Date & Shift */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{item.dateStr}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.jamStr} • {item.shift}
                        </div>
                      </td>

                      {/* Operator */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{item.operator}</div>
                        <div className="text-[10px] text-slate-400">{formatNumber(item.volumeLiters)} L</div>
                      </td>

                      {/* Current Values */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                        <div className="text-slate-500">
                          Prev: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatNumber(item.previousMeter)}</span>
                        </div>
                        <div className="text-rose-600 dark:text-rose-400 font-bold">
                          Curr: {formatNumber(item.currentMeter)} ({item.meterType})
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Δ: {formatNumber(item.deltaMeter)}
                        </div>
                      </td>

                      {/* Proposed Reconciled Values */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                        {isNonDispense ? (
                          <span className="text-slate-400 italic">Eksklusi Otomatis</span>
                        ) : (
                          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                            <div className="text-emerald-700 dark:text-emerald-400">
                              Prev: <span className="font-bold">{formatNumber(item.proposedPrevious)}</span>
                            </div>
                            <div className="text-emerald-700 dark:text-emerald-300 font-bold flex items-center">
                              Curr: {formatNumber(item.proposedCurrent)} ({item.meterType})
                              <ArrowRight className="w-3 h-3 ml-1 text-emerald-500 inline" />
                            </div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              Δ: +{formatNumber(item.proposedCurrent - item.proposedPrevious)}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Diagnostic & Strategy */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                          {item.description}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          💡 {item.fixStrategy}
                        </div>
                      </td>

                      {/* Confidence */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.confidence === 'HIGH'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : item.confidence === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                          }`}
                        >
                          {item.confidence}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Confirmation Modal: Apply Fixes */}
      {isConfirmApplyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-orange-600 dark:text-orange-400">
              <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-950/60">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Konfirmasi Penerapan Rekonsiliasi
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Perubahan akan disimpan ke database dengan audit trail lengkap.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 text-xs space-y-2 text-slate-700 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Total data yang akan diperbaiki:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedIds.size} transaksi</span>
              </div>
              <div className="flex justify-between">
                <span>Periode:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedMonth}/{selectedYear}</span>
              </div>
              <div className="flex justify-between">
                <span>Keamanan Data:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Tersedia fitur Rollback</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-700">
                Sistem akan memperbarui nilai HM/KM mundur dan menandai status validasi bypass agar diterima oleh Syshab ERP secara permanen.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setIsConfirmApplyOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Batal
              </button>
              <button
                onClick={executeApply}
                disabled={applyMutation.isPending}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                {applyMutation.isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{applyMutation.isPending ? 'Menerapkan...' : 'Ya, Terapkan Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Confirmation Modal: Rollback */}
      {isConfirmRollbackOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Rollback Perbaikan Rekonsiliasi
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mengembalikan data yang sebelumnya diubah ke nilai aslinya.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60">
              Apakah Anda yakin ingin membatalkan perbaikan rekonsiliasi terakhir? Nilai meter akan dikembalikan persis seperti sebelum eksekusi perbaikan.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setIsConfirmRollbackOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Batal
              </button>
              <button
                onClick={() => rollbackMutation.mutate()}
                disabled={rollbackMutation.isPending}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                {rollbackMutation.isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>{rollbackMutation.isPending ? 'Me-rollback...' : 'Ya, Rollback Nilai Asli'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Syshab Clean Export Modal */}
      {isExportModalOpen && (
        <ErpExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          selectedSite={siteParam}
          siteLabel={siteParam === 'ALL' ? 'Semua Site' : `Site ${siteParam}`}
        />
      )}
    </div>
  );
}
