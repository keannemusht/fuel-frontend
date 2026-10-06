'use client';

import React from 'react';
import { FuelLog } from '@/types';
import SyncStatusBadge from '../shared/SyncStatusBadge';
import { formatNumber } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface ShiftLogTableProps {
  logs: FuelLog[];
  isLoading: boolean;
  onRetrySync: (logId: string) => void;
  retryingId?: string;
}

export default function ShiftLogTable({
  logs,
  isLoading,
  onRetrySync,
  retryingId,
}: ShiftLogTableProps) {
  if (isLoading) {
    return (
      <div className="p-8 text-center text-[#888888] text-xs font-mono animate-pulse">
        Loading live shift transaction telemetry...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-[#777777] text-xs font-mono border border-dashed border-slate-200 dark:border-white/[0.08] rounded-2xl bg-white dark:bg-[#0A0A0A]">
        No fuel transactions recorded for this shift yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] shadow-sm dark:shadow-2xl">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50 dark:bg-[#111111] border-b border-slate-200 dark:border-white/[0.06] text-[11px] font-semibold text-slate-500 dark:text-[#888888]">
            <th className="py-3 px-3.5 text-center">NO ID.</th>
            <th className="py-3 px-3.5">NO UNIT</th>
            <th className="py-3 px-3.5">KATEGORI</th>
            <th className="py-3 px-3.5 text-center">DATE</th>
            <th className="py-3 px-3.5 text-center">JAM</th>
            <th className="py-3 px-3.5 text-right">HM</th>
            <th className="py-3 px-3.5 text-right">KM</th>
            <th className="py-3 px-3.5 text-right text-slate-900 dark:text-white font-semibold">QTY OUT ( L )</th>
            <th className="py-3 px-3.5 text-center">SHIFT</th>
            <th className="py-3 px-3.5">OPERATOR</th>
            <th className="py-3 px-3.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">FUEL IN</th>
            <th className="py-3 px-3.5 text-right">TOTAL OUT</th>
            <th className="py-3 px-3.5 text-right text-cyan-600 dark:text-cyan-400 font-semibold">STOCK AKHIR</th>
            <th className="py-3 px-3.5 text-right">TOTAL IN</th>
            <th className="py-3 px-3.5">FUELMAN</th>
            <th className="py-3 px-3.5 text-center">SHEETS SYNC</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] font-mono text-[11px]">
          {logs.map((log) => (
            <tr
              key={log.id}
              className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors text-slate-800 dark:text-white/90"
            >
              <td className="py-3 px-3.5 text-center font-mono text-[10px] text-slate-500 dark:text-[#888888] whitespace-nowrap">
                {log.logNumber && (log.logNumber.startsWith('F-') || log.logNumber.startsWith('R-'))
                  ? log.logNumber
                  : (log.no || log.logNumber || '-')}
              </td>
              <td className="py-3 px-3.5 font-semibold text-slate-900 dark:text-white">
                <div className="flex items-center space-x-1.5">
                  <span>{log.unitCode}</span>
                  {log.sourceType === 'FUEL_TRUCK' && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-normal" title="Dispensed via Mobile Fuel Truck">
                      FT
                    </span>
                  )}
                  {log.bypassValidation && log.unitCode !== 'PENGISIAN' && log.bypassReason !== 'Historical Google Sheets Sync' && (
                    <span
                      title={`Bypass: ${log.bypassReason || 'Admin authorized replacement'}`}
                      className="text-amber-500 dark:text-amber-400 cursor-help"
                    >
                      <AlertTriangle className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-3.5 text-slate-500 dark:text-[#888888] font-sans text-xs">{log.category}</td>
              <td className="py-3 px-3.5 text-center text-slate-500 dark:text-[#888888]">{log.dateStr}</td>
              <td className="py-3 px-3.5 text-center text-slate-500 dark:text-[#888888]">{log.jamStr}</td>
              <td className="py-3 px-3.5 text-right">{log.currentHm > 0 ? formatNumber(log.currentHm, 1) : '-'}</td>
              <td className="py-3 px-3.5 text-right">{log.currentKm > 0 ? formatNumber(log.currentKm, 1) : '-'}</td>
              <td className="py-3 px-3.5 text-right font-bold text-slate-900 dark:text-white text-xs">
                {log.volumeLiters > 0 ? formatNumber(log.volumeLiters, 1) : '-'}
              </td>
              <td className="py-3 px-3.5 text-center">
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-[#999999] border border-slate-200 dark:border-white/[0.08]">
                  {log.shift}
                </span>
              </td>
              <td className="py-3 px-3.5 text-slate-700 dark:text-white/80 font-sans text-xs">
                <div>{log.operator}</div>
                {log.currentKwh && log.currentKwh > 0 && !log.operator.includes('Kwh') && (
                  <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 block font-normal">
                    ({formatNumber(log.currentKwh, 1)} Kwh)
                  </span>
                )}
              </td>
              <td className="py-3 px-3.5 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                {log.fuelInLiters > 0 ? `+${formatNumber(log.fuelInLiters, 1)}` : '-'}
              </td>
              <td className="py-3 px-3.5 text-right text-slate-500 dark:text-[#888888]">
                {formatNumber(log.totalFuelOut, 1)}
              </td>
              <td className="py-3 px-3.5 text-right font-semibold text-cyan-600 dark:text-cyan-400">
                {formatNumber(log.stockAkhir, 1)}
              </td>
              <td className="py-3 px-3.5 text-right text-slate-500 dark:text-[#888888]">
                {formatNumber(log.totalFuelIn, 1)}
              </td>
              <td className="py-3 px-3.5 text-slate-700 dark:text-white/80 font-sans text-xs">{log.fuelmanName}</td>
              <td className="py-3 px-3.5 text-center">
                <SyncStatusBadge
                  status={log.syncStatus}
                  onRetry={() => onRetrySync(log.id)}
                  isRetrying={retryingId === log.id}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
