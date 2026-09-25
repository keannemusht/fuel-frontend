'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FuelLog, MonthlySummary } from '@/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import {
  CalendarClock,
  Calendar,
  CalendarPlus,
  FileSpreadsheet,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Fuel,
  Droplet,
  ChevronLeft,
  ChevronRight,
  Activity,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { formatNumber } from '@/lib/utils';
import SyncStatusBadge from '@/components/shared/SyncStatusBadge';
import ExcelImportModal from '@/components/shared/ExcelImportModal';
import HistoricalLogModal from '@/components/history/HistoricalLogModal';
import DeleteConfirmModal from '@/components/history/DeleteConfirmModal';
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

export default function HistoryPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGEMENT';
  const queryClient = useQueryClient();

  const now = new Date();
  const currentYearStr = String(now.getFullYear());
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');

  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [shiftFilter, setShiftFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 25;

  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // CRUD State
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [editingLog, setEditingLog] = useState<FuelLog | null>(null);
  const [deletingLog, setDeletingLog] = useState<FuelLog | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const monthNames = lang === 'id' ? MONTH_NAMES_ID : MONTH_NAMES_EN;

  const handleOpenCreate = () => {
    setEditingLog(null);
    setIsLogModalOpen(true);
  };

  const handleOpenEdit = (log: FuelLog) => {
    setEditingLog(log);
    setIsLogModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingLog) return;
    setIsDeleting(true);
    try {
      await api.delete(`/fuel/logs/${deletingLog.id}`);
      const successMsg = lang === 'id' 
        ? `Berhasil menghapus log #${deletingLog.no ?? ''} (${deletingLog.unitCode})`
        : `Successfully deleted log #${deletingLog.no ?? ''} (${deletingLog.unitCode})`;
      setSyncFeedback({
        type: 'success',
        message: successMsg,
      });
      toast.success(successMsg);
      setDeletingLog(null);
      queryClient.invalidateQueries({ queryKey: ['monthlyFuelLogs', monthStr] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary', selectedYear, selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ['fuelLogs'] });
      setTimeout(() => setSyncFeedback(null), 6000);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || (lang === 'id' ? 'Gagal menghapus log data' : 'Failed to delete log');
      setSyncFeedback({ type: 'error', message: msg });
      toast.error(msg);
      setTimeout(() => setSyncFeedback(null), 8000);
    } finally {
      setIsDeleting(false);
    }
  };

  const monthStr = `${selectedYear}-${selectedMonth}`;
  const selectedMonthObj = monthNames.find((m) => m.value === selectedMonth);
  const selectedMonthLabel = `${selectedMonthObj?.name.toUpperCase()} ${selectedYear}`;

  // 1. Fetch Monthly Logs
  const {
    data: logs = [],
    isLoading: isLoadingLogs,
    refetch: refetchLogs,
  } = useQuery<FuelLog[]>({
    queryKey: ['monthlyFuelLogs', monthStr],
    queryFn: async () => {
      const res = await api.get(`/fuel/logs?monthStr=${monthStr}&limit=1000`);
      return res.data.data;
    },
  });

  // 2. Fetch Monthly Summary KPIs
  const { data: summary } = useQuery<MonthlySummary>({
    queryKey: ['monthlySummary', selectedYear, selectedMonth],
    queryFn: async () => {
      const res = await api.get(`/fuel/monthly-summary?year=${selectedYear}&month=${selectedMonth}`);
      return res.data.data;
    },
  });

  // 3. Sync Month to Google Sheets Mutation
  const syncMonthMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/fuel/sync-month', { monthStr });
      return res.data;
    },
    onSuccess: (data: any) => {
      const successMsg = `Berhasil mensinkronkan ${data.data?.totalSynced ?? data.data?.recordsSynced ?? 0} data ke tab sheet "${data.data?.targetSheet ?? data.data?.tabName}"!`;
      setSyncFeedback({
        type: 'success',
        message: successMsg,
      });
      toast.success(successMsg);
      queryClient.invalidateQueries({ queryKey: ['monthlyFuelLogs', monthStr] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary', selectedYear, selectedMonth] });
      setTimeout(() => setSyncFeedback(null), 6000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || 'Gagal sinkronisasi data bulanan ke Google Sheets';
      setSyncFeedback({ type: 'error', message: msg });
      toast.error(msg);
      setTimeout(() => setSyncFeedback(null), 8000);
    },
  });

  // 4. Sync Master Sheet Mutation
  const syncMasterMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/fuel/sync-master');
      return res.data;
    },
    onSuccess: (data: any) => {
      const successMsg = `Berhasil mensinkronkan ${data.data?.totalSynced || 0} data ke master sheet "${data.data?.targetSheet}"!`;
      setSyncFeedback({
        type: 'success',
        message: successMsg,
      });
      toast.success(successMsg);
      queryClient.invalidateQueries({ queryKey: ['monthlyFuelLogs'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      setTimeout(() => setSyncFeedback(null), 6000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || 'Gagal sinkronisasi master log ke Google Sheets';
      setSyncFeedback({ type: 'error', message: msg });
      toast.error(msg);
      setTimeout(() => setSyncFeedback(null), 8000);
    },
  });



  // Filter & Search Logic
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        searchTerm === '' ||
        log.unitCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.operator.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.fuelmanName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.category && log.category.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesShift = shiftFilter === 'ALL' || log.shift === shiftFilter;
      const matchesStatus = statusFilter === 'ALL' || log.syncStatus === statusFilter;

      return matchesSearch && matchesShift && matchesStatus;
    });
  }, [logs, searchTerm, shiftFilter, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header / Title Bar matching /dispenser */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
            <CalendarClock className="w-5 h-5 text-slate-700 dark:text-white/70" />
            <span>{t('history.title', 'Monthly Historical Records')}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#888888] mt-0.5">
            {t('history.subtitle', 'Browse, backfill, and synchronize historical fuel ledger organized by monthly sheet tabs')}
          </p>
        </div>

        {/* Action Controls & Month Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month & Year Dropdown Pill */}
          <div className="flex items-center px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/[0.08] text-slate-800 dark:text-white font-medium text-xs border border-slate-200 dark:border-white/[0.1] shadow-sm">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-500 dark:text-white/60 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
            >
              {monthNames.map((m) => (
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

          {/* Action: Sync to Sheets */}
          <button
            onClick={() => syncMonthMutation.mutate()}
            disabled={syncMonthMutation.isPending}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-800 dark:text-white font-medium text-xs border border-slate-200 dark:border-white/[0.1] active:scale-95 transition-all shadow-sm disabled:opacity-50"
            title={`Sync all records for ${selectedMonthLabel} into sheet tab "${selectedMonthLabel}"`}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${syncMonthMutation.isPending ? 'animate-spin' : ''}`} />
            <span>{syncMonthMutation.isPending ? t('history.syncing', 'Syncing...') : t('history.syncMonth', 'Sync Month')}</span>
          </button>

          {/* Action: Sync Master Log */}
          {canManage && (
            <button
              onClick={() => syncMasterMutation.mutate()}
              disabled={syncMasterMutation.isPending}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-800 dark:text-white font-medium text-xs border border-slate-200 dark:border-white/[0.1] active:scale-95 transition-all shadow-sm disabled:opacity-50"
              title="Sync all logs into master tab 'LOG FUEL MONITORING'"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-500 dark:text-blue-400 ${syncMasterMutation.isPending ? 'animate-spin' : ''}`} />
              <span>{syncMasterMutation.isPending ? t('history.syncing', 'Syncing...') : t('history.syncMaster', 'Sync Master Log')}</span>
            </button>
          )}

          {/* Action: Input Backdate (Data Terlewat) */}
          <Link
            href="/backdate"
            className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs shadow-sm shadow-amber-500/20 active:scale-95 transition-all"
            title="Input data transaksi yang terlewat (Backdate) dengan aturan HM/KM"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>{t('history.inputBackdate', 'Input Backdate')}</span>
          </Link>

          {/* Action: Add Historical Entry */}
          {canManage && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm shadow-emerald-600/20 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('history.addEntry', 'Add Entry')}</span>
            </button>
          )}

          {/* Action: Import Excel Data */}
          {canManage && (
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-800 dark:text-white font-medium text-xs border border-slate-200 dark:border-white/[0.1] active:scale-95 transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{t('history.importExcel', 'Import Excel Data')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Sync Banner Feedback */}
      {syncFeedback && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-2xl border animate-in fade-in slide-in-from-top duration-200 ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span className="text-xs font-medium">{syncFeedback.message}</span>
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="text-[11px] underline font-medium ml-4 opacity-75 hover:opacity-100"
          >
            {t('history.dismiss', 'Dismiss')}
          </button>
        </div>
      )}

      {/* Responsive KPI Cards matching /dispenser */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        {/* Card 1: Fuel Dispensed */}
        <div className="framer-card p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#121212]/60 relative overflow-hidden shadow-sm">
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-[#888888]">{t('history.fuelDispensed', 'Fuel Dispensed')}</p>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
            <h3 className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {formatNumber(summary?.totalDispensedLiters || 0, 1)}
              <span className="text-[10px] sm:text-xs font-normal text-slate-400 dark:text-[#888888] ml-1 font-sans">L</span>
            </h3>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-slate-600 dark:text-white/70">
              <Fuel className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-[10px] font-mono text-slate-400 dark:text-[#888888] mt-1 truncate">{selectedMonthLabel}</p>
        </div>

        {/* Card 2: Inbound Refills */}
        <div className="framer-card p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#121212]/60 relative overflow-hidden shadow-sm">
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-[#888888]">{t('history.inboundRefills', 'Inbound Refills')}</p>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
            <h3 className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {formatNumber(summary?.totalFuelInLiters || 0, 1)}
              <span className="text-[10px] sm:text-xs font-normal text-slate-400 dark:text-[#888888] ml-1 font-sans">L</span>
            </h3>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Droplet className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-[10px] font-mono text-slate-400 dark:text-[#888888] mt-1 truncate">{t('history.restocked', 'Restocked')}</p>
        </div>

        {/* Card 3: Transactions */}
        <div className="framer-card p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#121212]/60 relative overflow-hidden shadow-sm">
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-[#888888]">{t('history.transactions', 'Transactions')}</p>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
            <h3 className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {summary?.totalTransactions || 0}
              <span className="text-[10px] sm:text-xs font-normal text-slate-400 dark:text-[#888888] ml-1 font-sans">{t('common.units', 'Logs')}</span>
            </h3>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-slate-600 dark:text-white/70">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-[10px] font-mono text-slate-400 dark:text-[#888888] mt-1 truncate">{t('history.monthlyRecords', 'Monthly records')}</p>
        </div>

        {/* Card 4: Active Units */}
        <div className="framer-card p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#121212]/60 relative overflow-hidden shadow-sm">
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-[#888888]">{t('history.activeUnits', 'Active Units')}</p>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
            <h3 className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {summary?.distinctUnits || 0}
              <span className="text-[10px] sm:text-xs font-normal text-slate-400 dark:text-[#888888] ml-1 font-sans">{t('common.units', 'Units')}</span>
            </h3>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-slate-600 dark:text-white/70">
              <Truck className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-[10px] font-mono text-slate-400 dark:text-[#888888] mt-1 truncate">{t('history.fuelledFleets', 'Fuelled fleets')}</p>
        </div>

        {/* Card 5: Sheet Tab Sync */}
        <div className="framer-card p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#121212]/60 relative overflow-hidden shadow-sm">
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-[#888888]">{t('history.sheetSync', 'Sheet Tab Sync')}</p>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
            <h3 className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {summary?.syncedCount || 0}
              <span className="text-[10px] sm:text-xs font-normal text-slate-400 dark:text-[#888888] ml-1 font-sans">
                / {summary?.totalTransactions || 0}
              </span>
            </h3>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-slate-600 dark:text-white/70">
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-[10px] font-mono text-slate-400 dark:text-[#888888] mt-1 truncate" title={`Tab: ${selectedMonthLabel}`}>
            Tab: {selectedMonthLabel}
          </p>
        </div>
      </div>

      {/* Search & Filter Toolbar matching /dispenser form & inputs */}
      <div className="framer-card p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#121212]/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search input with rounded-full pill */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#666666]" />
          <input
            type="text"
            placeholder={t('history.searchPlaceholder', 'Search unit code, operator, fuelman, or category...')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#666666] focus:outline-none focus:border-slate-400 dark:focus:border-white/30 transition font-mono"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Shift filter pill */}
          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] px-3 py-1.5 rounded-full text-xs text-slate-700 dark:text-white">
            <span className="text-slate-400 dark:text-[#888888]">{t('history.shiftFilter', 'Shift')}:</span>
            <select
              value={shiftFilter}
              onChange={(e) => {
                setShiftFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-white dark:bg-[#121212] text-slate-900 dark:text-white">{t('history.allShifts', 'ALL SHIFTS')}</option>
              <option value="SHIFT 1" className="bg-white dark:bg-[#121212] text-slate-900 dark:text-white">{t('history.shift1', 'SHIFT 1 (Day)')}</option>
              <option value="SHIFT 2" className="bg-white dark:bg-[#121212] text-slate-900 dark:text-white">{t('history.shift2', 'SHIFT 2 (Night)')}</option>
            </select>
          </div>

          {/* Sync filter pill */}
          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] px-3 py-1.5 rounded-full text-xs text-slate-700 dark:text-white">
            <span className="text-slate-400 dark:text-[#888888]">{t('history.syncFilter', 'Sync')}:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-white dark:bg-[#121212] text-slate-900 dark:text-white">{t('history.allStatus', 'ALL STATUS')}</option>
              <option value="SYNCED" className="bg-white dark:bg-[#121212] text-slate-900 dark:text-white">{t('history.synced', 'SYNCED')}</option>
              <option value="PENDING" className="bg-white dark:bg-[#121212] text-slate-900 dark:text-white">{t('history.pending', 'PENDING')}</option>
              <option value="FAILED" className="bg-white dark:bg-[#121212] text-slate-900 dark:text-white">{t('history.failed', 'FAILED')}</option>
            </select>
          </div>

          {/* Refresh button pill */}
          <button
            onClick={() => refetchLogs()}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-white/70 transition"
            title="Refresh logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 15 Operational Columns Table matching ShiftLogTable.tsx */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] shadow-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#111111] border-b border-slate-200 dark:border-white/[0.06] text-[11px] font-medium text-slate-500 dark:text-[#888888]">
              <th className="py-3 px-3.5 text-center">{t('history.colNo', 'NO')}</th>
              <th className="py-3 px-3.5">{t('history.colUnit', 'NO UNIT')}</th>
              <th className="py-3 px-3.5">{t('history.colCategory', 'KATEGORI')}</th>
              <th className="py-3 px-3.5">{t('history.colMerk', 'MERK / TYPE')}</th>
              <th className="py-3 px-3.5 text-center">{t('history.colDate', 'DATE')}</th>
              <th className="py-3 px-3.5 text-center">{t('history.colTime', 'JAM')}</th>
              <th className="py-3 px-3.5 text-right">{t('history.colKm', 'KM')}</th>
              <th className="py-3 px-3.5 text-right">{t('history.colHm', 'HM')}</th>
              <th className="py-3 px-3.5 text-right text-emerald-600 dark:text-emerald-400">{t('history.colFuelIn', 'FUEL IN')}</th>
              <th className="py-3 px-3.5 text-right text-slate-900 dark:text-white font-semibold">{t('history.colQtyOut', 'QTY OUT ( L )')}</th>
              <th className="py-3 px-3.5">{t('history.colOperator', 'OPERATOR')}</th>
              <th className="py-3 px-3.5 text-center">{t('history.colShift', 'SHIFT')}</th>
              <th className="py-3 px-3.5">{t('history.colFuelman', 'FUELMAN')}</th>
              <th className="py-3 px-3.5">{t('history.colTank', 'TANKI')}</th>
              <th className="py-3 px-3.5 text-center">{t('history.colSync', 'SHEETS SYNC')}</th>
              {canManage && (
                <th className="py-3 px-3.5 text-center">{t('history.colActions', 'AKSI')}</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] font-mono text-[11px]">
            {isLoadingLogs ? (
              <tr>
                <td colSpan={canManage ? 16 : 15} className="p-8 text-center text-slate-600 dark:text-slate-400 text-xs font-mono">
                  <div className="inline-block w-5 h-5 border-2 border-slate-300 dark:border-white/20 border-t-slate-900 dark:border-t-white rounded-full animate-spin mb-2" />
                  <p>{t('history.loadingMonth', 'Loading historical records...')} {selectedMonthLabel}...</p>
                </td>
              </tr>
            ) : paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 16 : 15} className="py-12 px-4 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <CalendarClock className="w-8 h-8 text-slate-400 dark:text-[#555555]" />
                    <div className="text-xs font-medium text-slate-500 dark:text-[#888888]">
                      {t('history.noTransactions', 'No transactions recorded for this period.')}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedLogs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors text-slate-800 dark:text-white/90"
                >
                  <td className="py-3 px-3.5 text-center text-slate-400 dark:text-[#777777]">{log.no}</td>
                  <td className="py-3 px-3.5 font-semibold text-slate-900 dark:text-white">
                    <div className="flex items-center space-x-1.5">
                      <span>{log.unitCode}</span>
                      {log.bypassValidation && (
                        <span
                          title={`Bypass: ${log.bypassReason || 'Admin authorized'}`}
                          className="text-amber-500 dark:text-amber-400 cursor-help"
                        >
                          <AlertTriangle className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-slate-500 dark:text-[#888888] font-sans text-xs">{log.category || '-'}</td>
                  <td className="py-3 px-3.5 text-slate-500 dark:text-[#888888] font-sans text-xs truncate max-w-[120px]">
                    {log.unit?.makeModel || '-'}
                  </td>
                  <td className="py-3 px-3.5 text-center text-slate-600 dark:text-[#888888]">{log.dateStr}</td>
                  <td className="py-3 px-3.5 text-center text-slate-600 dark:text-[#888888]">{log.jamStr || '-'}</td>
                  <td className="py-3 px-3.5 text-right text-slate-700 dark:text-slate-300">{formatNumber(log.currentKm, 1)}</td>
                  <td className="py-3 px-3.5 text-right text-slate-700 dark:text-slate-300">{formatNumber(log.currentHm, 1)}</td>
                  <td className="py-3 px-3.5 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                    {log.fuelInLiters > 0 ? formatNumber(log.fuelInLiters, 1) : '-'}
                  </td>
                  <td className="py-3 px-3.5 text-right font-bold text-slate-900 dark:text-white text-xs">
                    {formatNumber(log.volumeLiters, 1)}
                  </td>
                  <td className="py-3 px-3.5 text-slate-800 dark:text-white/80 font-sans text-xs">{log.operator}</td>
                  <td className="py-3 px-3.5 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-[#999999] border border-slate-200 dark:border-white/[0.08]">
                      {log.shift}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-slate-500 dark:text-[#888888]">{log.fuelmanName}</td>
                  <td className="py-3 px-3.5 text-slate-500 dark:text-[#888888] truncate max-w-[110px]">
                    {log.tank?.name || '-'}
                  </td>
                  <td className="py-3 px-3.5 text-center">
                    <SyncStatusBadge status={log.syncStatus} />
                  </td>
                  {canManage && (
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleOpenEdit(log)}
                          title="Edit Log"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingLog(log)}
                          title="Hapus Log"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Footer matching /dispenser table card */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-[#888888] bg-slate-50/80 dark:bg-[#111111]/60">
          <div>
            {lang === 'id' ? 'Menampilkan' : 'Showing'} <span className="font-semibold text-slate-900 dark:text-white">{filteredLogs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> {lang === 'id' ? 'hingga' : 'to'}{' '}
            <span className="font-semibold text-slate-900 dark:text-white">
              {Math.min(currentPage * itemsPerPage, filteredLogs.length)}
            </span>{' '}
            {lang === 'id' ? 'dari' : 'of'} <span className="font-semibold text-slate-900 dark:text-white">{filteredLogs.length}</span> {lang === 'id' ? 'catatan transaksi' : 'records'} ({selectedMonthLabel})
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-full border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] text-slate-700 dark:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/[0.1] shadow-sm transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-white/80">
              {lang === 'id' ? 'Halaman' : 'Page'} {currentPage} {lang === 'id' ? 'dari' : 'of'} {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-full border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] text-slate-700 dark:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/[0.1] shadow-sm transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Excel Bulk Import Modal */}
      <ExcelImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        defaultTab="fuel"
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['monthlyFuelLogs', monthStr] });
          queryClient.invalidateQueries({ queryKey: ['monthlySummary', selectedYear, selectedMonth] });
          queryClient.invalidateQueries({ queryKey: ['fuelLogs'] });
        }}
      />

      {/* Historical Log Add/Edit Modal */}
      <HistoricalLogModal
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          setEditingLog(null);
        }}
        editingLog={editingLog}
        defaultDate={`${selectedYear}-${selectedMonth}-01`}
        onSuccess={() => {
          setIsLogModalOpen(false);
          setEditingLog(null);
          queryClient.invalidateQueries({ queryKey: ['monthlyFuelLogs', monthStr] });
          queryClient.invalidateQueries({ queryKey: ['monthlySummary', selectedYear, selectedMonth] });
          queryClient.invalidateQueries({ queryKey: ['fuelLogs'] });
          setSyncFeedback({
            type: 'success',
            message: editingLog ? 'Log berhasil diperbarui.' : 'Log historis berhasil ditambahkan.',
          });
          setTimeout(() => setSyncFeedback(null), 6000);
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingLog)}
        log={deletingLog}
        onClose={() => setDeletingLog(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}
