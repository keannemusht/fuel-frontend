'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { FuelLog, MonthlySummary } from '@/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import {
  CalendarClock,
  Calendar,
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
  Pencil,
  Trash2,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  X,
  CloudUpload,
  Download,
  Upload,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { useSyncTelemetry } from '@/hooks/useFuelData';
import { useSite } from '@/components/providers/SiteProvider';
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
  const router = useRouter();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGEMENT';
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (user && user.role === 'FUELMAN') {
      router.replace('/dispenser');
    }
  }, [user, router]);

  if (user?.role === 'FUELMAN') {
    return null;
  }

  const now = new Date();
  const currentYearStr = String(now.getFullYear());
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');

  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [shiftFilter, setShiftFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [showDataMenu, setShowDataMenu] = useState<boolean>(false);
  const dataActionsRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 25;

  // Close filter dropdown and data menu on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
      if (dataActionsRef.current && !dataActionsRef.current.contains(event.target as Node)) {
        setShowDataMenu(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowFilterDropdown(false);
        setShowDataMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // CRUD State
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [editingLog, setEditingLog] = useState<FuelLog | null>(null);
  const [deletingLog, setDeletingLog] = useState<FuelLog | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const { site: selectedSite, siteLabel } = useSite();
  const { data: syncData } = useSyncTelemetry();
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isExportingErp, setIsExportingErp] = useState<boolean>(false);
  const [isExportingErpCsv, setIsExportingErpCsv] = useState<boolean>(false);

  const monthNames = lang === 'id' ? MONTH_NAMES_ID : MONTH_NAMES_EN;

  const [syncingLogId, setSyncingLogId] = useState<string | null>(null);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const siteParam = selectedSite && selectedSite !== 'ALL' ? `&site=${selectedSite}` : '';
      const res = await api.get(`/excel/export?monthStr=${selectedYear}-${selectedMonth}${siteParam}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BATARA_FUEL_MONITORING_${selectedYear}_${selectedMonth}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(
        lang === 'id'
          ? `Laporan Excel ${selectedMonthLabel} berhasil diunduh!`
          : `Excel report for ${selectedMonthLabel} downloaded successfully!`
      );
    } catch (e: any) {
      toast.error(
        lang === 'id'
          ? 'Gagal mengunduh laporan Excel.'
          : 'Failed to download Excel report.'
      );
      console.error('Export error:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportErp = async () => {
    try {
      setIsExportingErp(true);
      const siteParam = selectedSite && selectedSite !== 'ALL' ? `&site=${selectedSite}` : '&site=SENYIUR';
      const res = await api.get(`/excel/export-erp?monthStr=${selectedYear}-${selectedMonth}${siteParam}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const targetSite = selectedSite === 'MUARA_PAHU' ? 'MUARAPAHU' : 'SENYIUR';
      link.setAttribute('download', `UPLOAD_ERP_FUEL_${targetSite}_${selectedYear}_${selectedMonth}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(
        lang === 'id'
          ? `File format upload ERP (${siteLabel}) berhasil diunduh!`
          : `ERP upload file for ${siteLabel} downloaded successfully!`
      );
    } catch (e: any) {
      toast.error(
        lang === 'id'
          ? 'Gagal mengunduh format ERP.'
          : 'Failed to download ERP format file.'
      );
      console.error('Export ERP error:', e);
    } finally {
      setIsExportingErp(false);
    }
  };

  const handleExportErpCsv = async () => {
    try {
      setIsExportingErpCsv(true);
      const siteParam = selectedSite && selectedSite !== 'ALL' ? `&site=${selectedSite}` : '&site=SENYIUR';
      const res = await api.get(`/excel/export-erp-csv?monthStr=${selectedYear}-${selectedMonth}${siteParam}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      const targetSite = selectedSite === 'MUARA_PAHU' ? 'MUARAPAHU' : 'SENYIUR';
      link.setAttribute('download', `UPLOAD_ERP_FUEL_${targetSite}_${selectedYear}_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(
        lang === 'id'
          ? `File CSV format upload ERP (${siteLabel}) berhasil diunduh!`
          : `ERP CSV upload file for ${siteLabel} downloaded successfully!`
      );
    } catch (e: any) {
      toast.error(
        lang === 'id'
          ? 'Gagal mengunduh format ERP CSV.'
          : 'Failed to download ERP CSV format file.'
      );
      console.error('Export ERP CSV error:', e);
    } finally {
      setIsExportingErpCsv(false);
    }
  };

  const handleSyncSingleLog = async (log: FuelLog) => {
    setSyncingLogId(log.id);
    try {
      const res = await api.post(`/fuel/logs/${log.id}/sync`);
      const msg =
        res.data?.message ||
        (lang === 'id'
          ? `Log #${log.no || log.logNumber} berhasil disinkronkan ke Google Sheets!`
          : `Log #${log.no || log.logNumber} synced to Google Sheets!`);
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ['monthlyFuelLogs', monthStr, selectedSite] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary', selectedYear, selectedMonth, selectedSite] });
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        (lang === 'id' ? 'Gagal sinkronisasi ke Google Sheets' : 'Failed to sync to Google Sheets');
      toast.error(msg);
    } finally {
      setSyncingLogId(null);
    }
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
        ? `Berhasil menghapus log ${deletingLog.logNumber || `#${deletingLog.no ?? ''}`} (${deletingLog.unitCode})`
        : `Successfully deleted log ${deletingLog.logNumber || `#${deletingLog.no ?? ''}`} (${deletingLog.unitCode})`;
      setSyncFeedback({
        type: 'success',
        message: successMsg,
      });
      toast.success(successMsg);
      setDeletingLog(null);
      queryClient.invalidateQueries({ queryKey: ['monthlyFuelLogs', monthStr, selectedSite] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary', selectedYear, selectedMonth, selectedSite] });
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
    isFetching: isFetchingLogs,
    refetch: refetchLogs,
  } = useQuery<FuelLog[]>({
    queryKey: ['monthlyFuelLogs', monthStr, selectedSite],
    queryFn: async () => {
      const siteParam = selectedSite && selectedSite !== 'ALL' ? `&site=${selectedSite}` : '';
      const res = await api.get(`/fuel/logs?monthStr=${monthStr}&limit=1000${siteParam}`);
      return res.data.data;
    },
  });

  // 2. Fetch Monthly Summary KPIs
  const { data: summary } = useQuery<MonthlySummary>({
    queryKey: ['monthlySummary', selectedYear, selectedMonth, selectedSite],
    queryFn: async () => {
      const siteParam = selectedSite && selectedSite !== 'ALL' ? `&site=${selectedSite}` : '';
      const res = await api.get(`/fuel/monthly-summary?year=${selectedYear}&month=${selectedMonth}${siteParam}`);
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
      const syncedCount = data.data?.totalSynced ?? data.data?.recordsSynced ?? 0;
      const sheetTab = data.data?.targetSheet ?? data.data?.tabName ?? monthStr;
      const successMsg =
        lang === 'id'
          ? `Berhasil mensinkronkan ${syncedCount} data ke tab sheet "${sheetTab}"!`
          : `Successfully synced ${syncedCount} records to sheet tab "${sheetTab}"!`;
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
      const msg = err.response?.data?.error || err.message || (lang === 'id' ? 'Gagal sinkronisasi data bulanan ke Google Sheets' : 'Failed to sync monthly records to Google Sheets');
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

          {/* Unified Data & Export Dropdown Button */}
          <div className="relative" ref={dataActionsRef}>
            <button
              type="button"
              onClick={() => setShowDataMenu((prev) => !prev)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-800 dark:text-white font-medium text-xs border border-slate-200 dark:border-white/[0.1] active:scale-95 transition-all shadow-xs cursor-pointer"
              title={lang === 'id' ? 'Menu Impor, Ekspor Excel, Ekspor ERP & Google Sheets' : 'Import, Excel Export, ERP Export & Google Sheets menu'}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 shrink-0" />
              <span>{lang === 'id' ? 'Data & Ekspor' : 'Data & Export'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showDataMenu ? 'rotate-180' : ''}`} />
            </button>

            {showDataMenu && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-[#121212] border border-slate-200/90 dark:border-white/10 p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1.5 pb-2 mb-1 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-[#777]">
                    {lang === 'id' ? 'Aksi Data & Ekspor' : 'Data & Export Actions'}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/[0.08]">
                    {siteLabel}
                  </span>
                </div>

                <div className="space-y-0.5 text-xs">
                  {/* Option 1: Import Excel */}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDataMenu(false);
                        setShowImportModal(true);
                      }}
                      className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition text-left group cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white shrink-0 transition-colors" />
                      <span className="font-medium flex-1">
                        {lang === 'id' ? 'Import Data Excel' : 'Import Excel Data'}
                      </span>
                    </button>
                  )}

                  {/* Option 2: Export Excel Standar */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowDataMenu(false);
                      handleExportExcel();
                    }}
                    disabled={isExporting}
                    className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition text-left group cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white shrink-0 transition-colors" />
                    <span className="font-medium flex-1">
                      {isExporting
                        ? (lang === 'id' ? 'Mengekspor Excel...' : 'Exporting Excel...')
                        : (lang === 'id' ? 'Export Excel (Standar)' : 'Export Excel (Standard)')}
                    </span>
                  </button>

                  {/* Option 3: Export ERP Excel */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowDataMenu(false);
                      handleExportErp();
                    }}
                    disabled={isExportingErp}
                    className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition text-left group cursor-pointer disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white shrink-0 transition-colors" />
                    <span className="font-medium flex-1 truncate">
                      {isExportingErp
                        ? (lang === 'id' ? 'Mengekspor ERP (Excel)...' : 'Exporting ERP (Excel)...')
                        : (lang === 'id' ? 'Export Format ERP (Excel)' : 'Export ERP Format (Excel)')}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-white/[0.08]">
                      .xlsx
                    </span>
                  </button>

                  {/* Option 4: Export ERP CSV */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowDataMenu(false);
                      handleExportErpCsv();
                    }}
                    disabled={isExportingErpCsv}
                    className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition text-left group cursor-pointer disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white shrink-0 transition-colors" />
                    <span className="font-medium flex-1 truncate">
                      {isExportingErpCsv
                        ? (lang === 'id' ? 'Mengekspor ERP (CSV)...' : 'Exporting ERP (CSV)...')
                        : (lang === 'id' ? 'Export Format ERP (CSV)' : 'Export ERP Format (CSV)')}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-white/[0.08]">
                      .csv
                    </span>
                  </button>

                  {/* Option 5: Google Sheets */}
                  {syncData?.spreadsheetUrl ? (
                    <a
                      href={syncData.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowDataMenu(false)}
                      className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition text-left group cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white shrink-0 transition-colors" />
                      <span className="font-medium flex-1">
                        {lang === 'id' ? 'Buka Google Sheets' : 'Open Google Sheets'}
                      </span>
                    </a>
                  ) : null}
                </div>
              </div>
            )}
          </div>
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

      {/* Search & Filter Toolbar */}
      {(() => {
        const isFiltered = shiftFilter !== 'ALL' || statusFilter !== 'ALL';
        const activeFilterCount = (shiftFilter !== 'ALL' ? 1 : 0) + (statusFilter !== 'ALL' ? 1 : 0);

        return (
          <div className="space-y-2.5">
            <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-20">
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
                  className="w-full pl-9 pr-9 py-2 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#666666] focus:outline-none focus:border-slate-400 dark:focus:border-white/30 transition font-mono"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
                    title="Hapus pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Action Controls: Dedicated Button Filter */}
              <div className="flex items-center space-x-2 self-end md:self-auto">
                {/* Dedicated Button Filter with Popover matching /users */}
                <div className="relative" ref={filterRef}>
                  <button
                    onClick={() => setShowFilterDropdown((prev) => !prev)}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all shadow-xs active:scale-95 cursor-pointer ${
                      activeFilterCount > 0
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-black border-slate-900 dark:border-white'
                        : 'bg-white dark:bg-[#0D0D0D] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>{t('common.filter', 'Filter')}</span>
                    {activeFilterCount > 0 && (
                      <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center bg-emerald-500 text-white font-mono">
                        {activeFilterCount}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        showFilterDropdown ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Filter Popover Dropdown (100% Opaque Solid Card) */}
                  {showFilterDropdown && (
                    <div className="filter-dropdown-card absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl p-4 z-50 animate-in fade-in duration-150 shadow-2xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/[0.12]">
                      {/* Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
                        <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-semibold text-xs">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-white/60" />
                          <span>{lang === 'id' ? 'Filter Riwayat' : 'Filter History'}</span>
                        </div>
                        {activeFilterCount > 0 && (
                          <button
                            onClick={() => {
                              setShiftFilter('ALL');
                              setStatusFilter('ALL');
                              setCurrentPage(1);
                            }}
                            className="text-[11px] font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400 flex items-center space-x-1 transition cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-4 py-3">
                        {/* Shift Filter */}
                        <div>
                          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-[#777777] block mb-2">
                            {t('history.shiftFilter', 'Shift Kerja')}
                          </span>
                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              onClick={() => {
                                setShiftFilter('ALL');
                                setCurrentPage(1);
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-center transition-all cursor-pointer ${
                                shiftFilter === 'ALL'
                                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-semibold shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] text-slate-700 dark:text-[#888888] dark:hover:bg-white/[0.08]'
                              }`}
                            >
                              {t('history.allShifts', 'Semua')}
                            </button>
                            <button
                              onClick={() => {
                                setShiftFilter('SHIFT 1');
                                setCurrentPage(1);
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-center transition-all cursor-pointer ${
                                shiftFilter === 'SHIFT 1'
                                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-semibold shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] text-slate-700 dark:text-[#888888] dark:hover:bg-white/[0.08]'
                              }`}
                            >
                              Shift 1
                            </button>
                            <button
                              onClick={() => {
                                setShiftFilter('SHIFT 2');
                                setCurrentPage(1);
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-center transition-all cursor-pointer ${
                                shiftFilter === 'SHIFT 2'
                                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-semibold shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] text-slate-700 dark:text-[#888888] dark:hover:bg-white/[0.08]'
                              }`}
                            >
                              Shift 2
                            </button>
                          </div>
                        </div>

                        {/* Sync Status Filter */}
                        <div>
                          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-[#777777] block mb-2">
                            {t('history.syncFilter', 'Status Sinkronisasi')}
                          </span>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={() => {
                                setStatusFilter('ALL');
                                setCurrentPage(1);
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-all cursor-pointer ${
                                statusFilter === 'ALL'
                                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-semibold shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] text-slate-700 dark:text-[#888888] dark:hover:bg-white/[0.08]'
                              }`}
                            >
                              {t('history.allStatus', 'Semua Status')}
                            </button>
                            <button
                              onClick={() => {
                                setStatusFilter('SYNCED');
                                setCurrentPage(1);
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all cursor-pointer ${
                                statusFilter === 'SYNCED'
                                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-semibold shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] text-slate-700 dark:text-[#888888] dark:hover:bg-white/[0.08]'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span>{t('history.synced', 'SYNCED')}</span>
                            </button>
                            <button
                              onClick={() => {
                                setStatusFilter('PENDING');
                                setCurrentPage(1);
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all cursor-pointer ${
                                statusFilter === 'PENDING'
                                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-semibold shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] text-slate-700 dark:text-[#888888] dark:hover:bg-white/[0.08]'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span>{t('history.pending', 'PENDING')}</span>
                            </button>
                            <button
                              onClick={() => {
                                setStatusFilter('FAILED');
                                setCurrentPage(1);
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all cursor-pointer ${
                                statusFilter === 'FAILED'
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 font-semibold border border-rose-300 dark:border-rose-500/30'
                                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] text-slate-700 dark:text-[#888888] dark:hover:bg-white/[0.08]'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                              <span>{t('history.failed', 'FAILED')}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                        <span className="text-[11px] font-mono text-slate-400 dark:text-[#666]">
                          {filteredLogs.length} {lang === 'id' ? 'transaksi' : 'records'}
                        </span>
                        <button
                          onClick={() => setShowFilterDropdown(false)}
                          className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-800 dark:text-white text-xs font-semibold transition cursor-pointer"
                        >
                          {lang === 'id' ? 'Selesai' : 'Done'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Active Filter Chips / Badges matching /users */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5 animate-in fade-in duration-150">
                <span className="text-[11px] text-slate-400 dark:text-[#666] font-medium">
                  {lang === 'id' ? 'Filter aktif:' : 'Active filters:'}
                </span>

                {shiftFilter !== 'ALL' && (
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.08]">
                    <span>
                      {t('history.shiftFilter', 'Shift')}:{' '}
                      <strong className="font-semibold text-slate-900 dark:text-white">{shiftFilter}</strong>
                    </span>
                    <button
                      onClick={() => {
                        setShiftFilter('ALL');
                        setCurrentPage(1);
                      }}
                      className="p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                      title="Hapus filter shift"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {statusFilter !== 'ALL' && (
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.08]">
                    <span>
                      {t('history.syncFilter', 'Sync')}:{' '}
                      <strong className="font-semibold text-slate-900 dark:text-white">{statusFilter}</strong>
                    </span>
                    <button
                      onClick={() => {
                        setStatusFilter('ALL');
                        setCurrentPage(1);
                      }}
                      className="p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                      title="Hapus filter status"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                <button
                  onClick={() => {
                    setShiftFilter('ALL');
                    setStatusFilter('ALL');
                    setCurrentPage(1);
                  }}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:underline ml-1 cursor-pointer"
                >
                  {lang === 'id' ? 'Hapus Semua' : 'Clear All'}
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* 15 Operational Columns Table matching ShiftLogTable.tsx */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] shadow-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#111111] border-b border-slate-200 dark:border-white/[0.06] text-[11px] font-medium text-slate-500 dark:text-[#888888]">
              <th className="py-3 px-3.5 text-left whitespace-nowrap">{t('history.colNo', 'NO ID.')}</th>
              <th className="py-3 px-3.5 text-left whitespace-nowrap">{t('history.colUnit', 'NO UNIT')}</th>
              <th className="py-3 px-3.5 text-left whitespace-nowrap">{t('history.colCategory', 'KATEGORI')}</th>
              <th className="py-3 px-3.5 text-left whitespace-nowrap">{t('history.colType', 'TYPE')}</th>
              <th className="py-3 px-3.5 text-left whitespace-nowrap">{t('history.colDate', 'DATE')}</th>
              <th className="py-3 px-3.5 text-left whitespace-nowrap">{t('history.colTime', 'JAM')}</th>
              <th className="py-3 px-3.5 text-left whitespace-nowrap">{t('history.colKm', 'KM')}</th>
              <th className="py-3 px-3.5 text-left whitespace-nowrap">{t('history.colHm', 'HM')}</th>
              <th className="py-3 px-3.5 text-left whitespace-nowrap text-emerald-600 dark:text-emerald-400">{t('history.colFuelIn', 'FUEL IN')}</th>
              <th className="py-3 px-3.5 text-left whitespace-nowrap text-slate-900 dark:text-white font-semibold">{t('history.colQtyOut', 'QTY OUT ( L )')}</th>
              <th className="py-3 px-3.5 text-left whitespace-nowrap">{t('history.colOperator', 'OPERATOR')}</th>
              <th className="py-3 px-3.5 text-left whitespace-nowrap">{t('history.colShift', 'SHIFT')}</th>
              <th className="py-3 px-3.5 text-left whitespace-nowrap">{t('history.colFuelman', 'FUELMAN')}</th>
              <th className="py-3 px-3.5 text-left whitespace-nowrap">{t('history.colTank', 'TANKI')}</th>
              <th className="py-3 px-3.5 text-left whitespace-nowrap">{t('history.colSync', 'SHEETS SYNC')}</th>
              {canManage && (
                <th className="py-3 px-3.5 text-left whitespace-nowrap">{t('history.colActions', 'AKSI')}</th>
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
                  className="align-middle hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors text-slate-800 dark:text-white/90"
                >
                  <td className="py-3 px-3.5 text-left font-mono text-[10px] text-slate-500 dark:text-[#888888] whitespace-nowrap">
                    {log.logNumber && (log.logNumber.startsWith('F-') || log.logNumber.startsWith('R-'))
                      ? log.logNumber
                      : (log.no || log.logNumber || '-')}
                  </td>
                  <td className="py-3 px-3.5 text-left font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    <div className="flex items-center space-x-1.5">
                      <span>{log.unitCode}</span>
                      {log.bypassValidation && log.unitCode !== 'PENGISIAN' && log.bypassReason !== 'Historical Google Sheets Sync' && (
                        <span
                          title={`Bypass: ${log.bypassReason || 'Admin authorized'}`}
                          className="text-amber-500 dark:text-amber-400 cursor-help"
                        >
                          <AlertTriangle className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-left text-slate-500 dark:text-[#888888] font-sans text-xs whitespace-nowrap">{log.category || '-'}</td>
                  <td className="py-3 px-3.5 text-left text-slate-500 dark:text-[#888888] font-sans text-xs truncate max-w-[120px]" title={log.unitCode === 'PENGISIAN' ? 'STORAGE_TANK' : (log.type || (log.unit as any)?.type || '-')}>
                    {log.unitCode === 'PENGISIAN' ? 'STORAGE_TANK' : (log.type || (log.unit as any)?.type || '-')}
                  </td>
                  <td className="py-3 px-3.5 text-left text-slate-600 dark:text-[#888888] whitespace-nowrap">{log.dateStr}</td>
                  <td className="py-3 px-3.5 text-left text-slate-600 dark:text-[#888888] whitespace-nowrap">{log.jamStr || '-'}</td>
                  <td className="py-3 px-3.5 text-left text-slate-700 dark:text-slate-300 whitespace-nowrap">{log.currentKm > 0 ? formatNumber(log.currentKm, 1) : '-'}</td>
                  <td className="py-3 px-3.5 text-left text-slate-700 dark:text-slate-300 whitespace-nowrap">{log.currentHm > 0 ? formatNumber(log.currentHm, 1) : '-'}</td>
                  <td className="py-3 px-3.5 text-left text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">
                    {log.fuelInLiters > 0 ? `+${formatNumber(log.fuelInLiters, 1)}` : '-'}
                  </td>
                  <td className="py-3 px-3.5 text-left font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    {log.volumeLiters > 0 ? formatNumber(log.volumeLiters, 1) : '-'}
                  </td>
                  <td className="py-3 px-3.5 text-left text-slate-800 dark:text-white/80 font-sans text-xs">
                    <div className="max-w-[200px] truncate font-medium" title={log.operator}>
                      {log.operator}
                    </div>
                    {Boolean(log.currentKwh && log.currentKwh > 0 && !log.operator.includes('Kwh')) && (
                      <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 block font-normal">
                        ({formatNumber(log.currentKwh ?? 0, 1)} Kwh)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3.5 text-left whitespace-nowrap">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-mono whitespace-nowrap bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-[#999999] border border-slate-200 dark:border-white/[0.08]">
                      {log.shift}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-left text-slate-500 dark:text-[#888888] whitespace-nowrap">{log.fuelmanName}</td>
                  <td className="py-3 px-3.5 text-left text-slate-500 dark:text-[#888888] truncate max-w-[120px]" title={log.tank?.name || '-'}>
                    {log.tank?.name || '-'}
                  </td>
                  <td className="py-3 px-3.5 text-left whitespace-nowrap">
                    <SyncStatusBadge status={log.syncStatus} />
                  </td>
                  {canManage && (
                    <td className="py-3 px-3.5 text-left whitespace-nowrap">
                      <div className="flex items-center justify-start space-x-1">
                        <button
                          onClick={() => handleSyncSingleLog(log)}
                          disabled={syncingLogId === log.id}
                          title={
                            log.syncStatus === 'SYNCED'
                              ? lang === 'id'
                                ? 'Sinkronkan ulang baris ini ke Google Sheets'
                                : 'Resync this row to Google Sheets'
                              : lang === 'id'
                              ? 'Sinkronkan baris ini ke Google Sheets'
                              : 'Sync this row to Google Sheets'
                          }
                          className={`p-1.5 rounded-lg transition-colors ${
                            syncingLogId === log.id
                              ? 'text-blue-500 animate-pulse bg-blue-500/10'
                              : log.syncStatus === 'SYNCED'
                              ? 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10'
                              : 'text-amber-500 hover:bg-amber-500/10'
                          }`}
                        >
                          <CloudUpload className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(log)}
                          title={lang === 'id' ? 'Edit Log' : 'Edit Log'}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingLog(log)}
                          title={lang === 'id' ? 'Hapus Log' : 'Delete Log'}
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
