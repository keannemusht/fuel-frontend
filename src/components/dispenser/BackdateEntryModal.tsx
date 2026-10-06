'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Unit, StorageTank } from '@/types';
import ModalPortal from '@/components/shared/ModalPortal';
import {
  X,
  Calendar,
  Clock,
  Truck,
  Database,
  Fuel,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { toast } from 'react-toastify';

interface BackdateEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string; // YYYY-MM-DD
}

export default function BackdateEntryModal({
  isOpen,
  onClose,
  defaultDate,
}: BackdateEntryModalProps) {
  const queryClient = useQueryClient();

  const [dateStr, setDateStr] = useState<string>('');
  const [jamStr, setJamStr] = useState<string>('08:00');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedTankId, setSelectedTankId] = useState<string>('');
  const [currentKm, setCurrentKm] = useState<string>('');
  const [currentHm, setCurrentHm] = useState<string>('');
  const [currentKwh, setCurrentKwh] = useState<string>('');
  const [volumeLiters, setVolumeLiters] = useState<string>('');
  const [shift, setShift] = useState<string>('SHIFT 1');
  const [operator, setOperator] = useState<string>('');
  const [fuelInLiters, setFuelInLiters] = useState<string>('0');
  const [bypassValidation, setBypassValidation] = useState<boolean>(false);
  const [bypassReason, setBypassReason] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Set initial date
  useEffect(() => {
    if (isOpen) {
      if (defaultDate) {
        setDateStr(defaultDate);
      } else {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        setDateStr(`${yyyy}-${mm}-${dd}`);
      }
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, defaultDate]);

  // Fetch Units
  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ['units'],
    queryFn: async () => {
      const res = await api.get('/units');
      return res.data.data;
    },
    enabled: isOpen,
  });

  // Fetch Tanks
  const { data: tanks = [] } = useQuery<StorageTank[]>({
    queryKey: ['tanks'],
    queryFn: async () => {
      const res = await api.get('/tanks');
      return res.data.data;
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (tanks.length > 0 && !selectedTankId) {
      setSelectedTankId(tanks[0].id);
    }
  }, [tanks, selectedTankId]);

  const selectedUnit = units.find((u) => u.id === selectedUnitId) || null;
  const selectedTank = tanks.find((t) => t.id === selectedTankId) || null;

  const unitHasKm = selectedUnit ? (selectedUnit.hasKm ?? true) : true;
  const unitHasHm = selectedUnit ? (selectedUnit.hasHm ?? true) : true;
  const unitHasKwh = selectedUnit ? (selectedUnit.hasKwh ?? false) : false;

  // Dispense mutation
  const dispenseMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/fuel/backdate', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuelLogs'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyFuelLogs'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
      queryClient.invalidateQueries({ queryKey: ['shiftSummary'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['tanks'] });

      const msg = 'Transaksi log BBM terlewat (backdate) berhasil dicatat!';
      setSuccessMessage(msg);
      toast.success(msg);
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1400);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || 'Gagal menyimpan transaksi backdate';
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedUnitId) {
      const msg = 'Pilih unit armada terlebih dahulu';
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }
    if (!selectedTankId) {
      const msg = 'Pilih tangki penyimpanan sumber BBM';
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }
    if (!dateStr) {
      const msg = 'Tentukan tanggal transaksi (YYYY-MM-DD)';
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }
    if (!operator.trim()) {
      const msg = 'Nama operator atau driver wajib diisi';
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    const vol = parseFloat(volumeLiters) || 0;
    const km = parseFloat(currentKm) || 0;
    const hm = parseFloat(currentHm) || 0;
    const kwh = parseFloat(currentKwh) || 0;
    const fuelIn = parseFloat(fuelInLiters) || 0;

    if (unitHasKm && km < 0) {
      const msg = 'Nilai Odometer (KM) tidak boleh negatif (< 0)';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (unitHasHm && hm < 0) {
      const msg = 'Nilai Hour Meter (HM) tidak boleh negatif (< 0)';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (unitHasKwh && kwh < 0) {
      const msg = 'Nilai KWH Genset tidak boleh negatif (< 0)';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (vol <= 0 && fuelIn <= 0) {
      const msg = 'Volume pengisian atau penerimaan BBM harus lebih besar dari 0';
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    if (bypassValidation && !bypassReason.trim()) {
      const msg = 'Alasan wajib diisi jika validasi meter dilewati';
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    dispenseMutation.mutate({
      unitId: selectedUnitId,
      tankId: selectedTankId,
      currentKm: unitHasKm ? km : undefined,
      currentHm: unitHasHm ? hm : undefined,
      currentKwh: unitHasKwh ? kwh : undefined,
      volumeLiters: vol,
      shift,
      operator: operator.trim(),
      fuelInLiters: fuelIn,
      bypassValidation,
      bypassReason: bypassReason.trim() || undefined,
      dateStr,
      jamStr: jamStr.trim() || undefined,
    });
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 w-screen h-screen z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        <div className="relative w-full max-w-2xl bg-[#FAFBFD] dark:bg-[#121212] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/[0.12] my-8 overflow-hidden text-slate-900 dark:text-white">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-white/80 flex items-center justify-center">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Backdate Fuel Entry
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#888888]">
                  Record past or missed transactions for monthly ledger & Google Sheets sync
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={dispenseMutation.isPending}
              className="p-1.5 text-slate-400 hover:text-slate-900 dark:text-[#666] dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {/* Status alerts */}
            {errorMessage && (
              <div className="flex items-center space-x-2.5 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="flex items-center space-x-2.5 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="font-medium">{successMessage}</span>
              </div>
            )}

            {/* Row 1: Date, Time & Shift */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-[#888888] mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-white/60" />
                  Date (YYYY-MM-DD) *
                </label>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-xs font-mono text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-[#888888] mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-white/60" />
                  Time / Jam (WITA)
                </label>
                <input
                  type="time"
                  value={jamStr}
                  onChange={(e) => setJamStr(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-xs font-mono text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-[#888888] mb-1">
                  Shift *
                </label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-xs font-semibold text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                >
                  <option value="SHIFT 1" className="bg-white dark:bg-[#121212]">SHIFT 1 (Day)</option>
                  <option value="SHIFT 2" className="bg-white dark:bg-[#121212]">SHIFT 2 (Night)</option>
                </select>
              </div>
            </div>

            {/* Row 2: Unit Selection & Tank Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-[#888888] mb-1 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-slate-400 dark:text-white/60" />
                  Fleet Unit *
                </label>
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-xs text-slate-900 dark:text-white font-medium focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                  required
                >
                  <option value="" className="bg-white dark:bg-[#121212]">-- Choose Unit --</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id} className="bg-white dark:bg-[#121212]">
                      {u.unitCode} {u.makeModel ? `(${u.makeModel})` : ''} - {u.category}
                    </option>
                  ))}
                </select>
                {selectedUnit && (
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-[#888888] flex items-center justify-between px-1 font-mono">
                    <span>Plate: {selectedUnit.plateNumber || '-'}</span>
                    <span>Last KM: {formatNumber(selectedUnit.lastKm, 1)}</span>
                    <span>Last HM: {formatNumber(selectedUnit.lastHm, 1)}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-[#888888] mb-1 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-400 dark:text-white/60" />
                  Fuel Source Tank *
                </label>
                <select
                  value={selectedTankId}
                  onChange={(e) => setSelectedTankId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-xs text-slate-900 dark:text-white font-medium focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                  required
                >
                  {tanks.map((t) => (
                    <option key={t.id} value={t.id} className="bg-white dark:bg-[#121212]">
                      {t.name} ({formatNumber(t.currentStockLiters, 0)} / {formatNumber(t.capacityLiters, 0)} L)
                    </option>
                  ))}
                </select>
                {selectedTank && (
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-[#888888] px-1 font-mono">
                    Avail Stock: <strong className="text-emerald-500 dark:text-emerald-400">{formatNumber(selectedTank.currentStockLiters, 0)} L</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Row 3: Dynamic KM, HM, KWH, and Dispensing Liters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {unitHasKm && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#888888] mb-1">
                    Current KM {unitHasKm ? '*' : ''}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 15420"
                    value={currentKm}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'Minus') e.preventDefault();
                    }}
                    onChange={(e) => setCurrentKm(e.target.value.replace(/-/g, ''))}
                    className="w-full px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-xs font-mono text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                  />
                </div>
              )}

              {unitHasHm && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#888888] mb-1">
                    Current HM {unitHasHm ? '*' : ''}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 2350.5"
                    value={currentHm}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'Minus') e.preventDefault();
                    }}
                    onChange={(e) => setCurrentHm(e.target.value.replace(/-/g, ''))}
                    className="w-full px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-xs font-mono text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                  />
                </div>
              )}

              {unitHasKwh && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#888888] mb-1">
                    Daya Genset (KWH) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 1520.0"
                    value={currentKwh}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'Minus') e.preventDefault();
                    }}
                    onChange={(e) => setCurrentKwh(e.target.value.replace(/-/g, ''))}
                    className="w-full px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-xs font-mono text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                  />
                </div>
              )}

              <div className={!unitHasKm && !unitHasHm && !unitHasKwh ? 'md:col-span-3' : ''}>
                <label className="block text-xs font-medium text-slate-500 dark:text-[#888888] mb-1 flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-slate-400 dark:text-white/60" />
                  Volume (Liters) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 180"
                  value={volumeLiters}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'Minus') e.preventDefault();
                  }}
                  onChange={(e) => setVolumeLiters(e.target.value.replace(/-/g, ''))}
                  className="w-full px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Row 4: Operator & Inbound Fuel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-[#888888] mb-1">
                  Driver / Operator Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Budi Santoso"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-xs text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-[#888888] mb-1">
                  Fuel In / Inbound (Liters) (Optional)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={fuelInLiters}
                  onChange={(e) => setFuelInLiters(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-xs font-mono text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                />
              </div>
            </div>

            {/* Bypass Validation Checkbox */}
            <div className="pt-2 border-t border-slate-200 dark:border-white/[0.06]">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bypassValidation}
                  onChange={(e) => setBypassValidation(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-white/20 text-slate-900 dark:text-white focus:ring-slate-400"
                />
                <span className="text-xs font-medium text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Bypass odometer / meter jump validation (historical backfill)
                </span>
              </label>

              {bypassValidation && (
                <div className="mt-2.5">
                  <input
                    type="text"
                    placeholder="Provide reason for backdate override (e.g. Logging past August records)..."
                    value={bypassReason}
                    onChange={(e) => setBypassReason(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-400"
                    required={bypassValidation}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={onClose}
                disabled={dispenseMutation.isPending}
                className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-[#888888] dark:hover:text-white rounded-full transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={dispenseMutation.isPending}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 disabled:opacity-50 text-white dark:text-black font-semibold text-xs rounded-full shadow-sm active:scale-95 transition flex items-center space-x-1.5"
              >
                {dispenseMutation.isPending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Record Backdate Entry</span>
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

