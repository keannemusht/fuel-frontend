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
  ChevronDown,
  RotateCcw,
  Download,
  Calendar,
  Sparkles,
  Check,
  X,
  Activity,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import ErpExportModal from '@/components/history/ErpExportModal';
import ModalPortal from '@/components/shared/ModalPortal';
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

function formatInt(num?: number, lang: string = 'id'): string {
  if (num === undefined || num === null) return '0';
  return num.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID');
}

function formatFloat(num?: number, lang: string = 'id'): string {
  if (num === undefined || num === null) return '0';
  return num.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function localizeDescription(desc: string, lang: string): string {
  if (lang !== 'en') return desc;
  return desc
    .replace(/Volume dispense (.*) L <= 0 \(Baris Saldo Awal \/ Inbound Refill\)/, 'Dispense volume $1 L <= 0 (Opening Balance / Inbound Refill line)')
    .replace(/Transaksi tercatat ganda pada waktu persis (.*)/, 'Duplicate transaction recorded at exact timestamp $1')
    .replace(/Meter kosong di antara (.*) dan (.*) -> Usulan interpolasi: (.*)/, 'Blank meter between $1 and $2 -> Proposed interpolation: $3')
    .replace(/Peralatan tanpa meter fisik \(Genset \/ Tower Lamp\)/, 'Equipment without physical meter (Genset / Tower Lamp)')
    .replace(/Lonjakan typo terisolasi \((.*)\) di antara (.*) dan (.*)/, 'Isolated typo spike ($1) between $2 and $3')
    .replace(/Penurunan typo terisolasi \((.*)\) di antara (.*) dan (.*)/, 'Isolated typo decrease ($1) between $2 and $3')
    .replace(/Meter sama persis \((.*)\) \/ unit standby \(selisih 0 jam\/km\)/, 'Identical meter reading ($1) / standby unit (0 hr/km delta)')
    .replace(/Meter turun dari (.*) ke (.*)/, 'Meter decreased from $1 to $2');
}

function localizeStrategy(strat: string, lang: string): string {
  if (lang !== 'en') return strat;
  return strat
    .replace(/Keluarkan baris dari modul pemakaian kendaraan ERP/, 'Exclude row from ERP vehicle consumption module')
    .replace(/Verifikasi fisik nota fuelman untuk memastikan keabsahan transaksi ganda/, 'Physically verify fuelman slip to confirm duplicate transaction validity')
    .replace(/Isi estimasi wajar agar tidak bolong dan menjaga batas last meter unit/, 'Fill reasonable estimate to prevent gaps and protect unit last meter threshold')
    .replace(/Pertahankan 0 di DB fisik; sanitasi virtual \(Broken=2\) diterapkan otomatis saat ekspor Syshab/, 'Retain 0 in physical DB; virtual sanitation (Broken=2) is automatically applied during Syshab export')
    .replace(/Koreksi typo digit lonjakan ke nilai riil armada \((.*)\) agar batas last meter tidak melonjak/, "Correct digit spike typo to fleet's real reading ($1) to prevent inflating unit's last meter")
    .replace(/Koreksi typo penurunan ke nilai riil armada \((.*)\) sesuai lintasan fisik unit/, "Correct decrease typo to fleet's real reading ($1) along vehicle physical trajectory")
    .replace(/Pertahankan nilai fisik di DB; saat ekspor Syshab otomatis disesuaikan secara virtual/, 'Retain physical value in DB; automatically adjusted virtually during Syshab export')
    .replace(/Verifikasi fisik catatan penggantian meter mesin\/alat di lapangan/, 'Physically verify replacement record of dashboard meter/gauge on site');
}

export default function ReconciliationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { site, siteLabel } = useSite();
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

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 25;

  const monthParam = `${selectedYear}-${selectedMonth}`;
  const siteParam = site === 'ALL' ? 'ALL' : site;

  // Query Audit Diagnostics - NOTE: baseURL already has /api, so we use /reconciliation/health
  const {
    data: auditData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<AuditResponse>({
    queryKey: ['reconciliationAudit', monthParam, siteParam, lang],
    queryFn: async () => {
      const res = await api.get(`/reconciliation/health?monthStr=${monthParam}&site=${siteParam}&lang=${lang}`);
      return res.data?.data;
    },
    refetchOnWindowFocus: false,
  });

  // Mutation: Apply Fixes
  const applyMutation = useMutation({
    mutationFn: async (fixes: any[]) => {
      const res = await api.post('/reconciliation/apply', { fixes });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || t('reconciliation.toastApplySuccess', 'Data rekonsiliasi berhasil diterapkan ke database.'));
      setSelectedIds(new Set());
      setIsConfirmApplyOpen(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['fuelLogs'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || t('reconciliation.toastApplyFailed', 'Gagal menerapkan perbaikan rekonsiliasi.'));
    },
  });

  // Mutation: Rollback Fixes
  const rollbackMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/reconciliation/rollback', {});
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || t('reconciliation.toastRollbackSuccess', 'Berhasil me-rollback data ke nilai sebelumnya.'));
      setIsConfirmRollbackOpen(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['fuelLogs'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || t('reconciliation.toastRollbackFailed', 'Gagal me-rollback rekonsiliasi.'));
    },
  });

  const monthOptions = lang === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_ID;
  const selectedMonthName = monthOptions.find((m) => m.value === selectedMonth)?.name || selectedMonth;
  const anomalies = auditData?.anomalies || [];

  // Filtered anomalies by category tab and search query
  const filteredAnomalies = useMemo(() => {
    return anomalies.filter((item) => {
      if (activeCategoryTab !== 'ALL' && item.anomalyType !== activeCategoryTab) {
        return false;
      }
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

  // Paginated items
  const totalPages = Math.ceil(filteredAnomalies.length / itemsPerPage) || 1;
  const paginatedAnomalies = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAnomalies.slice(start, start + itemsPerPage);
  }, [filteredAnomalies, currentPage, itemsPerPage]);

  // Selection handlers
  const handleSelectAllOnPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = new Set(selectedIds);
    if (e.target.checked) {
      paginatedAnomalies.forEach((a) => {
        if (a.anomalyType !== 'NON_DISPENSE') next.add(a.id);
      });
    } else {
      paginatedAnomalies.forEach((a) => next.delete(a.id));
    }
    setSelectedIds(next);
  };

  const isAllOnPageSelected =
    paginatedAnomalies.length > 0 &&
    paginatedAnomalies
      .filter((a) => a.anomalyType !== 'NON_DISPENSE')
      .every((a) => selectedIds.has(a.id));

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

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* 1. Header Bar matching /history & /dispenser */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
            <CheckCheck className="w-5 h-5 text-slate-700 dark:text-white/70" />
            <span>{t('reconciliation.title', 'Rekonsiliasi Integritas Data')}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#888888] mt-0.5">
            {t('reconciliation.subtitle', 'Audit kronologis meter unit, perbaikan inkonsistensi, dan pembuatan ekspor Syshab ERP bersih')}
          </p>
        </div>

        {/* Action Controls & Month Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month & Year Dropdown Pill */}
          <div className="flex items-center px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/[0.08] text-slate-800 dark:text-white font-medium text-xs border border-slate-200 dark:border-white/[0.1]">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-500 dark:text-white/60 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value} className="bg-white dark:bg-[#121212] text-slate-900 dark:text-white">
                  {m.name}
                </option>
              ))}
            </select>
            <span className="mx-1 text-slate-300 dark:text-white/20">/</span>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
            >
              {AVAILABLE_YEARS.map((y) => (
                <option key={y} value={y} className="bg-white dark:bg-[#121212] text-slate-900 dark:text-white">
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Action: Re-Scan Diagnostics */}
          <button
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-800 dark:text-white font-medium text-xs border border-slate-200 dark:border-white/[0.1] active:scale-95 transition-all disabled:opacity-50"
            title={lang === 'id' ? 'Pindai ulang integritas data untuk periode yang dipilih' : 'Re-scan data integrity for selected period'}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 dark:text-white/70 ${isFetching ? 'animate-spin' : ''}`} />
            <span>{isFetching ? t('reconciliation.scanning', 'Memindai...') : t('reconciliation.rescan', 'Pindai Ulang')}</span>
          </button>

          {/* Action: Rollback */}
          <button
            onClick={() => setIsConfirmRollbackOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-800 dark:text-white font-medium text-xs border border-slate-200 dark:border-white/[0.1] active:scale-95 transition-all"
            title={lang === 'id' ? 'Batalkan perubahan rekonsiliasi terakhir' : 'Rollback last reconciliation changes'}
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600 dark:text-white/70" />
            <span>{t('reconciliation.rollback', 'Rollback')}</span>
          </button>

          {/* Action: Export Clean Syshab */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs shadow-sm active:scale-95 transition-all cursor-pointer"
            title={lang === 'id' ? 'Buka opsi ekspor Syshab dengan sanitasi kronologis otomatis' : 'Open Syshab export options with automatic chronological sanitization'}
          >
            <Download className="w-3.5 h-3.5 text-white shrink-0" />
            <span>{t('reconciliation.exportSyshab', 'Ekspor Upload Syshab')}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/20 text-white border border-white/20">
              .csv / .xlsx
            </span>
          </button>
        </div>
      </div>

      {/* 2. Responsive KPI Cards (5 Columns matching /history) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        {/* Card 1: Data Health Score */}
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121212]/60 relative overflow-hidden">
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-[#888888]">
            {t('reconciliation.healthScore', 'Skor Integritas')}
          </p>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
            <h3 className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {isLoading ? '...' : `${formatFloat(healthScore, lang)}%`}
            </h3>
            <div
              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center ${
                healthScore >= 95
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                  : healthScore >= 80
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-[10px] font-mono text-slate-400 dark:text-[#888888] mt-1 truncate">
            {healthScore >= 95
              ? t('reconciliation.statusOptimal', 'Status: Optimal')
              : healthScore >= 80
              ? t('reconciliation.statusNeedsAttention', 'Perlu Rekonsiliasi')
              : t('reconciliation.statusCritical', 'Status: Kritis')}
          </p>
        </div>

        {/* Card 2: Total Transactions */}
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121212]/60 relative overflow-hidden">
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-[#888888]">
            {t('reconciliation.totalTx', 'Total Transaksi')}
          </p>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
            <h3 className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {isLoading ? '...' : formatInt(auditData?.totalLogs, lang)}
              <span className="text-[10px] sm:text-xs font-normal text-slate-400 dark:text-[#888888] ml-1 font-sans">
                {t('reconciliation.logs', 'Logs')}
              </span>
            </h3>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-slate-600 dark:text-white/70">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-[10px] font-mono text-slate-400 dark:text-[#888888] mt-1 truncate">
            {selectedMonthName} {selectedYear}
          </p>
        </div>

        {/* Card 3: Valid ERP Records */}
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121212]/60 relative overflow-hidden">
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-[#888888]">
            {t('reconciliation.validRecords', 'Data Valid & Normal')}
          </p>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
            <h3 className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              {isLoading ? '...' : formatInt(auditData?.validLogs, lang)}
              <span className="text-[10px] sm:text-xs font-normal text-slate-400 dark:text-[#888888] ml-1 font-sans">
                {t('reconciliation.logs', 'Logs')}
              </span>
            </h3>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-[10px] font-mono text-slate-400 dark:text-[#888888] mt-1 truncate">
            {t('reconciliation.readyForErp', 'Siap upload ERP')}
          </p>
        </div>

        {/* Card 4: Total Anomalies */}
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121212]/60 relative overflow-hidden">
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-[#888888]">
            {t('reconciliation.totalAnomalies', 'Total Anomali')}
          </p>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
            <h3 className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400">
              {isLoading ? '...' : formatInt(auditData?.anomalies?.length, lang)}
              <span className="text-[10px] sm:text-xs font-normal text-slate-400 dark:text-[#888888] ml-1 font-sans">
                {t('reconciliation.cases', 'Kasus')}
              </span>
            </h3>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-[10px] font-mono text-slate-400 dark:text-[#888888] mt-1 truncate">
            {t('reconciliation.needsAdjustment', 'Perlu penyesuaian')}
          </p>
        </div>

        {/* Card 5: Meter Backtracks / Typos */}
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#121212]/60 relative overflow-hidden">
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-[#888888]">
            {t('reconciliation.meterDecreases', 'Meter Mundur / Typo')}
          </p>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
            <h3 className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-rose-600 dark:text-rose-400">
              {isLoading ? '...' : formatInt(auditData?.categories?.meterDecrease, lang)}
              <span className="text-[10px] sm:text-xs font-normal text-slate-400 dark:text-[#888888] ml-1 font-sans">
                {t('reconciliation.cases', 'Kasus')}
              </span>
            </h3>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <RotateCcw className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-[10px] font-mono text-slate-400 dark:text-[#888888] mt-1 truncate">
            {t('reconciliation.erpBlockerRoot', 'Akar penolakan Syshab')}
          </p>
        </div>
      </div>

      {/* 3. Search & Segmented Filter Toolbar matching /history */}
      <div className="space-y-2.5">
        <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-20">
          {/* Search Input matching /history */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#666666]" />
            <input
              type="text"
              placeholder={t('reconciliation.searchPlaceholder', 'Cari kode unit, operator, deskripsi anomali...')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-full text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#666666] focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Segmented Category Filter matching industrial design */}
          <div className="flex flex-wrap items-center p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] text-xs">
            <button
              onClick={() => {
                setActiveCategoryTab('ALL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeCategoryTab === 'ALL'
                  ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t('reconciliation.tabAll', 'Semua')} ({formatInt(auditData?.anomalies?.length, lang)})
            </button>
            <button
              onClick={() => {
                setActiveCategoryTab('METER_DECREASE');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeCategoryTab === 'METER_DECREASE'
                  ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t('reconciliation.tabMeterDecrease', 'Meter Mundur')} ({formatInt(auditData?.categories?.meterDecrease, lang)})
            </button>
            <button
              onClick={() => {
                setActiveCategoryTab('METER_ZERO');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeCategoryTab === 'METER_ZERO'
                  ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t('reconciliation.tabMeterZero', 'Meter 0')} ({formatInt(auditData?.categories?.meterZero, lang)})
            </button>
            <button
              onClick={() => {
                setActiveCategoryTab('METER_EQUAL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeCategoryTab === 'METER_EQUAL'
                  ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t('reconciliation.tabMeterEqual', 'Meter Sama')} ({formatInt(auditData?.categories?.meterEqual, lang)})
            </button>
            <button
              onClick={() => {
                setActiveCategoryTab('NON_DISPENSE');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeCategoryTab === 'NON_DISPENSE'
                  ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t('reconciliation.tabNonDispense', 'Non-Dispense')} ({formatInt(auditData?.categories?.nonDispense, lang)})
            </button>
          </div>
        </div>

        {/* Floating/Docked Selection Banner */}
        {selectedIds.size > 0 && (
          <div className="p-3 sm:p-4 rounded-2xl border border-orange-200 dark:border-orange-900/40 bg-orange-50/80 dark:bg-orange-950/20 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center space-x-2 text-xs text-orange-900 dark:text-orange-200">
              <span className="font-bold text-orange-700 dark:text-orange-400 font-mono">
                {selectedIds.size}
              </span>
              <span>{t('reconciliation.selectedBanner', 'transaksi dipilih untuk perbaikan database')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition"
              >
                {t('reconciliation.cancel', 'Batal')}
              </button>
              <button
                onClick={handleApplySelected}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('reconciliation.applyFixes', 'Terapkan Perbaikan')} ({selectedIds.size})</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Industrial Table View matching /history */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] text-[10px] font-bold text-slate-400 dark:text-[#777] uppercase tracking-wider">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllOnPageSelected}
                    onChange={handleSelectAllOnPage}
                    className="w-3.5 h-3.5 rounded border-slate-300 dark:border-white/20 text-orange-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">{t('reconciliation.colUnit', 'No Unit')}</th>
                <th className="py-3 px-4">{t('reconciliation.colCategoryType', 'Kategori & Tipe')}</th>
                <th className="py-3 px-4">{t('reconciliation.colDateTime', 'Tanggal & Waktu')}</th>
                <th className="py-3 px-4">{t('reconciliation.colOperatorShift', 'Operator & Shift')}</th>
                <th className="py-3 px-4">{t('reconciliation.colCurrentMeter', 'Meter Saat Ini (DB)')}</th>
                <th className="py-3 px-4">{t('reconciliation.colProposedMeter', 'Usulan Rekonsiliasi')}</th>
                <th className="py-3 px-4">{t('reconciliation.colDiagnosis', 'Diagnosis Anomali')}</th>
                <th className="py-3 px-4 text-center">{t('reconciliation.colStatus', 'Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-[#666]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    {t('reconciliation.checking', 'Memeriksa integritas data historis...')}
                  </td>
                </tr>
              ) : paginatedAnomalies.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-[#666]">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      {t('reconciliation.noAnomalies', 'Tidak ada anomali pada filter ini')}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t('reconciliation.noAnomaliesDesc', 'Seluruh transaksi konsisten dan memenuhi kriteria validasi Syshab ERP.')}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedAnomalies.map((item) => {
                  const isChecked = selectedIds.has(item.id);
                  const isNonDispense = item.anomalyType === 'NON_DISPENSE';

                  return (
                    <tr
                      key={item.id}
                      className={`h-11 sm:h-12 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition ${
                        isChecked ? 'bg-orange-50/30 dark:bg-orange-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleItem(item.id)}
                          disabled={isNonDispense}
                          className="w-3.5 h-3.5 rounded border-slate-300 dark:border-white/20 text-orange-600 focus:ring-0 cursor-pointer disabled:opacity-20"
                        />
                      </td>

                      {/* No Unit */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-white font-mono">
                          {item.unitCode}
                        </span>
                      </td>

                      {/* Category & Type */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="text-slate-700 dark:text-slate-300 font-medium">
                          {item.category || '-'}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-[#777]">
                          {item.type || '-'}
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-2.5 px-4 whitespace-nowrap font-mono text-[11px]">
                        <div className="text-slate-800 dark:text-slate-200">{item.dateStr}</div>
                        <div className="text-[10px] text-slate-400 dark:text-[#777]">{item.jamStr} WITA</div>
                      </td>

                      {/* Operator & Shift */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="text-slate-800 dark:text-slate-200 font-medium">{item.operator}</div>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400">
                            {item.shift}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {formatInt(item.volumeLiters, lang)} L
                          </span>
                        </div>
                      </td>

                      {/* Current Meter (DB) */}
                      <td className="py-2.5 px-4 whitespace-nowrap font-mono text-[11px]">
                        <div className="text-slate-500">
                          Prev: {formatFloat(item.previousMeter, lang)}
                        </div>
                        <div className="text-rose-600 dark:text-rose-400 font-bold">
                          Curr: {formatFloat(item.currentMeter, lang)}{' '}
                          <span className="text-[10px] text-slate-400 font-sans">({item.meterType})</span>
                        </div>
                      </td>

                      {/* Proposed Reconciled Meter */}
                      <td className="py-2.5 px-4 whitespace-nowrap font-mono text-[11px]">
                        {isNonDispense ? (
                          <span className="text-slate-400 italic text-[11px]">{t('reconciliation.autoExclusion', 'Eksklusi otomatis')}</span>
                        ) : (
                          <div className="inline-block px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                            <div className="text-emerald-700 dark:text-emerald-400 text-[10px]">
                              Prev: {formatFloat(item.proposedPrevious, lang)}
                            </div>
                            <div className="text-emerald-700 dark:text-emerald-300 font-bold flex items-center">
                              Curr: {formatFloat(item.proposedCurrent, lang)}{' '}
                              <span className="text-[9px] text-emerald-600 ml-0.5">({item.meterType})</span>
                              <ArrowRight className="w-2.5 h-2.5 ml-1 text-emerald-500 inline" />
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Diagnostic & Strategy */}
                      <td className="py-2.5 px-4 max-w-xs">
                        <div className="text-[11px] font-medium text-slate-800 dark:text-slate-200">
                          {localizeDescription(item.description, lang)}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-[#777] mt-0.5">
                          {localizeStrategy(item.fixStrategy, lang)}
                        </div>
                      </td>

                      {/* Confidence status */}
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.confidence === 'HIGH'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
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

        {/* Pagination matching /history */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between text-xs text-slate-500 dark:text-[#888888]">
          <span>
            {t('reconciliation.showing', 'Menampilkan')}{' '}
            <span className="font-semibold text-slate-800 dark:text-white">
              {filteredAnomalies.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
            </span>{' '}
            {t('reconciliation.to', 'hingga')}{' '}
            <span className="font-semibold text-slate-800 dark:text-white">
              {Math.min(currentPage * itemsPerPage, filteredAnomalies.length)}
            </span>{' '}
            {t('reconciliation.of', 'dari')}{' '}
            <span className="font-semibold text-slate-800 dark:text-white">
              {filteredAnomalies.length}
            </span>{' '}
            {t('reconciliation.anomaliesCount', 'anomali')}
          </span>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Clean Modal Portal: Confirmation Apply */}
      {isConfirmApplyOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/[0.1] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center space-x-3 text-slate-900 dark:text-white">
                <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">{t('reconciliation.modalApplyTitle', 'Konfirmasi Rekonsiliasi Database')}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-[#888888]">
                    {t('reconciliation.modalApplySubtitle', 'Perubahan akan disimpan permanen dengan riwayat jejak audit')}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">{t('reconciliation.modalTotalFixed', 'Total data diperbaiki:')}</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedIds.size} {lang === 'id' ? 'transaksi' : 'transactions'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">{t('reconciliation.modalPeriod', 'Bulan / Periode:')}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedMonthName} {selectedYear}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">{t('reconciliation.modalSafety', 'Keamanan:')}</span>
                  <span className="text-emerald-600 font-bold font-sans">{t('reconciliation.modalSafetyDesc', 'Dapat di-rollback kapan saja')}</span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  onClick={() => setIsConfirmApplyOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
                >
                  {t('reconciliation.cancel', 'Batal')}
                </button>
                <button
                  onClick={executeApply}
                  disabled={applyMutation.isPending}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {applyMutation.isPending ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{applyMutation.isPending ? t('reconciliation.modalApplying', 'Menerapkan...') : t('reconciliation.modalApplyNow', 'Terapkan Sekarang')}</span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* 6. Clean Modal Portal: Confirmation Rollback */}
      {isConfirmRollbackOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/[0.1] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center space-x-3 text-slate-900 dark:text-white">
                <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">{t('reconciliation.modalRollbackTitle', 'Rollback Perbaikan Rekonsiliasi')}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-[#888888]">
                    {t('reconciliation.modalRollbackSubtitle', 'Kembalikan nilai meter ke kondisi sebelum perbaikan')}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-[#aaa] leading-relaxed">
                {t('reconciliation.modalRollbackDesc', 'Apakah Anda yakin ingin membatalkan perbaikan rekonsiliasi terakhir? Nilai meter pada log transaksi akan dipulihkan persis seperti data aslinya.')}
              </p>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  onClick={() => setIsConfirmRollbackOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
                >
                  {t('reconciliation.cancel', 'Batal')}
                </button>
                <button
                  onClick={() => rollbackMutation.mutate()}
                  disabled={rollbackMutation.isPending}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {rollbackMutation.isPending ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  <span>{rollbackMutation.isPending ? t('reconciliation.modalRollingBack', 'Me-rollback...') : t('reconciliation.modalYesRollback', 'Ya, Rollback')}</span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* 7. Syshab Clean Export Modal */}
      {isExportModalOpen && (
        <ErpExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          selectedSite={siteParam}
          siteLabel={siteLabel}
        />
      )}
    </div>
  );
}
