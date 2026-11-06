'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StorageTank } from '@/types';
import ModalPortal from '@/components/shared/ModalPortal';
import {
  X,
  Calendar,
  Clock,
  ArrowRightLeft,
  Truck,
  Droplet,
  Send,
  AlertCircle,
  CheckCircle2,
  MapPin,
  User,
  Calculator,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { toast } from 'react-toastify';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSourceTankId?: string;
}

export default function StockTransferModal({
  isOpen,
  onClose,
  defaultSourceTankId,
}: StockTransferModalProps) {
  const { lang, t } = useLanguage();
  const queryClient = useQueryClient();

  const [sourceTankId, setSourceTankId] = useState<string>('');
  const [targetTankId, setTargetTankId] = useState<string>('');
  const [volumeLiters, setVolumeLiters] = useState<string>('');
  const [flowAwal, setFlowAwal] = useState<string>('');
  const [flowAkhir, setFlowAkhir] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [locationNotes, setLocationNotes] = useState<string>('Area BDPKM 6');
  const [dateStr, setDateStr] = useState<string>('');
  const [jamStr, setJamStr] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize Date and WITA Time
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      let dStr = '';
      let tStr = '08:00';
      try {
        dStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(now);
        tStr = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Makassar',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(now);
      } catch {
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        dStr = `${yyyy}-${mm}-${dd}`;
        const h = String((now.getUTCHours() + 8) % 24).padStart(2, '0');
        const m = String(now.getUTCMinutes()).padStart(2, '0');
        tStr = `${h}:${m}`;
      }

      setDateStr(dStr);
      setJamStr(tStr);
      setVolumeLiters('');
      setFlowAwal('');
      setFlowAkhir('');
      setDriverName('');
      setLocationNotes('Area BDPKM 6');
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Fetch Storage Tanks
  const { data: tanks = [] } = useQuery<StorageTank[]>({
    queryKey: ['tanks'],
    queryFn: async () => {
      const res = await api.get('/tanks');
      return res.data.data;
    },
    enabled: isOpen,
  });

  // Default selection
  useEffect(() => {
    if (tanks.length >= 2) {
      if (defaultSourceTankId && tanks.some((t) => t.id === defaultSourceTankId)) {
        setSourceTankId(defaultSourceTankId);
        const other = tanks.find((t) => t.id !== defaultSourceTankId);
        if (other) setTargetTankId(other.id);
      } else {
        // Prefer FT as source and MAIN_SENYIUR as target, or vice versa
        const ft = tanks.find((t) => t.tankType === 'MOBILE_TRUCK' || t.tankCode.includes('FT'));
        const main = tanks.find((t) => t.tankCode.includes('MAIN') || t.tankCode.includes('SENYIUR'));
        if (ft && main) {
          setSourceTankId(ft.id);
          setTargetTankId(main.id);
        } else {
          setSourceTankId(tanks[0].id);
          setTargetTankId(tanks[1].id);
        }
      }
    }
  }, [tanks, defaultSourceTankId, isOpen]);

  // Auto-calculate volume from flow meters
  useEffect(() => {
    const fAwal = parseFloat(flowAwal);
    const fAkhir = parseFloat(flowAkhir);
    if (!isNaN(fAwal) && !isNaN(fAkhir) && fAkhir >= fAwal) {
      setVolumeLiters(String(parseFloat((fAkhir - fAwal).toFixed(2))));
    }
  }, [flowAwal, flowAkhir]);

  const sourceTank = tanks.find((t) => t.id === sourceTankId);
  const targetTank = tanks.find((t) => t.id === targetTankId);

  const transferMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/tanks/transfer', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tanks'] });
      queryClient.invalidateQueries({ queryKey: ['fuelLogs'] });
      queryClient.invalidateQueries({ queryKey: ['shiftSummary'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });

      const msg = data.message || t('transfer.success', 'Transfer stock antar storage berhasil dicatat!');
      toast.success(msg);
      onClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || (lang === 'id' ? 'Gagal memproses transfer stock.' : 'Failed to process stock transfer.');
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!sourceTankId || !targetTankId) {
      const msg = t('transfer.errSelectBoth', 'Pilih tangki sumber dan tangki tujuan transfer.');
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    if (sourceTankId === targetTankId) {
      const msg = t('transfer.errSameTank', 'Tangki sumber dan tujuan tidak boleh sama.');
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    const vol = parseFloat(volumeLiters);
    if (isNaN(vol) || vol <= 0) {
      const msg = t('transfer.errInvalidVolume', 'Masukkan volume transfer yang valid (> 0 Liter).');
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    if (sourceTank && vol > sourceTank.currentStockLiters) {
      const msg =
        lang === 'id'
          ? `Stok tangki sumber tidak mencukupi (Tersedia: ${formatNumber(sourceTank.currentStockLiters, 0)} L).`
          : `Source tank has insufficient stock (Available: ${formatNumber(sourceTank.currentStockLiters, 0)} L).`;
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (targetTank && targetTank.currentStockLiters + vol > targetTank.capacityLiters) {
      const msg =
        lang === 'id'
          ? `Volume transfer melebihi sisa kapasitas tangki tujuan (Maks: ${formatNumber(targetTank.capacityLiters - targetTank.currentStockLiters, 0)} L).`
          : `Transfer volume exceeds available capacity of target tank (Max: ${formatNumber(targetTank.capacityLiters - targetTank.currentStockLiters, 0)} L).`;
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    const fAwal = flowAwal ? parseFloat(flowAwal) : undefined;
    const fAkhir = flowAkhir ? parseFloat(flowAkhir) : undefined;

    transferMutation.mutate({
      sourceTankId,
      targetTankId,
      volumeLiters: vol,
      flowAwal: fAwal,
      flowAkhir: fAkhir,
      driverName: driverName.trim() || undefined,
      dateStr,
      jamStr,
      notes: locationNotes.trim() || undefined,
    });
  };

  const isMobileTruckInvolved =
    sourceTank?.tankType === 'MOBILE_TRUCK' ||
    targetTank?.tankType === 'MOBILE_TRUCK' ||
    sourceTank?.tankCode.includes('FT') ||
    targetTank?.tankCode.includes('FT');

  return (
    <ModalPortal>
      <div className="fixed inset-0 w-screen h-screen z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden text-slate-900 dark:text-slate-100">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('transfer.title', 'Transfer Stok Antar Tangki')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('transfer.subtitle', 'FT 101 / FT 102 ↔ Main Tank Senyiur (Area BDPKM 6)')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={transferMutation.isPending}
              className="p-1.5 text-slate-400 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {errorMessage && (
              <div className="flex items-center space-x-2.5 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Source & Target Tank Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Source Tank */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                  <span>{t('transfer.sourceTank', 'Tangki Sumber (Keluar)')}</span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>{t('transfer.stockOut', 'STOK KELUAR')}</span>
                  </span>
                </label>
                <select
                  value={sourceTankId}
                  onChange={(e) => setSourceTankId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
                >
                  {tanks.map((t) => (
                    <option key={t.id} value={t.id} disabled={t.id === targetTankId}>
                      {t.name} ({t.tankType === 'MOBILE_TRUCK' ? 'Truck' : 'Stationary'})
                    </option>
                  ))}
                </select>
                {sourceTank && (
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700/60">
                    <span>{t('transfer.remainingStock', 'Sisa Stok:')}</span>
                    <strong className="text-slate-900 dark:text-white font-mono font-bold">
                      {formatNumber(sourceTank.currentStockLiters, 0)} L
                    </strong>
                  </div>
                )}
              </div>

              {/* Target Tank */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                  <span>{t('transfer.targetTank', 'Tangki Tujuan (Masuk)')}</span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>{t('transfer.stockIn', 'STOK MASUK')}</span>
                  </span>
                </label>
                <select
                  value={targetTankId}
                  onChange={(e) => setTargetTankId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
                >
                  {tanks.map((t) => (
                    <option key={t.id} value={t.id} disabled={t.id === sourceTankId}>
                      {t.name} ({t.tankType === 'MOBILE_TRUCK' ? 'Truck' : 'Stationary'})
                    </option>
                  ))}
                </select>
                {targetTank && (
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700/60">
                    <span>{t('transfer.remainingCapacity', 'Kapasitas Tersisa:')}</span>
                    <strong className="text-slate-900 dark:text-white font-mono font-bold">
                      {formatNumber(targetTank.capacityLiters - targetTank.currentStockLiters, 0)} L
                    </strong>
                  </div>
                )}
              </div>
            </div>

            {/* Flow Meter Inputs (Optional / When Fuel Truck is involved) */}
            {isMobileTruckInvolved && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                    {t('transfer.totalizerTitle', 'Flow Meter Totalisator Fuel Truck (Opsional)')}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {t('transfer.totalizerCalc', 'Qty = Akhir - Awal')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                      {t('transfer.flowAwal', 'Flow Meter Awal')}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder={t('transfer.flowAwalPlaceholder', 'e.g. 12500.0')}
                      value={flowAwal}
                      onChange={(e) => setFlowAwal(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                      {t('transfer.flowAkhir', 'Flow Meter Akhir')}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder={t('transfer.flowAkhirPlaceholder', 'e.g. 17500.0')}
                      value={flowAkhir}
                      onChange={(e) => setFlowAkhir(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Transfer Volume */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Droplet className="w-3.5 h-3.5 text-amber-500" />
                {t('transfer.volume', 'Volume Transfer (Liter)')} *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder="0.0"
                  value={volumeLiters}
                  onChange={(e) => setVolumeLiters(e.target.value.replace(/-/g, ''))}
                  className="w-full text-base font-mono font-bold px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
                />
                <span className="absolute right-4 top-3 text-xs font-mono text-slate-400">
                  {t('transfer.unitLiter', 'Liter')}
                </span>
              </div>
            </div>

            {/* Date, Time & Driver */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {t('transfer.date', 'Tanggal')} *
                </label>
                <input
                  type="date"
                  required
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {t('transfer.time', 'Jam (WITA)')} *
                </label>
                <input
                  type="time"
                  required
                  value={jamStr}
                  onChange={(e) => setJamStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  {t('transfer.driver', 'Driver / Operator')}
                </label>
                <input
                  type="text"
                  placeholder={t('transfer.driverPlaceholder', 'e.g. Supir FT')}
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
                />
              </div>
            </div>

            {/* Location / Notes */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                {t('transfer.location', 'Lokasi / Keterangan Transfer')}
              </label>
              <input
                type="text"
                placeholder={t('transfer.locationPlaceholder', 'e.g. Area BDPKM 6')}
                value={locationNotes}
                onChange={(e) => setLocationNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
              />
            </div>

            {/* Info note */}
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('transfer.autoNote', '* Transaksi transfer otomatis dicatat di Google Sheets & Excel report dengan No Unit: Transfer Stock dan Kategori: Fuel In.')}
            </p>

            {/* Submit */}
            <div className="pt-2 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={transferMutation.isPending}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {t('transfer.cancel', 'Batal')}
              </button>
              <button
                type="submit"
                disabled={transferMutation.isPending}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-bold uppercase tracking-wider hover:bg-slate-800 dark:hover:bg-slate-100 flex items-center space-x-2 disabled:opacity-50 transition shadow-sm"
              >
                {transferMutation.isPending ? (
                  <span>{t('transfer.processing', 'Memproses Transfer...')}</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{t('transfer.execute', 'Eksekusi Transfer')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
