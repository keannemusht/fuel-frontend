'use client';

import React from 'react';
import { FuelLog } from '@/types';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  log: FuelLog | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export default function DeleteConfirmModal({
  isOpen,
  log,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteConfirmModalProps) {
  const { lang } = useLanguage();
  if (!isOpen || !log) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'id' ? 'Hapus Data Fuel Log' : 'Delete Fuel Log Record'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#888888]">
                {lang === 'id' ? 'Konfirmasi penghapusan data riwayat' : 'Confirm deletion of historical log'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-600 dark:hover:text-white transition disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Warning Banner */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <p>
              {lang === 'id'
                ? 'Tindakan ini permanen dan tidak dapat dibatalkan. Catatan pemakaian bahan bakar ini akan dihapus dari riwayat transaksi.'
                : 'This action is permanent and cannot be undone. This fuel consumption record will be removed from transaction history.'}
            </p>
          </div>

          {/* Target Log Info Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-slate-500 dark:text-[#888888]">
              <span>{lang === 'id' ? 'ID Transaksi / Docket:' : 'Transaction ID / Docket:'}</span>
              <span className="font-semibold text-slate-900 dark:text-slate-200 font-mono">
                {log.logNumber || `#${log.no ?? '-'}`}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500 dark:text-[#888888]">
              <span>Unit Code:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 tracking-wide">
                {log.unitCode}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500 dark:text-[#888888]">
              <span>{lang === 'id' ? 'Tanggal / Jam:' : 'Date / Time:'}</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {log.dateStr} {log.jamStr ? `• ${log.jamStr}` : ''}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500 dark:text-[#888888]">
              <span>{lang === 'id' ? 'Volume Keluar:' : 'Dispensed Volume:'}</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {log.volumeLiters.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US')} Liter
              </span>
            </div>
            {(log.operator || log.fuelmanName) && (
              <div className="flex justify-between items-center text-slate-500 dark:text-[#888888] pt-2 border-t border-slate-200/80 dark:border-white/[0.06]">
                <span>Operator / Fuelman:</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {log.operator || '-'} / {log.fuelmanName || '-'}
                </span>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 rounded-full border border-slate-200 dark:border-white/[0.1] text-xs font-medium text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition disabled:opacity-50"
            >
              {lang === 'id' ? 'Batal' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-semibold shadow-md shadow-rose-600/20 transition disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{lang === 'id' ? 'Menghapus...' : 'Deleting...'}</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'id' ? 'Ya, Hapus Log' : 'Yes, Delete Record'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
