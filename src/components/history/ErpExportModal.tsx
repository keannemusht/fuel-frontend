'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  X,
  Loader2,
  Building2,
  Layers,
  ShieldCheck,
  Check,
  Info,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'react-toastify';
import { useLanguage } from '@/components/providers/LanguageProvider';

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
  siteInternal: { count: number; volume: number };
  otherConsumption: { count: number; volume: number };
  allRegistered: { count: number; volume: number };
  unregistered: { count: number; volume: number; sampleUnits: string[] };
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
  const [scope, setScope] = useState<'site_only' | 'other_consumption' | 'all_registered'>('site_only');
  const [isDownloading, setIsDownloading] = useState(false);

  // Month Name in ERP format: e.g. 2026_JANUARY
  const monthIdx = parseInt(selectedMonth, 10) - 1;
  const monthNameErp = monthIdx >= 0 && monthIdx < 12 ? MONTH_NAMES_ERP[monthIdx] : selectedMonth;
  const targetSiteCode = selectedSite === 'MUARA_PAHU' ? 'MUARAPAHU' : 'SENYIUR';

  // Computed File Name
  const scopeSuffix =
    scope === 'other_consumption'
      ? '_OTHER_CONSUMPTION'
      : scope === 'all_registered'
      ? '_ALL_ERP'
      : '';
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
          ? `File ERP (${computedFileName}) berhasil diunduh!`
          : `ERP file (${computedFileName}) downloaded successfully!`
      );
      onClose();
    } catch (e: any) {
      toast.error(
        lang === 'id' ? 'Gagal mengunduh file export ERP.' : 'Failed to download ERP export file.'
      );
      console.error('Download ERP error:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              {format === 'csv' ? <FileText className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {lang === 'id' ? 'Export Format Upload ERP' : 'Export ERP Upload Format'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-[#888888]">
                {lang === 'id'
                  ? 'Standar 15 kolom sesuai database ERP / SAP'
                  : '15 operational columns matching SAP/ERP specifications'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDownloading}
            className="p-1.5 sm:p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Site & Period Badge Row */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] text-xs">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-slate-700 dark:text-white">{siteLabel}</span>
            </div>
            <div className="flex items-center space-x-1.5 font-mono text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-200/70 dark:bg-white/[0.08] text-slate-800 dark:text-white">
              <span>{selectedYear}_{monthNameErp}</span>
            </div>
          </div>

          {/* Format Selection (CSV vs Excel) */}
          <div>
            <label className="text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-[#777] block mb-1.5">
              {lang === 'id' ? 'Format File' : 'File Format'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  format === 'csv'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-black border-slate-900 dark:border-white'
                    : 'bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-white/80'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>CSV (.csv)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('xlsx')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  format === 'xlsx'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-black border-slate-900 dark:border-white'
                    : 'bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-white/80'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Scope Options */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-[#777]">
                {lang === 'id' ? 'Klasifikasi Unit ERP' : 'ERP Unit Scope'}
              </label>
              {isLoadingSummary && (
                <span className="text-[10px] text-slate-400 flex items-center space-x-1 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Loading data...</span>
                </span>
              )}
            </div>

            <div className="space-y-2">
              {/* Option 1: Site Only */}
              <div
                onClick={() => setScope('site_only')}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  scope === 'site_only'
                    ? 'border-amber-500/80 bg-amber-50/50 dark:bg-amber-500/10'
                    : 'border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] hover:bg-slate-100/60 dark:hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2.5">
                    <div
                      className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center border ${
                        scope === 'site_only'
                          ? 'border-amber-500 bg-amber-500 text-white'
                          : 'border-slate-300 dark:border-white/20'
                      }`}
                    >
                      {scope === 'site_only' && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        {lang === 'id' ? `Unit Site ${siteLabel} (Internal)` : `${siteLabel} Internal Units`}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-white/60 mt-0.5">
                        {lang === 'id'
                          ? `Hanya unit resmi terdaftar di Master Equipment ${siteLabel} (misal LV 502, GS 002)`
                          : `Only official equipment registered in ${siteLabel} master list`}
                      </p>
                    </div>
                  </div>
                  {summary && (
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-white/90 shrink-0">
                      {summary.siteInternal.count.toLocaleString()} trx
                    </span>
                  )}
                </div>
              </div>

              {/* Option 2: Other Consumption (Cross-Site) */}
              <div
                onClick={() => setScope('other_consumption')}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  scope === 'other_consumption'
                    ? 'border-amber-500/80 bg-amber-50/50 dark:bg-amber-500/10'
                    : 'border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] hover:bg-slate-100/60 dark:hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2.5">
                    <div
                      className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center border ${
                        scope === 'other_consumption'
                          ? 'border-amber-500 bg-amber-500 text-white'
                          : 'border-slate-300 dark:border-white/20'
                      }`}
                    >
                      {scope === 'other_consumption' && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        {lang === 'id' ? 'Other Consumption (Lintas-Site)' : 'Other Consumption (Cross-Site)'}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-white/60 mt-0.5">
                        {lang === 'id'
                          ? `Aset terdaftar di site lain namun mengisi di ${siteLabel} (contoh: PM 401 dkk dari MP)`
                          : `Equipment registered in other site fueled at ${siteLabel}`}
                      </p>
                    </div>
                  </div>
                  {summary && (
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 shrink-0">
                      {summary.otherConsumption.count.toLocaleString()} trx
                    </span>
                  )}
                </div>
              </div>

              {/* Option 3: All Registered */}
              <div
                onClick={() => setScope('all_registered')}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  scope === 'all_registered'
                    ? 'border-amber-500/80 bg-amber-50/50 dark:bg-amber-500/10'
                    : 'border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] hover:bg-slate-100/60 dark:hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2.5">
                    <div
                      className={`w-4 h-4 rounded-full mt-0.5 flex items-center justify-center border ${
                        scope === 'all_registered'
                          ? 'border-amber-500 bg-amber-500 text-white'
                          : 'border-slate-300 dark:border-white/20'
                      }`}
                    >
                      {scope === 'all_registered' && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        {lang === 'id' ? 'Semua Unit Terdaftar ERP' : 'All ERP Registered Units'}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-white/60 mt-0.5">
                        {lang === 'id'
                          ? 'Gabungan Unit Site Internal + Other Consumption lintas-site'
                          : 'Combined internal and cross-site registered units'}
                      </p>
                    </div>
                  </div>
                  {summary && (
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0">
                      {summary.allRegistered.count.toLocaleString()} trx
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Unregistered Alert Banner */}
          {summary && summary.unregistered.count > 0 && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start space-x-2.5">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <div className="space-y-1">
                <span className="font-semibold block">
                  {lang === 'id' ? 'Proteksi Otomatis ERP:' : 'ERP Auto-Exclusion Protection:'}
                </span>
                <p className="text-[11px] leading-relaxed text-amber-700/90 dark:text-amber-300/90">
                  {lang === 'id'
                    ? `Sebanyak ${summary.unregistered.count.toLocaleString()} transaksi unit non-ERP (seperti ${summary.unregistered.sampleUnits.slice(0, 3).join(', ')}, kontraktor & vendor) otomatis dikecualikan agar file upload ERP valid tanpa error.`
                    : `${summary.unregistered.count} unregistered/contractor transactions (${summary.unregistered.sampleUnits.slice(0, 3).join(', ')}) are automatically excluded to ensure ERP upload validity.`}
                </p>
              </div>
            </div>
          )}

          {/* File Name Preview Box */}
          <div className="p-3 rounded-2xl bg-slate-900 text-white dark:bg-white/[0.06] border border-slate-800 dark:border-white/[0.08] space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-[#888] block">
              {lang === 'id' ? 'Nama File yang akan diunduh:' : 'Downloaded File Name:'}
            </span>
            <p className="text-xs font-mono font-semibold text-emerald-400 truncate">
              {computedFileName}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-end space-x-2 bg-slate-50/50 dark:bg-transparent">
          <button
            type="button"
            onClick={onClose}
            disabled={isDownloading}
            className="px-4 py-2 rounded-full border border-slate-200 dark:border-white/[0.1] text-xs font-semibold text-slate-700 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition cursor-pointer"
          >
            {lang === 'id' ? 'Batal' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center space-x-2 px-5 py-2 rounded-full bg-slate-900 text-white dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-[#EAEAEA] text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{lang === 'id' ? 'Mengunduh...' : 'Downloading...'}</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>{lang === 'id' ? 'Unduh File ERP' : 'Download ERP File'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
