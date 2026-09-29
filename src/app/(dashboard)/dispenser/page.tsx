'use client';

import React, { useState } from 'react';
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
import {
  Fuel,
  Truck,
  Droplet,
  Send,
  AlertCircle,
  CheckCircle2,
  Activity,
  Calculator,
  User,
  Clock,
  ArrowDownToLine,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { toast } from 'react-toastify';

// Get current WITA operational time (HH:mm)
const getInitialWitaTime = (): string => {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Makassar',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
  } catch {
    const d = new Date();
    const h = String((d.getUTCHours() + 8) % 24).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
};

// Auto-detect operational shift based on WITA mining site time (06:00 - 18:00 WITA is SHIFT 1, else SHIFT 2)
const getOperationalShift = (): string => {
  try {
    const witaHourStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Makassar',
      hour: 'numeric',
      hour12: false,
    }).format(new Date());
    const hour = parseInt(witaHourStr, 10);
    return hour >= 6 && hour < 18 ? 'SHIFT 1' : 'SHIFT 2';
  } catch {
    const hour = (new Date().getUTCHours() + 8) % 24;
    return hour >= 6 && hour < 18 ? 'SHIFT 1' : 'SHIFT 2';
  }
};

// Calculate shift based on user input time (HH:mm)
const getShiftFromTime = (timeStr?: string): string => {
  if (!timeStr) return getOperationalShift();
  const parts = timeStr.split(':');
  const hour = parseInt(parts[0], 10);
  if (isNaN(hour)) return getOperationalShift();
  return hour >= 6 && hour < 18 ? 'SHIFT 1' : 'SHIFT 2';
};

export default function DispenserPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();

  // Form State
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedTankId, setSelectedTankId] = useState<string>('');
  const [currentKm, setCurrentKm] = useState<string>('');
  const [currentHm, setCurrentHm] = useState<string>('');
  const [volumeLiters, setVolumeLiters] = useState<string>('');
  const [jamStr, setJamStr] = useState<string>(() => getInitialWitaTime());
  const computedShift = getShiftFromTime(jamStr);
  const [operator, setOperator] = useState<string>('');
  const [fuelInLiters, setFuelInLiters] = useState<string>('0');
  const [bypassValidation, setBypassValidation] = useState<boolean>(false);
  const [bypassReason, setBypassReason] = useState<string>('');
  const [showKeypad, setShowKeypad] = useState<boolean>(false);
  const [showInboundModal, setShowInboundModal] = useState<boolean>(false);
  const [activeInput, setActiveInput] = useState<'km' | 'hm' | 'vol'>('vol');
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

  // Auto-select first tank if none selected
  React.useEffect(() => {
    if (tanks.length > 0 && !selectedTankId) {
      setSelectedTankId(tanks[0].id);
    }
  }, [tanks, selectedTankId]);

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

  const handleUnitSelect = (unitId: string) => {
    setSelectedUnitId(unitId);
    setCurrentKm('');
    setCurrentHm('');
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
      setJamStr(getInitialWitaTime());
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
      const msg = t('dispenser.errSelectUnit', 'Pilih unit alat berat target terlebih dahulu.');
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    if (!selectedTankId) {
      const msg = t('dispenser.errSelectTank', 'Pilih tangki penyimpanan solar.');
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    const km = parseFloat(currentKm);
    const hm = parseFloat(currentHm);
    const vol = parseFloat(volumeLiters);
    const fuelIn = parseFloat(fuelInLiters) || 0;

    if (isNaN(km) || km < 0) {
      const msg = lang === 'id'
        ? 'Nilai Odometer (KM) tidak valid atau bernilai negatif (< 0).'
        : 'Invalid Odometer (KM) value or negative (< 0).';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (isNaN(hm) || hm < 0) {
      const msg = lang === 'id'
        ? 'Nilai Hour Meter (HM) tidak valid atau bernilai negatif (< 0).'
        : 'Invalid Hour Meter (HM) value or negative (< 0).';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (!bypassValidation) {
      if (selectedUnit && selectedUnit.lastHm > 0 && hm <= selectedUnit.lastHm) {
        const msg = lang === 'id'
          ? (hm === selectedUnit.lastHm
            ? `Hour Meter (${hm}) tidak boleh sama dengan HM sebelumnya (${selectedUnit.lastHm}). HM harus bertambah.`
            : `Hour Meter (${hm}) tidak boleh lebih kecil dari HM sebelumnya (${selectedUnit.lastHm}).`)
          : (hm === selectedUnit.lastHm
            ? `Hour Meter (${hm}) cannot be equal to previous HM (${selectedUnit.lastHm}). HM must increase.`
            : `Hour Meter (${hm}) cannot be lower than previous HM (${selectedUnit.lastHm}).`);
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }
      if (selectedUnit && selectedUnit.lastKm > 0 && km < selectedUnit.lastKm) {
        const msg = lang === 'id'
          ? `Odometer (${km}) tidak boleh lebih kecil dari KM sebelumnya (${selectedUnit.lastKm}).`
          : `Odometer (${km}) cannot be lower than previous KM (${selectedUnit.lastKm}).`;
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }
    }

    if ((isNaN(vol) || vol <= 0) && fuelIn <= 0) {
      const msg = t('dispenser.errEnterVolume', 'Please enter dispensed volume in Liters.');
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    if (!operator.trim()) {
      const msg = t('dispenser.errEnterOperator', 'Please enter unit driver / machine operator name.');
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    dispenseMutation.mutate({
      unitId: selectedUnitId,
      tankId: selectedTankId,
      currentKm: km,
      currentHm: hm,
      volumeLiters: vol,
      shift: computedShift,
      operator: operator.trim(),
      fuelInLiters: fuelIn,
      jamStr: jamStr ? `${jamStr}:00` : undefined,
      bypassValidation,
      bypassReason: bypassValidation ? bypassReason : undefined,
    });
  };

  const handleKeypadPress = (val: string) => {
    if (activeInput === 'km') {
      setCurrentKm((prev) => prev + val);
    } else if (activeInput === 'hm') {
      setCurrentHm((prev) => prev + val);
    } else {
      setVolumeLiters((prev) => prev + val);
    }
  };

  const handleKeypadClear = () => {
    if (activeInput === 'km') setCurrentKm('');
    else if (activeInput === 'hm') setCurrentHm('');
    else setVolumeLiters('');
  };

  const handleKeypadBackspace = () => {
    if (activeInput === 'km') setCurrentKm((prev) => prev.slice(0, -1));
    else if (activeInput === 'hm') setCurrentHm((prev) => prev.slice(0, -1));
    else setVolumeLiters((prev) => prev.slice(0, -1));
  };

  const handleQuickAddVolume = (liters: number) => {
    const current = parseFloat(volumeLiters) || 0;
    setVolumeLiters(String(current + liters));
    setActiveInput('vol');
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header / Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
            <Fuel className="w-5 h-5 text-slate-700 dark:text-white/70" />
            <span>{t('dispenser.title', 'Fuel Dispensing Terminal')}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#888888] mt-0.5">
            {t('dispenser.subtitle', 'Real-time meter validation, transaction logging, and automated Google Sheets sync')}
          </p>
        </div>
      </div>

      {/* Responsive KPI Cards: 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] shadow-sm relative overflow-hidden">
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-[#888888]">{t('dispenser.fuelDispensed', 'Fuel Dispensed')}</p>
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
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-[#888888]">{t('dispenser.transactions', 'Transactions')}</p>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
            <h3 className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {summary?.totalTransactions || 0}
              <span className="text-[10px] sm:text-xs font-normal text-slate-500 dark:text-[#888888] ml-1 font-sans">{t('common.units', 'Units')}</span>
            </h3>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-slate-700 dark:text-white/70">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-[#888888]">{t('dispenser.inboundRefills', 'Inbound Refills')}</p>
            <button
              type="button"
              onClick={() => setShowInboundModal(true)}
              className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              <span>+ Refill</span>
            </button>
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
            <h3 className="text-lg sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {formatNumber(summary?.totalFuelInLiters || 0, 1)}
              <span className="text-[10px] sm:text-xs font-normal text-slate-500 dark:text-[#888888] ml-1 font-sans">L</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowInboundModal(true)}
              title={lang === 'id' ? 'Catat Penerimaan BBM (Refill Tangki)' : 'Record Inbound Fuel (Tank Refill)'}
              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 transition-colors"
            >
              <Droplet className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] shadow-sm relative overflow-hidden">
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-[#888888]">{t('dispenser.dutyOfficer', 'Duty Officer')}</p>
          <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
            <div className="truncate max-w-[100px] sm:max-w-[140px]">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                {user?.fullName || 'Budi S.'}
              </h3>
              <p className="text-[9px] sm:text-[10px] font-mono text-slate-500 dark:text-[#888888] uppercase truncate">
                {user?.role || 'FUELMAN'}
              </p>
            </div>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-900 text-white dark:bg-white/10 dark:text-white border border-slate-800 dark:border-white/15 flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">
              <span className="!text-white font-bold">{user?.fullName?.charAt(0) || 'U'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left Column: Form (7 cols) */}
        <div className="lg:col-span-7 space-y-5 sm:space-y-6">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] shadow-sm space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-white/[0.06]">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white tracking-tight">{t('dispenser.docketTitle', 'Fuel Dispensing Docket')}</h2>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-[#888888]">{t('dispenser.docketSubtitle', 'Delta Motor Validation Engine Active')}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowInboundModal(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 transition-all shadow-sm"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>{lang === 'id' ? '+ BBM Masuk' : '+ Inbound Fuel'}</span>
                </button>

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
                  <span>Keypad {showKeypad ? (lang === 'id' ? 'Aktif' : 'On') : (lang === 'id' ? 'Nonaktif' : 'Off')}</span>
                </button>
              </div>
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

            {/* Target Unit with Searchable Combobox */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-[#888888] flex items-center space-x-1.5">
                <Truck className="w-3.5 h-3.5 text-slate-700 dark:text-white/70" />
                <span>{t('dispenser.selectUnit', 'Select Target Equipment Unit')}</span>
              </label>
              <SearchableFleetSelect
                units={units}
                selectedUnitId={selectedUnitId}
                onSelectUnit={handleUnitSelect}
                placeholder={t('dispenser.searchUnitPlaceholder', '-- Cari atau pilih unit fleet target --')}
              />
            </div>

            {/* Storage Tank Selection */}
            <TankGauge
              tanks={tanks}
              selectedTankId={selectedTankId}
              onSelectTank={setSelectedTankId}
            />

            {/* Live Delta Validator */}
            <LiveMeterValidator
              unit={selectedUnit}
              currentKm={currentKm.trim() !== '' ? parseFloat(currentKm) : null}
              currentHm={currentHm.trim() !== '' ? parseFloat(currentHm) : null}
              bypassValidation={bypassValidation}
              onToggleBypass={setBypassValidation}
              bypassReason={bypassReason}
              onChangeBypassReason={setBypassReason}
              isAdmin={user?.role === 'ADMIN'}
            />

            {/* Meter Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-[#888888] flex items-center justify-between">
                  <span>{t('dispenser.odometerKm', 'Current Odometer (KM)')}</span>
                  {selectedUnit && (
                    <span className="text-[10px] font-mono text-slate-400 dark:text-[#666]">
                      {t('dispenser.prevKm', 'Prev')}: {formatNumber(selectedUnit.lastKm, 1)}
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
                      if (e.key === '-' || e.key === 'Minus') {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/-/g, '');
                      setCurrentKm(cleanVal);
                    }}
                    placeholder={selectedUnit ? `${selectedUnit.lastKm + 10}` : '0.0'}
                    className="w-full text-sm font-mono font-medium px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#555] focus:border-slate-400 dark:focus:border-white/30 focus:outline-none shadow-sm"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-mono text-slate-400 dark:text-[#666]">
                    KM
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-[#888888] flex items-center justify-between">
                  <span>{t('dispenser.hourMeterHm', 'Current Hour Meter (HM)')}</span>
                  {selectedUnit && (
                    <span className="text-[10px] font-mono text-slate-400 dark:text-[#666]">
                      {t('dispenser.prevHm', 'Prev')}: {formatNumber(selectedUnit.lastHm, 1)}
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
                      if (e.key === '-' || e.key === 'Minus') {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/-/g, '');
                      setCurrentHm(cleanVal);
                    }}
                    placeholder={selectedUnit ? `${selectedUnit.lastHm + 1}` : '0.0'}
                    className="w-full text-sm font-mono font-medium px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#555] focus:border-slate-400 dark:focus:border-white/30 focus:outline-none shadow-sm"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-mono text-slate-400 dark:text-[#666]">
                    HRS
                  </span>
                </div>
              </div>
            </div>

            {/* Dispense Volume & Touch Presets */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600 dark:text-[#888888] flex items-center justify-between">
                <span>{t('dispenser.dispenseQty', 'Dispense Quantity (QTY OUT - Liters)')}</span>
                <span className="text-[10px] font-mono text-slate-400 dark:text-[#666]">{t('dispenser.tapPresets', 'Tap Presets')}</span>
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={volumeLiters}
                  onFocus={() => setActiveInput('vol')}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'Minus') {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/-/g, '');
                    setVolumeLiters(cleanVal);
                  }}
                  placeholder="0.0"
                  className="w-full text-xl sm:text-2xl font-mono font-bold px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.15] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#555] focus:border-slate-400 dark:focus:border-white/40 focus:outline-none shadow-sm"
                />
                <span className="absolute right-4 top-3.5 sm:top-4 text-xs font-mono text-slate-400 dark:text-[#888888]">
                  {t('common.liters', 'Liters')}
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

            {/* Operator & Transaction Time (Jam WITA) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600 dark:text-[#888888] flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-slate-700 dark:text-white/70" />
                    <span>{t('dispenser.operatorDriver', 'Operator / Driver')}</span>
                  </label>
                </div>
                <SearchableOperatorSelect
                  value={operator}
                  onChange={setOperator}
                  placeholder={t('dispenser.searchOperatorPlaceholder', 'Cari atau ketik nama operator...')}
                  required
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600 dark:text-[#888888] flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-700 dark:text-white/70" />
                    <span>{lang === 'id' ? 'Jam (WITA)' : 'Time (WITA)'}</span>
                  </label>
                  <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-[9px] font-mono text-slate-600 dark:text-[#888]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>{computedShift === 'SHIFT 1' ? 'Shift 1' : 'Shift 2'}</span>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="time"
                    value={jamStr}
                    onChange={(e) => setJamStr(e.target.value)}
                    required
                    className="w-full text-xs font-mono font-medium px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white placeholder-slate-400 focus:border-slate-400 dark:focus:border-white/30 focus:outline-none shadow-sm"
                  />
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
                <span className="text-white dark:text-black font-semibold">{t('dispenser.recording', 'Recording Transaction...')}</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-white dark:text-black" />
                  <span className="text-white dark:text-black font-semibold">{t('dispenser.recordAndSync', 'Submit')}</span>
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
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-white border border-slate-200 dark:border-white/[0.1]">
                  {selectedUnit.category}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.06]">
                  <span className="text-[10px] text-slate-400 dark:text-[#777] block mb-1">{t('dispenser.plateNumber', 'Plate Number')}</span>
                  <span className="font-medium text-slate-900 dark:text-white">{selectedUnit.plateNumber || 'Site Unit'}</span>
                </div>

                <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.06]">
                  <span className="text-[10px] text-slate-400 dark:text-[#777] block mb-1">{t('dispenser.status', 'Status')}</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{t('common.active', 'Active')}</span>
                </div>

                <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.06]">
                  <span className="text-[10px] text-slate-400 dark:text-[#777] block mb-1">{t('dispenser.lastKm', 'Last KM')}</span>
                  <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{formatNumber(selectedUnit.lastKm, 1)} KM</span>
                </div>

                <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.06]">
                  <span className="text-[10px] text-slate-400 dark:text-[#777] block mb-1">{t('dispenser.lastHm', 'Last HM')}</span>
                  <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{formatNumber(selectedUnit.lastHm, 1)} HRS</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] shadow-sm text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/[0.05] mx-auto flex items-center justify-center text-slate-400 dark:text-white/50 border border-slate-200 dark:border-white/[0.08]">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white tracking-wide">
                {t('dispenser.inspectBaselines', 'Select a Unit to Inspect Baselines')}
              </h4>
              <p className="text-xs text-slate-500 dark:text-[#888888] leading-relaxed">
                {t('dispenser.inspectDesc', 'Delta calculations compare against last recorded Hour Meter and Odometer in real-time.')}
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
    </div>
  );
}
