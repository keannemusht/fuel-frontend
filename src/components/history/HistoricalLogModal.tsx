'use client';

import React, { useState, useEffect } from 'react';
import { FuelLog, UnitCategory } from '@/types';
import {
  X,
  Fuel,
  Calendar,
  Clock,
  Truck,
  Gauge,
  User,
  ShieldAlert,
  Droplet,
  Save,
  Layers,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'react-toastify';

interface HistoricalLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingLog: FuelLog | null;
  defaultDate?: string;
}

const CATEGORIES: UnitCategory[] = [
  'DUMP_TRUCK',
  'HEAVY_EQUIPMENT',
  'SUPPORT_VEHICLE',
  'LIGHT_VEHICLE',
  'GENERATOR',
];

export default function HistoricalLogModal({
  isOpen,
  onClose,
  onSuccess,
  editingLog,
  defaultDate,
}: HistoricalLogModalProps) {
  const isEditing = Boolean(editingLog);

  const [formData, setFormData] = useState({
    no: '',
    unitCode: '',
    category: 'DUMP_TRUCK' as UnitCategory,
    dateStr: defaultDate || new Date().toISOString().slice(0, 10),
    jamStr: '12:00',
    currentKm: '',
    currentHm: '',
    volumeLiters: '',
    fuelInLiters: '0',
    shift: '1',
    operator: '',
    fuelmanName: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingLog) {
      setFormData({
        no: String(editingLog.no || ''),
        unitCode: editingLog.unitCode || '',
        category: (editingLog.category as UnitCategory) || 'DUMP_TRUCK',
        dateStr: editingLog.dateStr || defaultDate || new Date().toISOString().slice(0, 10),
        jamStr: editingLog.jamStr || '12:00',
        currentKm: String(editingLog.currentKm || 0),
        currentHm: String(editingLog.currentHm || 0),
        volumeLiters: String(editingLog.volumeLiters || 0),
        fuelInLiters: String(editingLog.fuelInLiters || 0),
        shift: editingLog.shift || '1',
        operator: editingLog.operator || '',
        fuelmanName: editingLog.fuelmanName || '',
      });
    } else {
      setFormData({
        no: '',
        unitCode: '',
        category: 'DUMP_TRUCK',
        dateStr: defaultDate || new Date().toISOString().slice(0, 10),
        jamStr: '12:00',
        currentKm: '0',
        currentHm: '0',
        volumeLiters: '0',
        fuelInLiters: '0',
        shift: '1',
        operator: '',
        fuelmanName: '',
      });
    }
    setError(null);
  }, [editingLog, defaultDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.unitCode.trim()) {
      const msg = 'Nomor / Kode Unit wajib diisi';
      setError(msg);
      toast.warning(msg);
      return;
    }
    if (!formData.dateStr) {
      const msg = 'Tanggal transaksi wajib diisi';
      setError(msg);
      toast.warning(msg);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        no: formData.no ? parseInt(formData.no, 10) : undefined,
        unitCode: formData.unitCode.trim(),
        category: formData.category,
        dateStr: formData.dateStr,
        jamStr: formData.jamStr,
        currentKm: parseFloat(formData.currentKm) || 0,
        currentHm: parseFloat(formData.currentHm) || 0,
        volumeLiters: parseFloat(formData.volumeLiters) || 0,
        fuelInLiters: parseFloat(formData.fuelInLiters) || 0,
        shift: formData.shift,
        operator: formData.operator.trim() || '-',
        fuelmanName: formData.fuelmanName.trim(),
      };

      if (isEditing && editingLog) {
        await api.put(`/fuel/logs/${editingLog.id}`, payload);
        toast.success(`Log transaksi #${editingLog.no || ''} berhasil diperbarui!`);
      } else {
        await api.post('/fuel/logs', payload);
        toast.success('Log transaksi BBM manual berhasil ditambahkan!');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menyimpan data log transaksi BBM';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Fuel className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? `Edit Historical Log #${editingLog?.no}` : 'New Historical Fuel Entry'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#888888]">
                {isEditing
                  ? 'Update telemetry values and recalculate monthly ledger balance'
                  : 'Add a new verified transaction record to this monthly ledger'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Ticket No */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#888888] mb-1">
                Ticket NO
              </label>
              <input
                type="number"
                value={formData.no}
                onChange={(e) => setFormData({ ...formData, no: e.target.value })}
                placeholder="Auto"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#888888] mb-1">
                Date (YYYY-MM-DD) *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={formData.dateStr}
                  onChange={(e) => setFormData({ ...formData, dateStr: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Time (Jam) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#888888] mb-1">
                Jam (HH:mm) *
              </label>
              <input
                type="text"
                required
                value={formData.jamStr}
                onChange={(e) => setFormData({ ...formData, jamStr: e.target.value })}
                placeholder="12:00"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Unit Code */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#888888] mb-1">
                Unit Code (NO UNIT) *
              </label>
              <input
                type="text"
                required
                value={formData.unitCode}
                onChange={(e) => setFormData({ ...formData, unitCode: e.target.value.toUpperCase() })}
                placeholder="e.g. PM 401, GS 001, LV 504"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#888888] mb-1">
                Kategori
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as UnitCategory })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-white dark:bg-[#121212]">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* KM */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#888888] mb-1">
                Odometer (KM)
              </label>
              <input
                type="number"
                step="any"
                value={formData.currentKm}
                onChange={(e) => setFormData({ ...formData, currentKm: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* HM */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#888888] mb-1">
                Hour Meter (HM)
              </label>
              <input
                type="number"
                step="any"
                value={formData.currentHm}
                onChange={(e) => setFormData({ ...formData, currentHm: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* QTY OUT (Solar) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#888888] mb-1">
                QTY OUT (Liter) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={formData.volumeLiters}
                onChange={(e) => setFormData({ ...formData, volumeLiters: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-emerald-500/30 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* FUEL IN (Inbound) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#888888] mb-1">
                FUEL IN (Liter)
              </label>
              <input
                type="number"
                step="any"
                value={formData.fuelInLiters}
                onChange={(e) => setFormData({ ...formData, fuelInLiters: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Shift */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#888888] mb-1">
                Shift
              </label>
              <input
                type="text"
                value={formData.shift}
                onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                placeholder="1 or 2"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Operator */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#888888] mb-1">
                Operator / Driver
              </label>
              <input
                type="text"
                value={formData.operator}
                onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                placeholder="Operator name"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Fuelman */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#888888] mb-1">
                Fuelman Name
              </label>
              <input
                type="text"
                value={formData.fuelmanName}
                onChange={(e) => setFormData({ ...formData, fuelmanName: e.target.value })}
                placeholder="e.g. FERDI, LEMAN"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-slate-200 dark:border-white/[0.1] text-xs font-medium text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-black text-xs font-semibold shadow transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : isEditing ? 'Update Record' : 'Create Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
