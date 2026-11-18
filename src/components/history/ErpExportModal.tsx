'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  FileSpreadsheet,
  Download,
  X,
  Loader2,
  Building2,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'react-toastify';
import { useLanguage } from '@/components/providers/LanguageProvider';
import ModalPortal from '@/components/shared/ModalPortal';

const MONTH_NAMES_ERP = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
];

interface ErpSummaryResponse {
  site: string;
  totalLogs: number;
  multiEntry: { count: number; volume: number };
  siteInternal: { count: number; volume: number };
  otherConsumption: { count: number; volume: number };
  details?: {
    crossSite: { count: number; volume: number };
    unregistered: { count: number; volume: number; sampleUnits: string[] };
  };
}

interface ErpExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedYear: string;
  selectedMonth: string;
  selectedSite: string;
  siteLabel: string;
  initialFormat?: 'csv' | 'xlsx';
}

export default function ErpExportModal({
  isOpen,
  onClose,
  selectedYear,
  selectedMonth,
  selectedSite,
  siteLabel,
  initialFormat = 'csv',
}: ErpExportModalProps) {
  const { lang } = useLanguage();
  const [format, setFormat] = useState<'csv' | 'xlsx'>(initialFormat);
  const [scope, setScope] = useState<'multi_entry' | 'other_consumption'>('multi_entry');
  const [isDownloading, setIsDownloading] = useState(false);

  // Month Name in ERP format: e.g. 2026_JANUARY
  const monthIdx = parseInt(selectedMonth, 10) - 1;
  const monthNameErp = monthIdx >= 0 && monthIdx < 12 ? MONTH_NAMES_ERP[monthIdx] : selectedMonth;
  const targetSiteCode = selectedSite === 'MUARA_PAHU' ? 'MUARAPAHU' : 'SENYIUR';

  // Computed File Name
  const scopeSuffix = scope === 'other_consumption' ? '_OTHER_CONSUMPTION' : '';
  const computedFileName = `UPLOAD_ERP_FUEL_${targetSiteCode}${scopeSuffix}_${selectedYear}_${monthNameErp}.${format}`;

  // Fetch ERP Telemetry Breakdown
  const monthStr = `${selectedYear}-${selectedMonth}`;
  const siteParam = selectedSite && selectedSite !== 'ALL' ? `&site=${selectedSite}` : '&site=SENYIUR';

  const { data: summary, isLoading: isLoadingSummary } = useQuery<ErpSummaryResponse>({
    queryKey: ['erpSummary', selectedYear, selectedMonth, selectedSite],
    queryFn: async () => {
      const res = await api.get(`/excel/erp-summary?monthStr=${monthStr}${siteParam}`);
      return res.data.data;
    },
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const endpoint = format === 'csv' ? '/excel/export-erp-csv' : '/excel/export-erp';
      const scopeParam = `&scope=${scope}`;
      const url = `${endpoint}?monthStr=${monthStr}${siteParam}${scopeParam}`;

      const res = await api.get(url, { responseType: 'blob' });
      const mime =
        format === 'csv'
          ? 'text/csv;charset=utf-8;'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: mime }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', computedFileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      toast.success(
        lang === 'id'
          ? `File Syshab (${computedFileName}) berhasil diunduh!`
          : `Syshab file (${computedFileName}) downloaded successfully!`
      );
      onClose();
    } catch (e: any) {
      toast.error(
        lang === 'id' ? 'Gagal mengunduh file export Syshab.' : 'Failed to download Syshab export file.'
      );
      console.error('Download Syshab error:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  const getScopeCount = () => {
    if (!summary) return 0;
    if (scope === 'multi_entry') return summary.siteInternal.count;
    return summary.otherConsumption.count;
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-xl bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-white/[0.06] flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-slate-700 dark:text-white/80 shrink-0">
                <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-tight">
                  {lang === 'id' ? 'Export Upload Syshab' : 'Export Upload Syshab'}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-[#888888] mt-0.5">
                  {lang === 'id'
                    ? 'Format standar 15 kolom terintegrasi ERP Syshab'
                    : 'Standard 15-column format matching Syshab ERP'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isDownloading}
              className="p-1.5 sm:p-2 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(92vh-140px)] text-xs">
            {/* Metadata & Format Segmented Control */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
              {/* Site & Period Info */}
              <div className="flex items-center space-x-2 text-slate-600 dark:text-neutral-300">
                <div className="flex items-center space-x-1.5 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" />
                  <span>{siteLabel}</span>
                </div>
                <span className="text-slate-300 dark:text-neutral-700">•</span>
                <div className="flex items-center space-x-1 font-mono text-[11px] text-slate-500 dark:text-neutral-400">
                  <Calendar className="w-3 h-3 text-slate-400 dark:text-neutral-500" />
                  <span>{selectedYear}_{monthNameErp}</span>
                </div>
              </div>

              {/* Segmented Format Switcher */}
              <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-200/60 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.06] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFormat('csv')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 ${
                    format === 'csv'
                      ? 'bg-white dark:bg-[#1A1A1A] text-slate-900 dark:text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('xlsx')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 ${
                    format === 'xlsx'
                      ? 'bg-white dark:bg-[#1A1A1A] text-slate-900 dark:text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className="w-3 h-3" />
                  <span>Excel</span>
                </button>
              </div>
            </div>

            {/* Scope Selection: 2 OPSI */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-[#777]">
                  {lang === 'id' ? 'Pilih Opsi Ekspor Syshab' : 'Select Syshab Export Option'}
                </label>
                {isLoadingSummary && (
                  <span className="text-[10px] text-slate-400 dark:text-neutral-500 flex items-center space-x-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    <span>Memuat data...</span>
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                {/* Opsi 1: Multi Entry Upload Syshab */}
                <label
                  onClick={() => setScope('multi_entry')}
                  className={`block p-3.5 rounded-2xl border transition cursor-pointer ${
                    scope === 'multi_entry'
                      ? 'bg-slate-900/[0.04] dark:bg-white/[0.06] border-slate-900 dark:border-white/40 ring-1 ring-slate-900/10 dark:ring-white/10'
                      : 'bg-white dark:bg-transparent border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <input
                        type="radio"
                        name="syshab_scope"
                        checked={scope === 'multi_entry'}
                        onChange={() => setScope('multi_entry')}
                        className="mt-0.5 accent-slate-900 dark:accent-white cursor-pointer"
                      />
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
                          Multi Entry Upload Syshab
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5 leading-snug">
                          {lang === 'id'
                            ? `Unit resmi yang terdaftar di Master Equipment ${siteLabel}`
                            : `Official equipment registered in ${siteLabel} Master Equipment`}
                        </div>
                      </div>
                    </div>
                    {summary && (
                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-semibold text-slate-800 dark:text-white">
                          {summary.siteInternal.count.toLocaleString()} trx
                        </span>
                        <div className="font-mono text-[11px] text-slate-500 dark:text-neutral-400">
                          {summary.siteInternal.volume.toLocaleString()} L
                        </div>
                      </div>
                    )}
                  </div>
                </label>

                {/* Opsi 2: Other Consumption */}
                <label
                  onClick={() => setScope('other_consumption')}
                  className={`block p-3.5 rounded-2xl border transition cursor-pointer ${
                    scope === 'other_consumption'
                      ? 'bg-slate-900/[0.04] dark:bg-white/[0.06] border-slate-900 dark:border-white/40 ring-1 ring-slate-900/10 dark:ring-white/10'
                      : 'bg-white dark:bg-transparent border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <input
                        type="radio"
                        name="syshab_scope"
                        checked={scope === 'other_consumption'}
                        onChange={() => setScope('other_consumption')}
                        className="mt-0.5 accent-slate-900 dark:accent-white cursor-pointer"
                      />
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
                          Other Consumption
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5 leading-snug">
                          {lang === 'id'
                            ? 'Unit non-Master Equipment'
                            : 'Non-Master Equipment units'}
                        </div>
                      </div>
                    </div>
                    {summary && (
                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-semibold text-slate-800 dark:text-white">
                          {summary.otherConsumption.count.toLocaleString()} trx
                        </span>
                        <div className="font-mono text-[11px] text-slate-500 dark:text-neutral-400">
                          {summary.otherConsumption.volume.toLocaleString()} L
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Reconciliation Note: 100% Volume Accounted For */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06] text-slate-600 dark:text-neutral-300">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-[11px]">
                  {lang === 'id' ? 'Total konsumsi bulan ini terakomodasi 100%:' : '100% of fuel records accounted for:'}
                </span>
              </div>
              {summary && (
                <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-neutral-200">
                  {summary.totalLogs.toLocaleString()} trx ({(summary.siteInternal.volume + summary.otherConsumption.volume).toLocaleString()} L)
                </span>
              )}
            </div>

            {/* Target File Preview */}
            <div className="p-3 rounded-2xl bg-slate-100/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 min-w-0">
                <FileSpreadsheet className="w-4 h-4 text-slate-400 dark:text-neutral-500 shrink-0" />
                <span className="font-mono text-xs text-slate-700 dark:text-neutral-300 truncate font-medium">
                  {computedFileName}
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/[0.06] text-slate-600 dark:text-neutral-400 shrink-0 font-medium">
                {format}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-white/[0.06] flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="text-xs text-slate-500 dark:text-neutral-400">
              {summary && (
                <span>
                  <strong className="font-mono font-semibold text-slate-800 dark:text-neutral-200">
                    {getScopeCount().toLocaleString()}
                  </strong>{' '}
                  {lang === 'id' ? 'baris data' : 'data rows'}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isDownloading}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] text-xs font-semibold text-slate-700 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition cursor-pointer"
              >
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{lang === 'id' ? 'Mengunduh...' : 'Downloading...'}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>{lang === 'id' ? 'Unduh File Syshab' : 'Download Syshab File'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
