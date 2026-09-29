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
  Database,
  Droplet,
  Truck,
  FileText,
  AlertCircle,
  CheckCircle2,
  ArrowDownToLine,
  Send,
  Plus,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { toast } from 'react-toastify';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface InboundFuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTankId?: string;
}

// Bawaan default vendor supplier solar
export const DEFAULT_SUPPLIERS = [
  'PT Elnusa Petrofin',
  'PT Pertamina Patra Niaga',
  'PT AKR Corporindo',
  'PT Petro Andalan Nusantara',
  'PT Kaltim Jaya Mineral',
  'PT Solar Anugerah Sejahtera',
];

export default function InboundFuelModal({
  isOpen,
  onClose,
  defaultTankId,
}: InboundFuelModalProps) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();

  // Form State
  const [selectedTankId, setSelectedTankId] = useState<string>('');
  const [fuelInLiters, setFuelInLiters] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [deliveryOrderNo, setDeliveryOrderNo] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [jamStr, setJamStr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dynamic Supplier State (Stored in localStorage for easy addition without coding)
  const [customSuppliers, setCustomSuppliers] = useState<string[]>([]);
  const [supplierVendor, setSupplierVendor] = useState<string>(DEFAULT_SUPPLIERS[0]);
  const [isAddingNewSupplier, setIsAddingNewSupplier] = useState<boolean>(false);
  const [newSupplierName, setNewSupplierName] = useState<string>('');

  // Load custom suppliers from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('batarafuel_custom_suppliers');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setCustomSuppliers(parsed);
          }
        }
      } catch {
        // ignore
      }
    }
  }, [isOpen]);

  // Combined unique suppliers list
  const allSuppliers = Array.from(new Set([...DEFAULT_SUPPLIERS, ...customSuppliers]));

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
      setFuelInLiters('');
      setDriverName('');
      setDeliveryOrderNo('');
      setNotes('');
      setIsAddingNewSupplier(false);
      setNewSupplierName('');
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

  // Default tank selection
  useEffect(() => {
    if (tanks.length > 0 && !selectedTankId) {
      if (defaultTankId && tanks.some((t) => t.id === defaultTankId)) {
        setSelectedTankId(defaultTankId);
      } else {
        setSelectedTankId(tanks[0].id);
      }
    }
  }, [tanks, defaultTankId, selectedTankId]);

  const parsedInboundLiters = parseFloat(fuelInLiters) || 0;

  // Handle Adding New Supplier dynamically
  const handleSaveNewSupplier = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = newSupplierName.trim();
    if (!cleanName) return;

    if (!allSuppliers.includes(cleanName)) {
      const updated = [...customSuppliers, cleanName];
      setCustomSuppliers(updated);
      try {
        localStorage.setItem('batarafuel_custom_suppliers', JSON.stringify(updated));
      } catch {}
    }

    setSupplierVendor(cleanName);
    setNewSupplierName('');
    setIsAddingNewSupplier(false);
    toast.success(lang === 'id' ? `Vendor "${cleanName}" ditambahkan ke daftar.` : `Supplier "${cleanName}" added.`);
  };

  // Quick Preset Add
  const handleAddVolumePreset = (liters: number) => {
    const current = parseFloat(fuelInLiters) || 0;
    setFuelInLiters(String(current + liters));
  };

  // Inbound Mutation
  const inboundMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/fuel/inbound', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['fuelLogs'] });
      queryClient.invalidateQueries({ queryKey: ['shiftSummary'] });
      queryClient.invalidateQueries({ queryKey: ['tanks'] });
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });

      const logNum = data.data?.fuelLog?.logNumber || '';
      const successMsg = lang === 'id'
        ? `Penerimaan BBM berhasil dicatat (${logNum}). Stok tangki bertambah ${formatNumber(parsedInboundLiters, 0)} L.`
        : `Inbound fuel recorded (${logNum}). Tank replenished by ${formatNumber(parsedInboundLiters, 0)} L.`;

      toast.success(successMsg);
      onClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || (lang === 'id' ? 'Gagal mencatat penerimaan BBM.' : 'Failed to record inbound fuel.');
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedTankId) {
      const msg = lang === 'id' ? 'Pilih tangki penyimpanan target.' : 'Select target storage tank.';
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    if (isNaN(parsedInboundLiters) || parsedInboundLiters <= 0) {
      const msg = lang === 'id' ? 'Masukkan volume BBM masuk dalam Liter (> 0).' : 'Enter valid inbound fuel volume in Liters (> 0).';
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    const resolvedSupplier = supplierVendor.trim();
    const trimmedDriver = driverName.trim();

    if (!trimmedDriver && !resolvedSupplier) {
      const msg = lang === 'id' ? 'Masukkan nama supir tangki atau vendor supplier.' : 'Enter tank driver or supplier vendor name.';
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    // Construct operator string matching dataset convention (e.g. "PT Elnusa Petrofin - WONI" or "WONI")
    const operatorVal = trimmedDriver && resolvedSupplier
      ? `${resolvedSupplier} - ${trimmedDriver}`
      : (trimmedDriver || resolvedSupplier);

    // Notes string with Delivery Order if provided
    const combinedNotes = [
      deliveryOrderNo.trim() ? `DO: ${deliveryOrderNo.trim()}` : null,
      notes.trim() || null,
    ].filter(Boolean).join(' | ');

    // Automatic shift calculation from WITA time (no manual shift needed)
    const hour = parseInt(jamStr.split(':')[0], 10);
    const computedShift = (!isNaN(hour) && hour >= 6 && hour < 18) ? 'SHIFT 1' : 'SHIFT 2';

    inboundMutation.mutate({
      tankId: selectedTankId,
      fuelInLiters: parsedInboundLiters,
      operator: operatorVal,
      shift: computedShift,
      dateStr,
      jamStr: jamStr ? `${jamStr}:00` : undefined,
      notes: combinedNotes || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-2xl bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-white/[0.06] flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-slate-700 dark:text-white/80">
                <ArrowDownToLine className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  {lang === 'id' ? 'Penerimaan BBM Supplier (Refill Tangki)' : 'Inbound Supplier Fuel (Tank Refill)'}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-[#888888]">
                  {lang === 'id'
                    ? 'Pencatatan penambahan stok tangki solar langsung dari mobil tangki vendor'
                    : 'Record incoming fuel delivery from vendor truck directly to storage tank'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={inboundMutation.isPending}
              className="p-1.5 sm:p-2 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Target Storage Tank Selection: EXACT MATCH with /dispenser TankGauge cards */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-600 dark:text-[#888888] flex items-center space-x-1.5">
                  <Database className="w-3.5 h-3.5 text-cyan-500" />
                  <span>{lang === 'id' ? 'Pilih Tangki Penyimpanan Tujuan *' : 'Target Storage Tank *'}</span>
                </label>
                <span className="text-[10px] font-mono text-slate-400 dark:text-[#666]">
                  {lang === 'id' ? 'Klik kartu untuk memilih' : 'Click card to select'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tanks.map((tank) => {
                  const isSelected = tank.id === selectedTankId;
                  const percentage = Math.round((tank.currentStockLiters / tank.capacityLiters) * 100);
                  const isLow = tank.currentStockLiters <= tank.minStockAlertLiters;
                  
                  const postRefillStock = isSelected ? tank.currentStockLiters + parsedInboundLiters : tank.currentStockLiters;
                  const postRefillPercent = Math.min(100, Math.round((postRefillStock / tank.capacityLiters) * 100));

                  return (
                    <div
                      key={tank.id}
                      onClick={() => setSelectedTankId(tank.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'bg-slate-50 dark:bg-[#141414] border-cyan-500/40 dark:border-cyan-400/40 shadow-sm ring-1 ring-cyan-500/20'
                          : 'bg-white dark:bg-[#0D0D0D] border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.18] hover:bg-slate-50/50 dark:hover:bg-[#111111]'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="truncate mr-2">
                          <h4 className="text-xs font-semibold text-slate-900 dark:text-white tracking-tight truncate">
                            {tank.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-[#777777] font-mono truncate">
                            {tank.tankCode} • {tank.fuelType}
                          </p>
                        </div>
                        <div
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-colors border shrink-0 ${
                            isLow || percentage <= 15
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                              : percentage <= 30
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          <span>{percentage}%</span>
                          {isSelected && parsedInboundLiters > 0 && (
                            <span className="text-cyan-600 dark:text-cyan-400 ml-1">→ {postRefillPercent}%</span>
                          )}
                        </div>
                      </div>

                      {/* Interactive Fuel Level Progress Bar: Exact match with /dispenser */}
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden my-2.5 flex">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isLow || percentage <= 15
                              ? 'bg-rose-500'
                              : percentage <= 30
                              ? 'bg-amber-500'
                              : 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                          } ${!isSelected ? 'opacity-40' : 'opacity-100'}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                        {isSelected && parsedInboundLiters > 0 && (
                          <div
                            className="h-full rounded-full bg-cyan-400 dark:bg-cyan-300 transition-all duration-300 animate-pulse ml-0.5"
                            style={{ width: `${Math.min(Math.max(0, postRefillPercent - percentage), 100 - percentage)}%` }}
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-[#888888]">
                        <span>Available Fuel</span>
                        <span className="text-slate-900 dark:text-white font-medium">
                          {formatNumber(tank.currentStockLiters, 0)} / {formatNumber(tank.capacityLiters, 0)} L
                        </span>
                      </div>

                      {isSelected && parsedInboundLiters > 0 && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between text-[10px] font-mono">
                          <span className="text-cyan-600 dark:text-cyan-400 font-semibold">+ Inbound Refill:</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            +{formatNumber(parsedInboundLiters, 0)} L → {formatNumber(postRefillStock, 0)} L
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Volume BBM Masuk (Fuel In Liters) */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600 dark:text-[#888888] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5 text-slate-700 dark:text-white/70" />
                  <span>{lang === 'id' ? 'Volume BBM Masuk (FUEL IN - Liter) *' : 'Inbound Fuel Volume (FUEL IN - Liters) *'}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 dark:text-[#666]">
                  {lang === 'id' ? 'Pilihan Cepat' : 'Tap Presets'}
                </span>
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={fuelInLiters}
                  onChange={(e) => setFuelInLiters(e.target.value.replace(/-/g, ''))}
                  placeholder="0.0"
                  required
                  className="w-full text-xl sm:text-2xl font-mono font-bold px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.15] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#555] focus:border-slate-400 dark:focus:border-white/40 focus:outline-none shadow-sm"
                />
                <span className="absolute right-4 top-3.5 sm:top-4 text-xs font-mono text-slate-400 dark:text-[#888]">
                  LITERS
                </span>
              </div>

              {/* Touch Presets */}
              <div className="grid grid-cols-4 gap-2 pt-0.5">
                {[1000, 5000, 10000, 16000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAddVolumePreset(preset)}
                    className="py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] active:scale-95 font-mono text-xs font-semibold text-slate-700 dark:text-white border border-slate-200 dark:border-white/[0.08] transition-all shadow-sm"
                  >
                    +{formatNumber(preset, 0)}L
                  </button>
                ))}
              </div>
            </div>

            {/* Vendor / Supplier (Dropdown Option + Dynamic Add) & Driver Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600 dark:text-[#888888] flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-slate-700 dark:text-white/70" />
                    <span>{lang === 'id' ? 'Vendor / Supplier Solar *' : 'Fuel Supplier / Vendor *'}</span>
                  </label>
                  {!isAddingNewSupplier && (
                    <button
                      type="button"
                      onClick={() => setIsAddingNewSupplier(true)}
                      className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{lang === 'id' ? 'Tambah Baru' : 'Add New'}</span>
                    </button>
                  )}
                </div>

                {!isAddingNewSupplier ? (
                  <select
                    value={supplierVendor}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_NEW__') {
                        setIsAddingNewSupplier(true);
                      } else {
                        setSupplierVendor(e.target.value);
                      }
                    }}
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                    required
                  >
                    {allSuppliers.map((opt) => (
                      <option key={opt} value={opt} className="bg-white dark:bg-[#121212]">
                        {opt}
                      </option>
                    ))}
                    <option value="__ADD_NEW__" className="font-semibold text-cyan-600 dark:text-cyan-400 bg-white dark:bg-[#121212]">
                      + {lang === 'id' ? 'Tambah Supplier / Vendor Baru...' : 'Add New Vendor / Supplier...'}
                    </option>
                  </select>
                ) : (
                  <div className="space-y-1.5 p-2 rounded-2xl bg-slate-100/70 dark:bg-white/[0.04] border border-cyan-500/30">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newSupplierName}
                        onChange={(e) => setNewSupplierName(e.target.value)}
                        placeholder={lang === 'id' ? 'Nama vendor baru (contoh: PT Shell Indonesia)' : 'New vendor name...'}
                        autoFocus
                        className="flex-1 text-xs font-medium px-3 py-1.5 rounded-xl bg-white dark:bg-[#141414] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSaveNewSupplier}
                        disabled={!newSupplierName.trim()}
                        className="px-2.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-[11px] disabled:opacity-50"
                      >
                        {lang === 'id' ? 'Simpan' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewSupplier(false);
                          setNewSupplierName('');
                        }}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-[#888888]">
                  <span>{lang === 'id' ? 'Nama Supir Tangki & Plat No *' : 'Tank Driver & Plate No *'}</span>
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. WONI / KT 8821 BB"
                  required
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                />
              </div>
            </div>

            {/* Date & Time (2 Columns - Shift automatically determined) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-[#888888] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-700 dark:text-white/70" />
                  <span>{lang === 'id' ? 'Tanggal Bongkar' : 'Delivery Date'}</span>
                </label>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  required
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-[#888888] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-700 dark:text-white/70" />
                  <span>{lang === 'id' ? 'Waktu / Jam (WITA)' : 'Time (WITA)'}</span>
                </label>
                <input
                  type="time"
                  value={jamStr}
                  onChange={(e) => setJamStr(e.target.value)}
                  required
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                />
              </div>
            </div>

            {/* Delivery Order & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-[#888888] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-700 dark:text-white/70" />
                  <span>{lang === 'id' ? 'No. Surat Jalan / DO' : 'Delivery Order No. (DO)'}</span>
                </label>
                <input
                  type="text"
                  value={deliveryOrderNo}
                  onChange={(e) => setDeliveryOrderNo(e.target.value)}
                  placeholder="e.g. DO-ELN/2026/09/014"
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-[#888888]">
                  <span>{lang === 'id' ? 'Catatan Tambahan (Opsional)' : 'Additional Notes (Optional)'}</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Sounding awal 120cm, akhir 280cm"
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                />
              </div>
            </div>

            {/* Submit Button aligned with Dispenser Terminal */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={inboundMutation.isPending}
                className="w-full py-3.5 sm:py-4 rounded-full bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-[#EAEAEA] active:scale-[0.99] text-white dark:text-black font-semibold text-xs tracking-wide uppercase transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {inboundMutation.isPending ? (
                  <span>{lang === 'id' ? 'Menyimpan Penerimaan BBM...' : 'Saving Inbound Fuel Record...'}</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{lang === 'id' ? 'Simpan Penerimaan BBM' : 'Submit Inbound Fuel'}</span>
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
