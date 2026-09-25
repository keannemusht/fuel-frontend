'use client';

import React, { useState, useRef } from 'react';
import ModalPortal from './ModalPortal';
import { api } from '@/lib/api';
import { toast } from 'react-toastify';
import {
  FileSpreadsheet,
  Upload,
  Download,
  X,
  AlertTriangle,
  CheckCircle2,
  Truck,
  Fuel,
  RefreshCw,
} from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'units' | 'fuel';
  onSuccess?: () => void;
}

export default function ExcelImportModal({
  isOpen,
  onClose,
  defaultTab = 'units',
  onSuccess,
}: ExcelImportModalProps) {
  const [tab, setTab] = useState<'units' | 'fuel'>(defaultTab);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true);
      const res = await api.get(`/excel/template?type=${tab}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        tab === 'units'
          ? 'TEMPLATE_FLEET_UNITS.xlsx'
          : 'TEMPLATE_HISTORICAL_FUEL_LOGS.xlsx'
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Template ${tab === 'units' ? 'Master Armada' : 'Log BBM'} berhasil diunduh.`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Gagal mengunduh template Excel';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMessage(null);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setErrorMessage(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      const msg = 'Silakan pilih file Excel (.xlsx atau .xls) terlebih dahulu.';
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage(null);
      setResult(null);

      const formData = new FormData();
      formData.append('file', file);

      const endpoint = tab === 'units' ? '/excel/import-units' : '/excel/import-fuel';
      const res = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(res.data.data);
      const importedCount = res.data.data?.imported || res.data.data?.count || res.data.data?.total || 0;
      toast.success(`Berhasil mengimpor data! ${importedCount} data berhasil diproses.`);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Gagal mengimpor file Excel. Pastikan format kolom sesuai template.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 w-screen h-screen z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-[#FAFBFD] dark:bg-[#121212] border border-slate-200 dark:border-white/[0.12] rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5 text-slate-900 dark:text-white">
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.06]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Bulk Excel Import
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#888888]">
                  Mass import fleet equipment or 15-column historical fuel records
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-900 dark:text-[#666] dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Import Mode Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setTab('units');
                resetState();
              }}
              className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                tab === 'units'
                  ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-[#888888] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Fleet Vehicles Master</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab('fuel');
                resetState();
              }}
              className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                tab === 'fuel'
                  ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-[#888888] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Fuel className="w-4 h-4" />
              <span>Historical Fuel Logs</span>
            </button>
          </div>

          {/* Template Download Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-900 dark:text-blue-300 text-xs">
            <div>
              <p className="font-semibold">
                {tab === 'units' ? 'Fleet Units Format' : '15-Column Operational Log Format'}
              </p>
              <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
                {tab === 'units'
                  ? 'Headers: [NO UNIT, CATEGORY, PLATE NUMBER, MAKE / MODEL, LAST KM, LAST HM]'
                  : 'Headers: [NO, NO UNIT, KATEGORI, DATE, JAM, HM, KM, QTY OUT, SHIFT, OPERATOR, ...]'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={isDownloading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-[11px] shrink-0 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloading ? 'Preparing...' : 'Get Template'}</span>
            </button>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              file
                ? 'border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-500/10'
                : 'border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20 bg-slate-50/50 dark:bg-white/[0.02]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                  file
                    ? 'bg-emerald-500/20 text-emerald-500'
                    : 'bg-slate-200 dark:bg-white/[0.06] text-slate-500 dark:text-[#888888]'
                }`}
              >
                <Upload className="w-6 h-6" />
              </div>

              {file ? (
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-[#888888] mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB • Click or drag another file to replace
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-white">
                    Click to select an Excel spreadsheet, or drag and drop
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-[#888888] mt-0.5">
                    Supports Microsoft Excel (.xlsx, .xls) up to 25MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success / Result Summary */}
          {result && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Import Completed Successfully!</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-300">
                {result.totalRowsScanned !== undefined && (
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.04]">
                    <span className="text-slate-400 block">Rows Scanned</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {result.totalRowsScanned}
                    </span>
                  </div>
                )}
                {result.logsImported !== undefined && (
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.04]">
                    <span className="text-slate-400 block">Fuel Logs Imported</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {result.logsImported}
                    </span>
                  </div>
                )}
                {result.unitsCreated !== undefined && (
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.04]">
                    <span className="text-slate-400 block">Units Created</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                      {result.unitsCreated}
                    </span>
                  </div>
                )}
                {result.unitsUpdated !== undefined && (
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.04]">
                    <span className="text-slate-400 block">Units Updated</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                      {result.unitsUpdated}
                    </span>
                  </div>
                )}
                {result.skippedRows !== undefined && (
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.04]">
                    <span className="text-slate-400 block">Header / Skipped</span>
                    <span className="font-bold text-slate-500 text-sm">
                      {result.skippedRows}
                    </span>
                  </div>
                )}
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px]">
                  <span className="font-semibold block mb-1">Row Notices ({result.errors.length}):</span>
                  <ul className="list-disc list-inside space-y-0.5 max-h-20 overflow-y-auto">
                    {result.errors.slice(0, 5).map((e: string, idx: number) => (
                      <li key={idx}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#888888] hover:text-slate-900 dark:hover:text-white text-xs font-medium transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black font-semibold text-xs hover:bg-slate-800 dark:hover:bg-[#EAEAEA] active:scale-95 disabled:opacity-50 transition-all shadow-md"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Rows...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Start Bulk Import</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
