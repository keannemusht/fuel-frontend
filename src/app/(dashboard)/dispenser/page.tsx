'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Unit, StorageTank, ShiftSummary } from '@/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import LiveMeterValidator from '@/components/dispenser/LiveMeterValidator';
import GloveKeypad from '@/components/dispenser/GloveKeypad';
import TankGauge from '@/components/dispenser/TankGauge';
import SearchableFleetSelect from '@/components/shared/SearchableFleetSelect';
import SearchableOperatorSelect from '@/components/shared/SearchableOperatorSelect';
import InboundFuelModal from '@/components/dispenser/InboundFuelModal';
import StockTransferModal from '@/components/dispenser/StockTransferModal';
import {
  Fuel,
  Truck,
  Droplet,
  Send,
  AlertCircle,
  CheckCircle2,
  Activity,
  Calculator,
  Database,
  User,
  Clock,
  ArrowDownToLine,
  ArrowRightLeft,
  Zap,
  Gauge,
  Radio,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { toast } from 'react-toastify';

// Auto-detect operational shift based on WITA mining site hour (06:00 - 18:00 WITA is SHIFT 1, else SHIFT 2)
const getShiftFromHour = (hour: number): string => {
  return hour >= 6 && hour < 18 ? 'SHIFT 1' : 'SHIFT 2';
};

export default function DispenserPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();

  // Mode Selection: Fuel Station (Stationary Main Senyiur) vs Fuel Truck (FT 101 / FT 102)
  const [sourceMode, setSourceMode] = useState<'STATIONARY' | 'FUEL_TRUCK'>('STATIONARY');

  // Form State
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedTankId, setSelectedTankId] = useState<string>('');
  const [currentKm, setCurrentKm] = useState<string>('');
  const [currentHm, setCurrentHm] = useState<string>('');
  const [currentKwh, setCurrentKwh] = useState<string>('');
  const [volumeLiters, setVolumeLiters] = useState<string>('');
  
  // Fuel Truck Flow Meter Fields
  const [flowAwal, setFlowAwal] = useState<string>('');
  const [flowAkhir, setFlowAkhir] = useState<string>('');

  // Live Operational WITA Telemetry Clock (Asia/Makassar, UTC+8 - synced with header clock)
  const [liveWitaTime, setLiveWitaTime] = useState<string>('');
  const [liveWitaHour, setLiveWitaHour] = useState<number>(8);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      try {
        setLiveWitaTime(
          now.toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Makassar',
            hour12: false,
          })
        );
        const witaHourStr = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Makassar',
          hour: 'numeric',
          hour12: false,
        }).format(now);
        setLiveWitaHour(parseInt(witaHourStr, 10));
      } catch {
        const utcHour = now.getUTCHours();
        const calcHour = (utcHour + 8) % 24;
        setLiveWitaHour(calcHour);
        setLiveWitaTime(now.toTimeString().split(' ')[0]);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const computedShift = getShiftFromHour(liveWitaHour);
  const [operator, setOperator] = useState<string>('');
  const [fuelInLiters, setFuelInLiters] = useState<string>('0');
  const [bypassValidation, setBypassValidation] = useState<boolean>(false);
  const [bypassReason, setBypassReason] = useState<string>('');
  const [showKeypad, setShowKeypad] = useState<boolean>(false);
  const [showInboundModal, setShowInboundModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [activeInput, setActiveInput] = useState<'km' | 'hm' | 'kwh' | 'vol' | 'flowAwal' | 'flowAkhir'>('vol');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Fetch Fleet Units
  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ['units'],
    queryFn: async () => {
      const res = await api.get('/units');
      return res.data.data;
    },
  });

  // 2. Fetch Storage Tanks
  const { data: tanks = [] } = useQuery<StorageTank[]>({
    queryKey: ['tanks'],
    queryFn: async () => {
      const res = await api.get('/tanks');
      return res.data.data;
    },
  });

  // Auto-select tank based on sourceMode
  useEffect(() => {
    if (tanks.length === 0) return;

    if (sourceMode === 'STATIONARY') {
      const mainTank = tanks.find(
        (t) => t.tankType === 'STATIONARY' || t.tankCode.includes('SENYIUR') || t.tankCode.includes('MAIN')
      );
      if (mainTank) setSelectedTankId(mainTank.id);
      else setSelectedTankId(tanks[0].id);
    } else {
      const ftTank = tanks.find(
        (t) => t.tankType === 'MOBILE_TRUCK' || t.tankCode.includes('FT')
      );
      if (ftTank) setSelectedTankId(ftTank.id);
      else setSelectedTankId(tanks[0].id);
    }
  }, [tanks, sourceMode]);

  // Auto-calculate volume when Flow Awal and Flow Akhir are entered in Fuel Truck mode
  useEffect(() => {
    if (sourceMode === 'FUEL_TRUCK') {
      const fAwal = parseFloat(flowAwal);
      const fAkhir = parseFloat(flowAkhir);
      if (!isNaN(fAwal) && !isNaN(fAkhir) && fAkhir >= fAwal) {
        setVolumeLiters(String(parseFloat((fAkhir - fAwal).toFixed(2))));
      }
    }
  }, [flowAwal, flowAkhir, sourceMode]);

  // 3. Fetch Shift Summary KPIs
  const { data: summary } = useQuery<ShiftSummary>({
    queryKey: ['shiftSummary'],
    queryFn: async () => {
      const res = await api.get('/fuel/summary');
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  const selectedUnit = units.find((u) => u.id === selectedUnitId) || null;
  const selectedTank = tanks.find((t) => t.id === selectedTankId) || null;

  // Active meter capabilities of selected unit
  const unitHasKm = selectedUnit ? (selectedUnit.hasKm ?? true) : true;
  const unitHasHm = selectedUnit ? (selectedUnit.hasHm ?? true) : true;
  const unitHasKwh = selectedUnit ? (selectedUnit.hasKwh ?? false) : false;

  const handleUnitSelect = (unitId: string) => {
    setSelectedUnitId(unitId);
    setCurrentKm('');
    setCurrentHm('');
    setCurrentKwh('');
    setErrorMessage(null);
  };

  // Dispense Mutation
  const dispenseMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/fuel/dispense', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['fuelLogs'] });
      queryClient.invalidateQueries({ queryKey: ['shiftSummary'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['tanks'] });
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });

      const successMsg =
        lang === 'id'
          ? `Pengisian berhasil dicatat: ${data.data.fuelLog.logNumber}. Transaksi telah tersinkron.`
          : `Dispense successful: ${data.data.fuelLog.logNumber}. Transaction synced.`;
      setSuccessMessage(successMsg);
      toast.success(successMsg);
      setErrorMessage(null);

      // Reset
      setVolumeLiters('');
      setCurrentKm('');
      setCurrentHm('');
      setCurrentKwh('');
      setFlowAwal('');
      setFlowAkhir('');
      setBypassValidation(false);
      setBypassReason('');

      setTimeout(() => setSuccessMessage(null), 6000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || (lang === 'id' ? 'Transaksi gagal diproses.' : 'Transaction failed.');
      setErrorMessage(msg);
      toast.error(msg);
      setSuccessMessage(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedUnitId) {
      const msg = t('dispenser.errSelectUnit', 'Pilih unit armada atau peralatan terlebih dahulu.');
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    if (!selectedTankId) {
      const msg = t('dispenser.errSelectTank', 'Pilih tangki penyimpanan sumber BBM.');
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    const km = parseFloat(currentKm);
    const hm = parseFloat(currentHm);
    const kwh = parseFloat(currentKwh);
    const vol = parseFloat(volumeLiters);
    const fuelIn = parseFloat(fuelInLiters) || 0;

    // KM Validation (Only for units with KM tracking, e.g. LV, PM)
    if (unitHasKm) {
      if (isNaN(km) || km < 0) {
        const msg = 'Nilai Odometer (KM) tidak valid atau bernilai negatif (< 0).';
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }
      if (!bypassValidation && selectedUnit && selectedUnit.lastKm > 0 && km < selectedUnit.lastKm) {
        const msg = `Odometer (${km} KM) tidak boleh lebih kecil dari KM sebelumnya (${selectedUnit.lastKm} KM).`;
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }
    }

    // HM Validation (Only for units with HM tracking, e.g. Genset, PM)
    if (unitHasHm) {
      if (isNaN(hm) || hm < 0) {
        const msg = 'Nilai Hour Meter (HM) tidak valid atau bernilai negatif (< 0).';
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }
      if (!bypassValidation && selectedUnit && selectedUnit.lastHm > 0 && hm <= selectedUnit.lastHm) {
        const msg =
          hm === selectedUnit.lastHm
            ? `Hour Meter (${hm}) tidak boleh sama dengan HM sebelumnya (${selectedUnit.lastHm}). HM harus bertambah.`
            : `Hour Meter (${hm}) tidak boleh lebih kecil dari HM sebelumnya (${selectedUnit.lastHm}).`;
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }
    }

    // KWH Validation (Only for units with KWH tracking, e.g. Genset GS)
    if (unitHasKwh) {
      if (isNaN(kwh) || kwh < 0) {
        const msg = 'Nilai KWH Genset tidak valid atau bernilai negatif (< 0).';
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }
      if (!bypassValidation && selectedUnit && (selectedUnit.lastKwh || 0) > 0 && kwh < (selectedUnit.lastKwh || 0)) {
        const msg = `KWH (${kwh}) tidak boleh lebih kecil dari KWH sebelumnya (${selectedUnit.lastKwh}).`;
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }
    }

    if ((isNaN(vol) || vol <= 0) && fuelIn <= 0) {
      const msg = t('dispenser.errEnterVolume', 'Masukkan volume pengisian dalam satuan Liter.');
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    if (!operator.trim()) {
      const msg = t('dispenser.errEnterOperator', 'Pilih atau ketik nama operator / driver penerima BBM.');
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    const fAwal = flowAwal ? parseFloat(flowAwal) : undefined;
    const fAkhir = flowAkhir ? parseFloat(flowAkhir) : undefined;

    dispenseMutation.mutate({
      unitId: selectedUnitId,
      tankId: selectedTankId,
      currentKm: unitHasKm ? km : undefined,
      currentHm: unitHasHm ? hm : undefined,
      currentKwh: unitHasKwh ? kwh : undefined,
      volumeLiters: vol,
      shift: computedShift,
      operator: operator.trim(),
      fuelInLiters: fuelIn,
      jamStr: liveWitaTime || undefined,
      sourceType: sourceMode === 'FUEL_TRUCK' ? 'FUEL_TRUCK' : 'FUEL_STATION',
      flowAwal: fAwal,
      flowAkhir: fAkhir,
      totalisatorQty: fAkhir && fAwal ? parseFloat((fAkhir - fAwal).toFixed(2)) : undefined,
      bypassValidation,
      bypassReason: bypassValidation ? bypassReason : undefined,
    });
  };

  const handleKeypadPress = (val: string) => {
    if (activeInput === 'km') setCurrentKm((prev) => prev + val);
    else if (activeInput === 'hm') setCurrentHm((prev) => prev + val);
    else if (activeInput === 'kwh') setCurrentKwh((prev) => prev + val);
    else if (activeInput === 'flowAwal') setFlowAwal((prev) => prev + val);
    else if (activeInput === 'flowAkhir') setFlowAkhir((prev) => prev + val);
    else setVolumeLiters((prev) => prev + val);
  };

  const handleKeypadClear = () => {
    if (activeInput === 'km') setCurrentKm('');
    else if (activeInput === 'hm') setCurrentHm('');
    else if (activeInput === 'kwh') setCurrentKwh('');
    else if (activeInput === 'flowAwal') setFlowAwal('');
    else if (activeInput === 'flowAkhir') setFlowAkhir('');
    else setVolumeLiters('');
  };

  const handleKeypadBackspace = () => {
    if (activeInput === 'km') setCurrentKm((prev) => prev.slice(0, -1));
    else if (activeInput === 'hm') setCurrentHm((prev) => prev.slice(0, -1));
    else if (activeInput === 'kwh') setCurrentKwh((prev) => prev.slice(0, -1));
    else if (activeInput === 'flowAwal') setFlowAwal((prev) => prev.slice(0, -1));
    else if (activeInput === 'flowAkhir') setFlowAkhir((prev) => prev.slice(0, -1));
    else setVolumeLiters((prev) => prev.slice(0, -1));
  };

  const handleQuickAddVolume = (liters: number) => {
    const current = parseFloat(volumeLiters) || 0;
    setVolumeLiters(String(current + liters));
    setActiveInput('vol');
  };

  const fuelTruckTanks = tanks.filter(
    (t) => t.tankType === 'MOBILE_TRUCK' || t.tankCode.includes('FT')
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header / Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
            <Fuel className="w-5 h-5 text-slate-700 dark:text-white/70" />
            <span>{t('dispenser.title', 'Terminal Pengisian Bahan Bakar')}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#888888] mt-0.5">
            Sistem pengisian multi-storage terintegrasi (Fuel Station & Fuel Truck) dengan auto-sync Excel & Google Sheets
          </p>
        </div>

        {/* Action Buttons: Inbound Refill & Stock Transfer */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTransferModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition shadow-sm"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer Stock</span>
          </button>
          <button
            type="button"
            onClick={() => setShowInboundModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition shadow-sm"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>+ BBM Masuk (DO)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Total Dispensed, Transactions, Inbound Refills, Active Tanks */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] shadow-sm relative overflow-hidden">
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-[#888888]">Total BBM Disalurkan</p>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
            <h3 className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {formatNumber(summary?.totalDispensedLiters || 0, 1)}
              <span className="text-[10px] sm:text-xs font-normal text-slate-500 dark:text-[#888888] ml-1 font-sans">L</span>
            </h3>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-slate-700 dark:text-white/70">
              <Fuel className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] shadow-sm relative overflow-hidden">
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-[#888888]">Total Transaksi Shift</p>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
            <h3 className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {summary?.totalTransactions || 0}
              <span className="text-[10px] sm:text-xs font-normal text-slate-500 dark:text-[#888888] ml-1 font-sans">Unit</span>
            </h3>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-slate-700 dark:text-white/70">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] shadow-sm relative overflow-hidden">
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-[#888888]">Penerimaan Inbound</p>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
            <h3 className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {formatNumber(summary?.totalFuelInLiters || 0, 0)}
              <span className="text-[10px] sm:text-xs font-normal text-slate-500 dark:text-[#888888] ml-1 font-sans">L</span>
            </h3>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Droplet className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] shadow-sm relative overflow-hidden">
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-[#888888]">Mode Pengisian Aktif</p>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
            <h3 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {sourceMode === 'STATIONARY' ? 'Stationary Dispenser' : selectedTank?.name || 'Fuel Truck'}
            </h3>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
        </div>
      </div>

      {/* Main Dispensing Form Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left Column: Dispensing Controls & Form (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <form
            onSubmit={handleSubmit}
            className="p-5 sm:p-7 rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] shadow-sm space-y-4"
          >
            {/* Top Bar: Operational Mode Toggle & Keypad Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.06] gap-3">
              {/* Storage Mode Selector Segmented Pill */}
              <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setSourceMode('STATIONARY')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    sourceMode === 'STATIONARY'
                      ? 'bg-white dark:bg-[#1E1E1E] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-[#888] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Fuel className="w-3.5 h-3.5 text-amber-500" />
                  <span>Fuel Station (Main Senyiur)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode('FUEL_TRUCK')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    sourceMode === 'FUEL_TRUCK'
                      ? 'bg-white dark:bg-[#1E1E1E] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-[#888] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Fuel Truck (FT 101 / 102)</span>
                </button>
              </div>

              {/* Keypad Toggle Button */}
              <button
                type="button"
                onClick={() => setShowKeypad(!showKeypad)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  showKeypad
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] text-slate-600 dark:text-[#888888] hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/[0.08]'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Keypad {showKeypad ? 'Aktif' : 'Off'}</span>
              </button>
            </div>

            {/* Banners */}
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Target Unit Selection with Searchable Combobox */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-[#CCC] flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Truck className="w-3.5 h-3.5 text-slate-700 dark:text-white/70" />
                  <span>Target Unit / Armada</span>
                </span>
                {selectedUnit && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#AAA]">
                    {selectedUnit.category}
                  </span>
                )}
              </label>
              <SearchableFleetSelect
                units={units}
                selectedUnitId={selectedUnitId}
                onSelectUnit={handleUnitSelect}
                placeholder="-- Cari atau pilih nomor unit (e.g. PM 401, LV 501, GS 002) --"
              />
            </div>

            {/* Storage Tank Selection */}
            {sourceMode === 'STATIONARY' ? (
              <TankGauge
                title="Source Fuel Storage Tank"
                icon={<Database className="w-3.5 h-3.5 text-cyan-500" />}
                tanks={tanks.filter((t) => t.tankType === 'STATIONARY' || t.tankCode.includes('SENYIUR') || t.tankCode.includes('MAIN'))}
                selectedTankId={selectedTankId}
                onSelectTank={setSelectedTankId}
              />
            ) : (
              <TankGauge
                title="Pilih Mobile Fuel Truck Pengisi"
                icon={<Truck className="w-3.5 h-3.5 text-cyan-500" />}
                tanks={fuelTruckTanks}
                selectedTankId={selectedTankId}
                onSelectTank={setSelectedTankId}
              />
            )}

            {/* Fuel Truck Mode: Flow Meter Awal & Flow Meter Akhir Totalisator */}
            {sourceMode === 'FUEL_TRUCK' && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.08] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-cyan-500" />
                    Flow Meter Totalisator Fuel Truck
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-[#888] font-mono">
                    Totalisator Qty = Akhir - Awal
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-500 dark:text-[#888]">
                      Flow Meter Awal
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={flowAwal}
                      onFocus={() => setActiveInput('flowAwal')}
                      onChange={(e) => setFlowAwal(e.target.value.replace(/-/g, ''))}
                      placeholder="0.0"
                      className="w-full text-sm font-mono font-medium px-3.5 py-2 rounded-xl bg-white dark:bg-[#0E0E0E] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-500 dark:text-[#888]">
                      Flow Meter Akhir
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={flowAkhir}
                      onFocus={() => setActiveInput('flowAkhir')}
                      onChange={(e) => setFlowAkhir(e.target.value.replace(/-/g, ''))}
                      placeholder="0.0"
                      className="w-full text-sm font-mono font-medium px-3.5 py-2 rounded-xl bg-white dark:bg-[#0E0E0E] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Smart Live Meter Validator */}
            <LiveMeterValidator
              unit={selectedUnit}
              currentKm={currentKm.trim() !== '' ? parseFloat(currentKm) : null}
              currentHm={currentHm.trim() !== '' ? parseFloat(currentHm) : null}
              currentKwh={currentKwh.trim() !== '' ? parseFloat(currentKwh) : null}
              bypassValidation={bypassValidation}
              onToggleBypass={setBypassValidation}
              bypassReason={bypassReason}
              onChangeBypassReason={setBypassReason}
              isAdmin={user?.role === 'ADMIN'}
            />

            {/* Smart Dynamic Meter Inputs (Show only what this unit needs!) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
              {/* Odometer (KM) Input: Only if unit has KM */}
              {unitHasKm && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-[#888888] flex items-center justify-between">
                    <span>Odometer (KM) *</span>
                    {selectedUnit && (
                      <span className="text-[10px] font-mono text-slate-400 dark:text-[#666]">
                        Prev: {formatNumber(selectedUnit.lastKm, 1)}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={currentKm}
                      onFocus={() => setActiveInput('km')}
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'Minus') e.preventDefault();
                      }}
                      onChange={(e) => setCurrentKm(e.target.value.replace(/-/g, ''))}
                      placeholder={selectedUnit ? `${selectedUnit.lastKm + 10}` : '0.0'}
                      className="w-full text-sm font-mono font-medium px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#555] focus:outline-none shadow-sm"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-mono text-slate-400 dark:text-[#666]">
                      KM
                    </span>
                  </div>
                </div>
              )}

              {/* Hour Meter (HM) Input: Only if unit has HM */}
              {unitHasHm && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-[#888888] flex items-center justify-between">
                    <span>Hour Meter (HM) *</span>
                    {selectedUnit && (
                      <span className="text-[10px] font-mono text-slate-400 dark:text-[#666]">
                        Prev: {formatNumber(selectedUnit.lastHm, 1)}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={currentHm}
                      onFocus={() => setActiveInput('hm')}
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'Minus') e.preventDefault();
                      }}
                      onChange={(e) => setCurrentHm(e.target.value.replace(/-/g, ''))}
                      placeholder={selectedUnit ? `${selectedUnit.lastHm + 1}` : '0.0'}
                      className="w-full text-sm font-mono font-medium px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#555] focus:outline-none shadow-sm"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-mono text-slate-400 dark:text-[#666]">
                      HRS
                    </span>
                  </div>
                </div>
              )}

              {/* KWH Input: For Genset */}
              {unitHasKwh && (
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-[#888888] flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Daya Genset (KWH) *
                    </span>
                    {selectedUnit && (
                      <span className="text-[10px] font-mono text-slate-400 dark:text-[#666]">
                        Prev: {formatNumber(selectedUnit.lastKwh || 0, 1)} KWH
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={currentKwh}
                      onFocus={() => setActiveInput('kwh')}
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'Minus') e.preventDefault();
                      }}
                      onChange={(e) => setCurrentKwh(e.target.value.replace(/-/g, ''))}
                      placeholder="e.g. 1420.5"
                      className="w-full text-sm font-mono font-medium px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#555] focus:outline-none shadow-sm"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-mono text-slate-400 dark:text-[#666]">
                      KWH
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Dispense Volume (QTY OUT - Liters) & Touch Presets */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-[#CCC] flex items-center justify-between">
                <span>{t('dispenser.dispenseQty', 'Volume Pengisian (QTY OUT - Liter)')}</span>
                <span className="text-[10px] font-mono text-slate-400 dark:text-[#666]">Tap Presets</span>
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={volumeLiters}
                  onFocus={() => setActiveInput('vol')}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'Minus') e.preventDefault();
                  }}
                  onChange={(e) => setVolumeLiters(e.target.value.replace(/-/g, ''))}
                  placeholder="0.0"
                  className="w-full text-xl sm:text-2xl font-mono font-bold px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.15] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#555] focus:outline-none shadow-sm"
                />
                <span className="absolute right-4 top-3.5 sm:top-4 text-xs font-mono text-slate-400 dark:text-[#888888]">
                  Liter
                </span>
              </div>

              {/* Touch Presets */}
              <div className="grid grid-cols-4 gap-2 pt-0.5">
                {[50, 100, 200, 500].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleQuickAddVolume(preset)}
                    className="py-2 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-900 active:text-white dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:active:bg-white dark:active:text-black font-mono text-xs font-semibold text-slate-700 dark:text-white border border-slate-200 dark:border-white/[0.08] transition-all shadow-sm"
                  >
                    +{preset}L
                  </button>
                ))}
              </div>
            </div>

            {/* Operator & Time (WITA) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-[#888888] flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-slate-700 dark:text-white/70" />
                  <span>{t('dispenser.operatorDriver', 'Operator / Driver Penerima')}</span>
                </label>
                <SearchableOperatorSelect
                  value={operator}
                  onChange={setOperator}
                  placeholder="Cari atau ketik nama operator..."
                  required
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600 dark:text-[#888888] flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-700 dark:text-white/70" />
                    <span>Jam (WITA)</span>
                  </label>
                  <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-[9px] font-mono text-slate-600 dark:text-[#888]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{computedShift === 'SHIFT 1' ? 'Shift 1' : 'Shift 2'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2.5 h-[41px] rounded-2xl bg-slate-100/70 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.1] shadow-sm select-none cursor-default">
                  <div className="flex items-center space-x-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white tracking-wider">
                      {liveWitaTime || '00:00:00'}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-slate-400 dark:text-[#777]">
                      WITA
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-[9px] font-mono text-slate-500 dark:text-[#888] bg-slate-200/60 dark:bg-white/[0.06] px-2 py-0.5 rounded-md border border-slate-300/40 dark:border-white/[0.04]">
                    <Clock className="w-2.5 h-2.5 text-slate-400 dark:text-[#777]" />
                    <span>Live Auto</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={dispenseMutation.isPending}
              className="w-full py-3.5 sm:py-4 rounded-full bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-[#EAEAEA] active:scale-[0.99] text-white dark:text-black font-semibold text-xs tracking-wide uppercase transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 mt-2 text-white-forced"
            >
              {dispenseMutation.isPending ? (
                <span className="text-white dark:text-black font-semibold">Menyimpan Transaksi...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-white dark:text-black" />
                  <span className="text-white dark:text-black font-semibold">Simpan & Sinkronkan</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Keypad & Unit Benchmark Info (5 cols) */}
        <div className="lg:col-span-5 space-y-5 sm:space-y-6">
          {showKeypad && (
            <GloveKeypad
              onKeyPress={handleKeypadPress}
              onClear={handleKeypadClear}
              onBackspace={handleKeypadBackspace}
              onQuickAdd={handleQuickAddVolume}
            />
          )}

          {/* Unit Telemetry Info */}
          {selectedUnit ? (
            <div className="p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] shadow-sm space-y-3.5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.06]">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">{selectedUnit.unitCode}</h3>
                  <p className="text-xs text-slate-500 dark:text-[#888888]">{selectedUnit.makeModel || 'Fleet Equipment'}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-white border border-slate-200 dark:border-white/[0.1]">
                    {selectedUnit.category}
                  </span>
                </div>
              </div>

              {/* Meter Capability Badge */}
              <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                {unitHasKm && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    &bull; Odometer KM Wajib
                  </span>
                )}
                {unitHasHm && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    &bull; Hour Meter HM Wajib
                  </span>
                )}
                {unitHasKwh && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    &bull; KWH Genset Wajib
                  </span>
                )}
                {!unitHasKm && !unitHasHm && !unitHasKwh && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    &bull; Direct Volume Only (Non-Meter)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.06]">
                  <span className="text-[10px] text-slate-400 dark:text-[#777] block mb-1">No Polisi</span>
                  <span className="font-medium text-slate-900 dark:text-white">{selectedUnit.plateNumber || 'Unit Site'}</span>
                </div>

                <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.06]">
                  <span className="text-[10px] text-slate-400 dark:text-[#777] block mb-1">Status</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">Aktif Operasional</span>
                </div>

                {unitHasKm && (
                  <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 dark:text-[#777] block mb-1">KM Terakhir</span>
                    <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{formatNumber(selectedUnit.lastKm, 1)} KM</span>
                  </div>
                )}

                {unitHasHm && (
                  <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 dark:text-[#777] block mb-1">HM Terakhir</span>
                    <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{formatNumber(selectedUnit.lastHm, 1)} HRS</span>
                  </div>
                )}

                {unitHasKwh && (
                  <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.06] col-span-2">
                    <span className="text-[10px] text-slate-400 dark:text-[#777] block mb-1">KWH Terakhir</span>
                    <span className="font-bold text-amber-500 text-xs sm:text-sm">{formatNumber(selectedUnit.lastKwh || 0, 1)} KWH</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] shadow-sm text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/[0.05] mx-auto flex items-center justify-center text-slate-400 dark:text-white/50 border border-slate-200 dark:border-white/[0.08]">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white tracking-wide">
                Pilih Unit Armada untuk Telemetri Baseline
              </h4>
              <p className="text-xs text-slate-500 dark:text-[#888888] leading-relaxed">
                Kalkulasi delta membandingkan Hour Meter, Odometer, dan Daya KWH secara live real-time.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Inbound Fuel (Storage Tank Refill) Modal */}
      <InboundFuelModal
        isOpen={showInboundModal}
        onClose={() => setShowInboundModal(false)}
        defaultTankId={selectedTankId}
      />

      {/* Stock Transfer Modal (FT 101/102 <-> Main Senyiur) */}
      <StockTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        defaultSourceTankId={selectedTankId}
      />
    </div>
  );
}
