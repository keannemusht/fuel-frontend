'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Unit, StorageTank, MeterContextResponse, FuelLog } from '@/types';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import {
  CalendarPlus,
  Calendar,
  Clock,
  Truck,
  Database,
  Fuel,
  Send,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  History,
  ArrowRight,
  Info,
  Check,
  Search,
  ChevronDown,
  User as UserIcon,
  ShieldCheck,
  RotateCcw,
  Plus,
  Layers,
  CheckCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import SearchableOperatorSelect from '@/components/shared/SearchableOperatorSelect';
import CustomSelect, { CustomSelectOption } from '@/components/shared/CustomSelect';
import { toast } from 'react-toastify';

const BACKDATE_SHIFT_OPTIONS: CustomSelectOption[] = [
  {
    value: 'SHIFT 1',
    label: 'SHIFT 1 (Day / Siang)',
    sublabel: '06:00 - 18:00',
    badge: 'SHIFT 1',
    icon: <Clock className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />,
  },
  {
    value: 'SHIFT 2',
    label: 'SHIFT 2 (Night / Malam)',
    sublabel: '18:00 - 06:00',
    badge: 'SHIFT 2',
    icon: <Clock className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />,
  },
];

export default function BackdatePage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();

  // Helper date defaults
  const getTodayStr = () => new Date().toISOString().slice(0, 10);
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  };
  const getTwoDaysAgoStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return d.toISOString().slice(0, 10);
  };

  // Form State
  const [dateStr, setDateStr] = useState<string>(getYesterdayStr());
  const [jamStr, setJamStr] = useState<string>('12:00');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedTankId, setSelectedTankId] = useState<string>('');
  const [currentKm, setCurrentKm] = useState<string>('');
  const [currentHm, setCurrentHm] = useState<string>('');
  const [volumeLiters, setVolumeLiters] = useState<string>('');
  const [shift, setShift] = useState<string>('SHIFT 1');
  const [operator, setOperator] = useState<string>('');
  const [fuelInLiters, setFuelInLiters] = useState<string>('0');
  const [fuelmanName, setFuelmanName] = useState<string>('');

  // Unit Combobox State
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState<string | boolean>(false);
  const [unitSearch, setUnitSearch] = useState<string>('');
  const unitComboboxRef = useRef<HTMLDivElement>(null);

  // Table Search Filter
  const [tableSearch, setTableSearch] = useState<string>('');

  // Bypass State (Admin Only)
  const [bypassValidation, setBypassValidation] = useState<boolean>(false);
  const [bypassReason, setBypassReason] = useState<string>('');

  // Feedback State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto set fuelman name from logged-in user
  useEffect(() => {
    if (user && !fuelmanName) {
      setFuelmanName(user.fullName || user.username || '');
    }
  }, [user, fuelmanName]);

  // Click outside to close unit dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (unitComboboxRef.current && !unitComboboxRef.current.contains(e.target as Node)) {
        setIsUnitDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
  useEffect(() => {
    if (tanks.length > 0 && !selectedTankId) {
      setSelectedTankId(tanks[0].id);
    }
  }, [tanks, selectedTankId]);

  // Filtered Units for selection
  const filteredUnits = useMemo(() => {
    if (!unitSearch.trim()) return units;
    const term = unitSearch.toLowerCase();
    return units.filter(
      (u) =>
        u.unitCode.toLowerCase().includes(term) ||
        (u.makeModel && u.makeModel.toLowerCase().includes(term)) ||
        u.category.toLowerCase().includes(term)
    );
  }, [units, unitSearch]);

  const selectedUnit = units.find((u) => u.id === selectedUnitId) || null;
  const selectedTank = tanks.find((t) => t.id === selectedTankId) || null;

  // 3. Fetch Chronological Meter Context (preceding & subsequent logs)
  const {
    data: meterContext,
    isLoading: isLoadingContext,
  } = useQuery<MeterContextResponse>({
    queryKey: ['meter-context', selectedUnitId, dateStr, jamStr],
    queryFn: async () => {
      if (!selectedUnitId || !dateStr) return null;
      const res = await api.get(
        `/fuel/meter-context?unitId=${selectedUnitId}&dateStr=${dateStr}&jamStr=${jamStr}`
      );
      return res.data.data;
    },
    enabled: Boolean(selectedUnitId && dateStr),
  });

  // 4. Fetch Recent Logs for the selected date
  const { data: dateLogs = [], refetch: refetchDateLogs } = useQuery<FuelLog[]>({
    queryKey: ['date-fuel-logs', dateStr],
    queryFn: async () => {
      if (!dateStr) return [];
      const res = await api.get(`/fuel/logs?dateStr=${dateStr}&limit=100`);
      return res.data.data;
    },
    enabled: Boolean(dateStr),
  });

  // Filtered Date Logs for search filter
  const filteredDateLogs = useMemo(() => {
    if (!tableSearch.trim()) return dateLogs;
    const term = tableSearch.toLowerCase();
    return dateLogs.filter(
      (l) =>
        l.unitCode.toLowerCase().includes(term) ||
        l.operator.toLowerCase().includes(term) ||
        l.fuelmanName.toLowerCase().includes(term) ||
        l.shift.toLowerCase().includes(term) ||
        l.category.toLowerCase().includes(term)
    );
  }, [dateLogs, tableSearch]);

  // Summary Metrics on Date
  const dateTotalVolume = useMemo(() => {
    return dateLogs.reduce((acc, curr) => acc + (curr.volumeLiters || 0), 0);
  }, [dateLogs]);

  const dateTotalFuelIn = useMemo(() => {
    return dateLogs.reduce((acc, curr) => acc + (curr.fuelInLiters || 0), 0);
  }, [dateLogs]);

  // Calculations & Meter Rule Validations
  const prevKm = meterContext?.baselineKm ?? 0;
  const prevHm = meterContext?.baselineHm ?? 0;
  const nextKm = meterContext?.maxAllowedKm ?? null;
  const nextHm = meterContext?.maxAllowedHm ?? null;

  const parsedKm = parseFloat(currentKm);
  const parsedHm = parseFloat(currentHm);
  const isKmProvided = !isNaN(parsedKm) && currentKm.trim() !== '';
  const isHmProvided = !isNaN(parsedHm) && currentHm.trim() !== '';

  const isKmNegative = isKmProvided && parsedKm < 0;
  const isHmNegative = isHmProvided && parsedHm < 0;

  const deltaKm = isKmProvided ? parseFloat((parsedKm - prevKm).toFixed(2)) : 0;
  const deltaHm = isHmProvided ? parseFloat((parsedHm - prevHm).toFixed(2)) : 0;

  // KM Validation (Rule 1)
  const isKmDecreasing = isKmProvided && !isKmNegative && (prevKm > 0 ? parsedKm < prevKm : false);
  const isKmExceeded = isKmProvided && !isKmNegative && deltaKm > 1000;
  const isKmExceedsNext = isKmProvided && !isKmNegative && nextKm !== null && parsedKm > nextKm;
  const isKmValid = isKmProvided && !isKmNegative && !isKmDecreasing && !isKmExceeded && !isKmExceedsNext;

  // HM Validation (Rule 2: HM must strictly increase)
  const isHmDecreasing = isHmProvided && !isHmNegative && (prevHm > 0 ? parsedHm <= prevHm : false);
  const isHmExceeded = isHmProvided && !isHmNegative && deltaHm > 24;
  const isHmExceedsNext = isHmProvided && !isHmNegative && nextHm !== null && parsedHm >= nextHm;
  const isHmValid = isHmProvided && !isHmNegative && !isHmDecreasing && !isHmExceedsNext;

  // Overall form validity
  const isMeterValid = (isKmValid && isHmValid) || bypassValidation;

  // Validation Status State
  const hasInputs = isKmProvided || isHmProvided;
  const validationStatus = !hasInputs
    ? 'EMPTY'
    : isMeterValid
    ? 'VALID'
    : bypassValidation
    ? 'BYPASS'
    : 'INVALID';

  // Quick Volume Presets
  const handleQuickAddVolume = (added: number) => {
    const cur = parseFloat(volumeLiters) || 0;
    setVolumeLiters(String(cur + added));
  };

  // Mutation: Record Backdate Dispense
  const backdateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/fuel/backdate', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['fuelLogs'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyFuelLogs'] });
      queryClient.invalidateQueries({ queryKey: ['date-fuel-logs', dateStr] });
      queryClient.invalidateQueries({ queryKey: ['meter-context'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['tanks'] });
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });

      const successMsg = `Sukses menyimpan data terlewat: ${data.data?.fuelLog?.logNumber || 'Transaksi Disimpan'}. Data telah diverifikasi ke ledger.`;
      setSuccessMessage(successMsg);
      toast.success(successMsg);
      setErrorMessage(null);

      // Reset transaction volume & inputs
      setVolumeLiters('');
      setCurrentKm('');
      setCurrentHm('');
      setBypassValidation(false);
      setBypassReason('');

      setTimeout(() => setSuccessMessage(null), 8000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Gagal menyimpan transaksi backdate.';
      setErrorMessage(msg);
      toast.error(msg);
      setSuccessMessage(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!dateStr) {
      const msg = 'Pilih tanggal transaksi yang terlewat.';
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    if (!jamStr) {
      const msg = 'Masukkan jam/waktu transaksi.';
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    if (!selectedUnitId) {
      const msg = 'Pilih unit fleet / target equipment.';
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    if (!selectedTankId) {
      const msg = 'Pilih tangki penyimpanan sumber bahan bakar.';
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    if (!isKmProvided || parsedKm < 0) {
      const msg = 'Masukkan pembacaan Odometer (KM) yang valid.';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (!isHmProvided || parsedHm < 0) {
      const msg = 'Masukkan pembacaan Hour Meter (HM) yang valid.';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    const vol = parseFloat(volumeLiters);
    const fuelIn = parseFloat(fuelInLiters) || 0;
    if ((isNaN(vol) || vol <= 0) && fuelIn <= 0) {
      const msg = 'Masukkan volume BBM (Qty Out) dalam Liter.';
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    if (!operator.trim()) {
      const msg = 'Masukkan nama operator / driver unit.';
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    if (!isMeterValid && !bypassValidation) {
      const msg = 'Periksa pelanggaran Aturan HM / KM sebelum menyimpan.';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (bypassValidation && (!bypassReason.trim() || bypassReason.trim().length < 5)) {
      const msg = 'Alasan bypass validasi wajib diisi minimal 5 karakter untuk audit trail.';
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }

    backdateMutation.mutate({
      unitId: selectedUnitId,
      tankId: selectedTankId,
      currentKm: parsedKm,
      currentHm: parsedHm,
      volumeLiters: isNaN(vol) ? 0 : vol,
      fuelInLiters: fuelIn,
      shift,
      operator: operator.trim(),
      dateStr,
      jamStr,
      fuelmanName: fuelmanName.trim(),
      bypassValidation,
      bypassReason: bypassValidation ? bypassReason.trim() : undefined,
    });
  };

  // Helper for category badge colors
  const getCategoryColor = (cat: string) => {
    const c = cat.toUpperCase();
    if (c.includes('DUMP') || c.includes('TRUCK')) {
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    }
    if (c.includes('EXCA') || c.includes('DIG')) {
      return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
    }
    if (c.includes('DOZER') || c.includes('GRADER')) {
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    }
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  };

  // Tank Stock percentage calculation
  const tankCapacity = selectedTank?.capacityLiters || 1;
  const tankStock = selectedTank?.currentStockLiters || 0;
  const tankPercent = Math.min(100, Math.max(0, Math.round((tankStock / tankCapacity) * 100)));

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header Bar matching /history & /dispenser */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
            <CalendarPlus className="w-5 h-5 text-slate-700 dark:text-white/70" />
            <span>{t('backdate.title', 'Backdate Fuel Input')}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#888888] mt-0.5">
            {t('backdate.subtitle', 'Penginputan transaksi pengisian bahan bakar yang terlewat dengan validasi kronologis aturan HM & KM.')}
          </p>
        </div>

        {/* Date Presets Segmented Pill & Link to Monthly History */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] shadow-sm">
            <div className="flex items-center px-2 py-1 text-[11px] text-slate-400 dark:text-[#777] font-medium">
              <Calendar className="w-3.5 h-3.5 mr-1.5 opacity-70" />
              <span>{t('backdate.preset', 'Preset:')}</span>
            </div>
            <button
              type="button"
              onClick={() => setDateStr(getYesterdayStr())}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                dateStr === getYesterdayStr()
                  ? 'bg-slate-900 !text-white dark:bg-white dark:!text-black shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.08]'
              }`}
            >
              {t('backdate.yesterday', 'Kemarin')}
            </button>
            <button
              type="button"
              onClick={() => setDateStr(getTwoDaysAgoStr())}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                dateStr === getTwoDaysAgoStr()
                  ? 'bg-slate-900 !text-white dark:bg-white dark:!text-black shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.08]'
              }`}
            >
              {t('backdate.twoDaysAgo', '2 Hari Lalu')}
            </button>
            <button
              type="button"
              onClick={() => setDateStr(getTodayStr())}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                dateStr === getTodayStr()
                  ? 'bg-slate-900 !text-white dark:bg-white dark:!text-black shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.08]'
              }`}
            >
              {t('backdate.today', 'Hari Ini')}
            </button>
          </div>

          <Link
            href="/history"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl text-xs font-medium text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.08] transition-all shadow-sm"
          >
            <History className="w-3.5 h-3.5" />
            <span>{t('backdate.monthlyHistory', 'Monthly History')}</span>
          </Link>
        </div>
      </div>

      {/* Notifications Banner */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span className="font-semibold">{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-[11px] underline opacity-80 hover:opacity-100 ml-4 cursor-pointer"
            >
              {t('backdate.close', 'Tutup')}
            </button>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-[11px] underline opacity-80 hover:opacity-100 ml-4 cursor-pointer"
            >
              {t('backdate.close', 'Tutup')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main 2-Column Responsive Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Transaction Details (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Date, Time & Shift Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0D0D0D] border border-slate-200/90 dark:border-white/[0.08] shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-slate-700 dark:text-white/70" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {lang === 'id' ? '1. Waktu Transaksi yang Terlewat' : '1. Missed Transaction Time'}
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400 dark:text-[#777]">
                {lang === 'id' ? 'Tahap 1 dari 3' : 'Step 1 of 3'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Tanggal */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#999] mb-1.5">
                  {t('backdate.dateLabel', 'Tanggal Transaksi')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dateStr}
                    max={getTodayStr()}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/[0.12] text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 transition-all shadow-sm"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Maksimal s/d hari ini
                </p>
              </div>

              {/* Jam / Waktu */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#999] mb-1.5">
                  {t('backdate.timeLabel', 'Jam / Waktu (WITA)')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="time"
                    step="60"
                    value={jamStr}
                    onChange={(e) => setJamStr(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/[0.12] text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 transition-all shadow-sm"
                    required
                  />
                </div>
                <div className="flex items-center space-x-1 mt-1 text-[10px] text-slate-400">
                  <span>Quick:</span>
                  <button
                    type="button"
                    onClick={() => setJamStr('06:00')}
                    className="hover:text-slate-900 dark:hover:text-white underline"
                  >
                    06:00
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setJamStr('12:00')}
                    className="hover:text-slate-900 dark:hover:text-white underline"
                  >
                    12:00
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setJamStr('18:00')}
                    className="hover:text-slate-900 dark:hover:text-white underline"
                  >
                    18:00
                  </button>
                </div>
              </div>

              {/* Shift */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#999] mb-1.5 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                  <span>{t('backdate.shiftLabel', 'Shift Operasional')} <span className="text-rose-500">*</span></span>
                </label>
                <CustomSelect
                  options={BACKDATE_SHIFT_OPTIONS}
                  value={shift}
                  onChange={setShift}
                  placeholder={lang === 'id' ? 'Pilih Shift Operasional...' : 'Select Operational Shift...'}
                  icon={<Clock className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {lang === 'id' ? 'Siklus kerja 12 jam' : '12-hour work cycle'}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Target Equipment Unit & Storage Tank */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0D0D0D] border border-slate-200/90 dark:border-white/[0.08] shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-slate-700 dark:text-white/70" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {lang === 'id' ? '2. Unit Armada & Tangki Sumber' : '2. Fleet Unit & Source Tank'}
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400 dark:text-[#777]">
                {lang === 'id' ? 'Tahap 2 dari 3' : 'Step 2 of 3'}
              </span>
            </div>

            {/* Custom Searchable Fleet Unit Combobox */}
            <div className="relative" ref={unitComboboxRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-[#999]">
                  {t('backdate.selectUnitLabel', 'Pilih Unit Alat Berat')} <span className="text-rose-500">*</span>
                </label>
                {selectedUnit && (
                  <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-semibold">
                    Unit Terpilih: {selectedUnit.unitCode}
                  </span>
                )}
              </div>

              {/* Selector Trigger Button */}
              <button
                type="button"
                onClick={() => setIsUnitDropdownOpen((prev) => !prev)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl border text-left transition-all ${
                  selectedUnit
                    ? 'bg-slate-50 dark:bg-white/[0.03] border-cyan-500/40 ring-1 ring-cyan-500/20'
                    : 'bg-slate-50 dark:bg-black border-slate-200 dark:border-white/[0.12] hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                {selectedUnit ? (
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                          {selectedUnit.unitCode}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${getCategoryColor(
                            selectedUnit.category
                          )}`}
                        >
                          {selectedUnit.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-[#888] truncate mt-0.5">
                        {selectedUnit.makeModel || 'Heavy Equipment'} • Last KM: {formatNumber(selectedUnit.lastKm, 1)} • Last HM: {formatNumber(selectedUnit.lastHm, 1)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2.5 text-slate-400 text-xs">
                    <Search className="w-4 h-4" />
                    <span>Klik untuk mencari kode unit (e.g. DT-01, EXCA-02)...</span>
                  </div>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    isUnitDropdownOpen ? 'rotate-180 text-cyan-500' : ''
                  }`}
                />
              </button>

              {/* Popover Dropdown Panel */}
              <AnimatePresence>
                {isUnitDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-50 left-0 right-0 mt-2 p-3 rounded-2xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/[0.12] shadow-xl backdrop-blur-xl"
                  >
                    {/* Search Field */}
                    <div className="relative mb-2.5">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Ketik kode unit, kategori, atau tipe mesin..."
                        value={unitSearch}
                        onChange={(e) => setUnitSearch(e.target.value)}
                        className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                      />
                    </div>

                    {/* Unit Cards List */}
                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                      {filteredUnits.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          Tidak ada unit yang cocok dengan &quot;{unitSearch}&quot;
                        </div>
                      ) : (
                        filteredUnits.map((u) => {
                          const isCurrent = u.id === selectedUnitId;
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setSelectedUnitId(u.id);
                                setCurrentKm('');
                                setCurrentHm('');
                                setErrorMessage(null);
                                setIsUnitDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                                isCurrent
                                  ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300'
                                  : 'hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-transparent'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-slate-200/60 dark:bg-white/10 flex items-center justify-center font-mono font-bold text-[11px] text-slate-700 dark:text-white shrink-0">
                                  {u.unitCode.slice(0, 2)}
                                </div>
                                <div className="truncate">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                                      {u.unitCode}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border ${getCategoryColor(
                                        u.category
                                      )}`}
                                    >
                                      {u.category}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                    {u.makeModel || 'Heavy Equipment'}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0 ml-2">
                                <div className="text-[10px] font-mono text-slate-500">
                                  KM: {formatNumber(u.lastKm, 1)}
                                </div>
                                <div className="text-[10px] font-mono text-slate-500">
                                  HM: {formatNumber(u.lastHm, 1)}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Storage Tank Selection with Visual Progress Gauge */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#999] mb-1.5 flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5 text-cyan-500" />
                <span>Tangki Penyimpanan Sumber <span className="text-rose-500">*</span></span>
              </label>
              <CustomSelect
                options={tanks.map((t) => ({
                  value: t.id,
                  label: `${t.name} (${t.tankCode})`,
                  sublabel: `Sisa: ${formatNumber(t.currentStockLiters, 0)} L`,
                  badge: t.fuelType || 'Solar B35',
                  badgeColor: 'cyan',
                  icon: <Database className="w-3.5 h-3.5 text-cyan-500" />,
                }))}
                value={selectedTankId}
                onChange={setSelectedTankId}
                placeholder="Pilih Tangki Sumber..."
                icon={<Database className="w-3.5 h-3.5 text-cyan-500" />}
              />

              {selectedTank && (
                <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <Database className="w-3.5 h-3.5 text-cyan-500" />
                      <span className="font-semibold text-slate-700 dark:text-white/90">
                        {selectedTank.name}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {formatNumber(selectedTank.currentStockLiters, 0)}{' '}
                      <span className="text-slate-400 font-normal">
                        / {formatNumber(selectedTank.capacityLiters, 0)} L
                      </span>
                    </span>
                  </div>

                  {/* Interactive Fuel Level Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        tankPercent > 30
                          ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                          : tankPercent > 15
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${tankPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-[#888]">
                    <span>Kapasitas Tersisa: {formatNumber(Math.max(0, tankCapacity - tankStock), 0)} Liter</span>
                    <span className="font-mono font-semibold text-cyan-600 dark:text-cyan-400">
                      {tankPercent}% Penuh
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Fuel Volume, Operator & Officer */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0D0D0D] border border-slate-200/90 dark:border-white/[0.08] shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <Fuel className="w-4 h-4 text-slate-700 dark:text-white/70" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {lang === 'id' ? '3. Volume BBM & Petugas' : '3. Fuel Volume & Duty Officer'}
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400 dark:text-[#777]">
                {lang === 'id' ? 'Tahap 3 dari 3' : 'Step 3 of 3'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Qty Out (Liters) */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-[#999]">
                    {t('backdate.qtyLabel', 'Volume Keluar / Qty Out (Liter)')} <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {lang === 'id' ? 'Bahan Bakar Terisi ke Unit' : 'Fuel Dispensed to Unit'}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                    value={volumeLiters}
                    onChange={(e) => setVolumeLiters(e.target.value)}
                    className="w-full text-2xl font-mono font-black px-4 py-3 rounded-2xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/[0.12] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all shadow-sm"
                    required
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                    {t('common.liters', 'LITER')}
                  </span>
                </div>

                {/* Quick Add Volume Chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  <span className="text-[10px] text-slate-400 mr-1">Quick Add:</span>
                  {[50, 100, 200, 300, 500, 1000].map((liters) => (
                    <button
                      key={liters}
                      type="button"
                      onClick={() => handleQuickAddVolume(liters)}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-mono font-semibold bg-slate-100 hover:bg-emerald-500/15 text-slate-700 hover:text-emerald-700 dark:bg-white/[0.05] dark:hover:bg-emerald-500/20 dark:text-white/80 dark:hover:text-emerald-400 border border-slate-200 dark:border-white/[0.08] transition-all cursor-pointer"
                    >
                      +{liters}L
                    </button>
                  ))}
                  {volumeLiters && (
                    <button
                      type="button"
                      onClick={() => setVolumeLiters('')}
                      className="p-1 rounded-xl text-slate-400 hover:text-rose-500 transition-colors ml-auto"
                      title="Reset volume"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Fuel In (Optional) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#999] mb-1.5">
                  {t('backdate.fuelInLabel', 'Fuel In / Refill Tangki (Liter)')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={fuelInLiters}
                    onChange={(e) => setFuelInLiters(e.target.value)}
                    className="w-full text-xs font-mono font-semibold px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/[0.12] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
                  />
                  <span className="absolute right-3 top-3 text-[10px] font-semibold text-slate-400">
                    {t('common.liters', 'LITER')}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {lang === 'id' ? 'Isi jika ada pasokan masuk ke tangki' : 'Enter if supplier delivered fuel to tank'}
                </p>
              </div>

              {/* Shift Officer Info */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#999] mb-1.5">
                  {t('backdate.fuelmanLabel', 'Petugas Fuelman')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={lang === 'id' ? 'Petugas pengisi...' : 'Fuelman on duty...'}
                    value={fuelmanName}
                    onChange={(e) => setFuelmanName(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 pl-8 rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/[0.12] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
                  />
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 absolute left-2.5 top-3" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {lang === 'id' ? 'Tercatat sebagai petugas dispenser' : 'Recorded as fuel dispenser officer'}
                </p>
              </div>

              {/* Operator / Driver with Searchable Combobox */}
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-[#999]">
                  {t('backdate.operatorLabel', 'Nama Operator / Driver Unit')} <span className="text-rose-500">*</span>
                </label>
                <SearchableOperatorSelect
                  value={operator}
                  onChange={setOperator}
                  placeholder={t('dispenser.searchOperatorPlaceholder', 'Cari atau ketik nama operator...')}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Meter Validation & Telemetry (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Chronological Boundary Timeline Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0D0D0D] border border-slate-200/90 dark:border-white/[0.08] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-slate-700 dark:text-white/70" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Konteks Kronologis Unit
                </h2>
              </div>
              {isLoadingContext ? (
                <span className="text-[10px] font-mono text-purple-500 animate-pulse">
                  Sinkronisasi Log...
                </span>
              ) : selectedUnit ? (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  {selectedUnit.unitCode}
                </span>
              ) : null}
            </div>

            {!selectedUnit ? (
              <div className="py-8 px-4 rounded-2xl bg-slate-50 dark:bg-[#121212] border border-dashed border-slate-200 dark:border-white/[0.08] text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-200/60 dark:bg-white/[0.06] text-slate-400 flex items-center justify-center mx-auto">
                  <Truck className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-white/80">
                  Belum Ada Unit Dipilih
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Pilih unit fleet di formulir sebelah kiri untuk melihat pembacaan kronologis meter dan batasan validasi.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 3-Point Chronological Timeline */}
                <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-white/10">
                  {/* Point 1: Baseline Log */}
                  <div className="relative">
                    <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-emerald-500 bg-white dark:bg-black shrink-0" />
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.08] space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-[#888]">
                        <span className="flex items-center space-x-1">
                          <span>Log Sebelumnya (Baseline)</span>
                        </span>
                        {meterContext?.precedingLog ? (
                          <span className="font-mono text-emerald-600 dark:text-emerald-400">
                            {meterContext.precedingLog.dateStr} • {meterContext.precedingLog.jamStr}
                          </span>
                        ) : (
                          <span className="font-mono text-slate-400">Awal Pencatatan</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between font-mono font-bold text-xs text-slate-900 dark:text-white">
                        <span>KM: {formatNumber(prevKm, 1)}</span>
                        <span>HM: {formatNumber(prevHm, 1)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Point 2: Target Backfill (Now Being Edited) */}
                  <div className="relative">
                    <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-amber-500 bg-amber-500 shrink-0 animate-ping" />
                    <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-amber-500 bg-amber-500 shrink-0" />
                    <div className="p-3 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/30 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        <span>Target Backfill (Posisi Input)</span>
                        <span className="font-mono">
                          {dateStr} • {jamStr}
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-mono text-xs">
                        <span className="text-slate-900 dark:text-white font-bold">
                          KM: {isKmProvided ? formatNumber(parsedKm, 1) : '-'}
                        </span>
                        <span className="text-slate-900 dark:text-white font-bold">
                          HM: {isHmProvided ? formatNumber(parsedHm, 1) : '-'}
                        </span>
                      </div>
                      {hasInputs && (
                        <div className="flex items-center justify-between pt-1 border-t border-amber-500/20 text-[10px] font-mono">
                          <span className={deltaKm >= 0 && deltaKm <= 1000 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                            Δ KM: {deltaKm >= 0 ? `+${formatNumber(deltaKm, 1)}` : formatNumber(deltaKm, 1)}
                          </span>
                          <span className={deltaHm >= 0 && deltaHm <= 24 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                            Δ HM: {deltaHm >= 0 ? `+${formatNumber(deltaHm, 1)}` : formatNumber(deltaHm, 1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Point 3: Subsequent Log (Upper Cap) */}
                  <div className="relative">
                    <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-cyan-500 bg-white dark:bg-black shrink-0" />
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.08] space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-[#888]">
                        <span>Log Sesudahnya (Batas Maksimum)</span>
                        {meterContext?.subsequentLog ? (
                          <span className="font-mono text-cyan-600 dark:text-cyan-400">
                            {meterContext.subsequentLog.dateStr} • {meterContext.subsequentLog.jamStr}
                          </span>
                        ) : (
                          <span className="font-mono text-slate-400">Tidak ada batas atas</span>
                        )}
                      </div>
                      {meterContext?.subsequentLog ? (
                        <div className="flex items-center justify-between font-mono font-bold text-xs text-slate-900 dark:text-white">
                          <span>Maks KM: {formatNumber(meterContext.subsequentLog.currentKm, 1)}</span>
                          <span>Maks HM: {formatNumber(meterContext.subsequentLog.currentHm, 1)}</span>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">
                          Transaksi ini akan menjadi catatan terkini unit jika disimpan.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Live HM & KM Cards */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0D0D0D] border border-slate-200/90 dark:border-white/[0.08] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-slate-700 dark:text-white/70" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Validasi Aturan HM & KM
                </h2>
              </div>

              {/* Status Badge */}
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border transition-all ${
                  validationStatus === 'EMPTY'
                    ? 'bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-[#888] border-slate-200 dark:border-white/10'
                    : validationStatus === 'VALID'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : validationStatus === 'BYPASS'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse'
                }`}
              >
                {validationStatus === 'EMPTY' && 'MENUNGGU INPUT'}
                {validationStatus === 'VALID' && 'STATUS VALID'}
                {validationStatus === 'BYPASS' && 'BYPASS AKTIF'}
                {validationStatus === 'INVALID' && 'ATURAN TERLANGGAR'}
              </span>
            </div>

            {/* Odometer (KM) Input & Live Validation Card */}
            <div
              className={`p-4 rounded-2xl border transition-all duration-300 ${
                !isKmProvided
                  ? 'bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-white/[0.08]'
                  : isKmValid
                  ? 'bg-emerald-50/70 dark:bg-[#0D140E] border-emerald-300 dark:border-emerald-500/30'
                  : bypassValidation
                  ? 'bg-amber-50/70 dark:bg-[#17130A] border-amber-300 dark:border-amber-500/30'
                  : 'bg-rose-50/70 dark:bg-[#180A0A] border-rose-300 dark:border-rose-500/40 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-white/80">
                  Odometer (KM) <span className="text-rose-500">*</span>
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Prev:{' '}
                  <strong className="text-slate-900 dark:text-white font-bold">
                    {formatNumber(prevKm, 1)}
                  </strong>
                  {nextKm !== null && (
                    <span className="text-slate-400 ml-1">
                      (Maks: {formatNumber(nextKm, 1)})
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder={String(prevKm)}
                  value={currentKm}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'Minus') e.preventDefault();
                  }}
                  onChange={(e) => setCurrentKm(e.target.value.replace(/-/g, ''))}
                  className="w-full text-xl font-mono font-bold px-3 py-2 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/[0.12] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 shadow-sm"
                  required
                />
                {isKmProvided && (
                  <span
                    className={`px-3 py-2 rounded-xl text-xs font-mono font-bold shrink-0 ${
                      isKmNegative
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                        : isKmValid
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                        : bypassValidation
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                    }`}
                  >
                    {deltaKm >= 0 ? `+${formatNumber(deltaKm, 1)}` : formatNumber(deltaKm, 1)} KM
                  </span>
                )}
              </div>

              {/* KM Checklist Rules */}
              {isKmProvided && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-white/[0.06] text-[11px] space-y-1">
                  {isKmNegative && (
                    <div className="text-rose-600 dark:text-rose-400 flex items-center space-x-1.5 font-medium">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Aturan Validasi: Nilai Odometer (KM) tidak boleh negatif (&lt; 0).</span>
                    </div>
                  )}
                  {isKmDecreasing && !isKmNegative && (
                    <div className="text-rose-600 dark:text-rose-400 flex items-center space-x-1.5 font-medium">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Aturan 1: KM tidak boleh kurang dari log sebelumnya ({formatNumber(prevKm, 1)} KM).</span>
                    </div>
                  )}
                  {isKmExceeded && (
                    <div className="text-rose-600 dark:text-rose-400 flex items-center space-x-1.5 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Aturan 1: Jarak tempuh {formatNumber(deltaKm, 1)} KM melebihi batas 1.000 KM per shift.</span>
                    </div>
                  )}
                  {isKmExceedsNext && (
                    <div className="text-rose-600 dark:text-rose-400 flex items-center space-x-1.5 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Aturan 1: KM melebihi catatan log sesudahnya (Maks: {formatNumber(nextKm!, 1)} KM).</span>
                    </div>
                  )}
                  {isKmValid && (
                    <div className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Aturan 1 Terpenuhi: Delta KM Valid (+{formatNumber(deltaKm, 1)} KM).</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hour Meter (HM) Input & Live Validation Card */}
            <div
              className={`p-4 rounded-2xl border transition-all duration-300 ${
                !isHmProvided
                  ? 'bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-white/[0.08]'
                  : isHmValid
                  ? 'bg-emerald-50/70 dark:bg-[#0D140E] border-emerald-300 dark:border-emerald-500/30'
                  : bypassValidation
                  ? 'bg-amber-50/70 dark:bg-[#17130A] border-amber-300 dark:border-amber-500/30'
                  : 'bg-rose-50/70 dark:bg-[#180A0A] border-rose-300 dark:border-rose-500/40 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-white/80">
                  Hour Meter (HM) <span className="text-rose-500">*</span>
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Prev:{' '}
                  <strong className="text-slate-900 dark:text-white font-bold">
                    {formatNumber(prevHm, 1)}
                  </strong>
                  {nextHm !== null && (
                    <span className="text-slate-400 ml-1">
                      (Maks: {formatNumber(nextHm, 1)})
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder={String(prevHm)}
                  value={currentHm}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'Minus') e.preventDefault();
                  }}
                  onChange={(e) => setCurrentHm(e.target.value.replace(/-/g, ''))}
                  className="w-full text-xl font-mono font-bold px-3 py-2 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/[0.12] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 shadow-sm"
                  required
                />
                {isHmProvided && (
                  <span
                    className={`px-3 py-2 rounded-xl text-xs font-mono font-bold shrink-0 ${
                      isHmNegative
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                        : isHmValid
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                        : bypassValidation
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                    }`}
                  >
                    {deltaHm >= 0 ? `+${formatNumber(deltaHm, 1)}` : formatNumber(deltaHm, 1)} HRS
                  </span>
                )}
              </div>

              {/* HM Checklist Rules */}
              {isHmProvided && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-white/[0.06] text-[11px] space-y-1">
                  {isHmNegative && (
                    <div className="text-rose-600 dark:text-rose-400 flex items-center space-x-1.5 font-medium">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Aturan Validasi: Nilai Hour Meter (HM) tidak boleh negatif (&lt; 0).</span>
                    </div>
                  )}
                  {isHmDecreasing && !isHmNegative && (
                    <div className="text-rose-600 dark:text-rose-400 flex items-center space-x-1.5 font-medium">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {parsedHm === prevHm
                          ? `Aturan 2: HM (${formatNumber(parsedHm, 1)}) tidak boleh sama dengan log sebelumnya (${formatNumber(prevHm, 1)} Jam).`
                          : `Aturan 2: HM (${formatNumber(parsedHm, 1)}) tidak boleh kurang dari log sebelumnya (${formatNumber(prevHm, 1)} Jam).`}
                      </span>
                    </div>
                  )}
                  {isHmExceeded && !isHmDecreasing && (
                    <div className="text-amber-600 dark:text-amber-400 flex items-center space-x-1.5 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Info: Durasi delta {formatNumber(deltaHm, 1)} Jam melewati 24 Jam (berselang hari).</span>
                    </div>
                  )}
                  {isHmExceedsNext && (
                    <div className="text-rose-600 dark:text-rose-400 flex items-center space-x-1.5 font-medium">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {parsedHm === nextHm
                          ? `Aturan 2: HM (${formatNumber(parsedHm, 1)}) tidak boleh sama dengan catatan log sesudahnya (${formatNumber(nextHm!, 1)} Jam).`
                          : `Aturan 2: HM (${formatNumber(parsedHm, 1)}) melebihi catatan log sesudahnya (Maks: ${formatNumber(nextHm!, 1)} Jam).`}
                      </span>
                    </div>
                  )}
                  {isHmValid && !isHmExceeded && (
                    <div className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Aturan 2 Terpenuhi: Delta HM Valid (+{formatNumber(deltaHm, 1)} Jam).</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Validation Bypass (Admin & Management) */}
            {(user?.role === 'ADMIN' || user?.role === 'MANAGEMENT') && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-white/[0.08] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Validation Bypass
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Abaikan aturan HM/KM untuk perbaikan meteran
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bypassValidation}
                      onChange={(e) => setBypassValidation(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <AnimatePresence>
                  {bypassValidation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5 pt-2.5 border-t border-slate-200 dark:border-white/[0.06]"
                    >
                      <label className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center justify-between">
                        <span>Alasan Bypass (Tercatat di Audit Trail):</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {bypassReason.length}/5 Karakter
                        </span>
                      </label>
                      <input
                        type="text"
                        value={bypassReason}
                        onChange={(e) => setBypassReason(e.target.value)}
                        placeholder="Contoh: Penggantian odometer cluster baru, data fisik terverifikasi..."
                        className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/[0.12] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                        required={bypassValidation}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Glowing High-Contrast Submit Button */}
            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={
                  backdateMutation.isPending ||
                  !selectedUnitId ||
                  !isMeterValid
                }
                className={`w-full py-4 px-5 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2.5 transition-all shadow-md active:scale-[0.98] ${
                  !selectedUnitId || !isMeterValid
                    ? 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-[#666] border border-slate-300 dark:border-white/10 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/25 hover:shadow-amber-500/35 cursor-pointer'
                }`}
              >
                <Send className={`w-4 h-4 ${backdateMutation.isPending ? 'animate-spin' : ''}`} />
                <span>
                  {backdateMutation.isPending
                    ? t('backdate.saving', 'Menyimpan & Menyinkronkan...')
                    : t('backdate.submit', 'Submit')}
                </span>
              </button>

              {(!selectedUnitId || !isMeterValid) && (
                <p className="text-[11px] text-center text-slate-400 dark:text-[#777]">
                  {!selectedUnitId
                    ? (lang === 'id' ? 'Pilih unit fleet terlebih dahulu' : 'Please select a fleet unit first')
                    : !hasInputs
                    ? (lang === 'id' ? 'Masukkan pembacaan KM & HM unit' : 'Enter KM & HM readings')
                    : (lang === 'id' ? 'Periksa kesesuaian aturan validasi meter' : 'Check meter validation rules')}
                </p>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Recent Logs on Selected Date Table */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0D0D0D] border border-slate-200/90 dark:border-white/[0.08] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-slate-600 dark:text-[#888]" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {lang === 'id' ? `Transaksi Terdaftar pada Tanggal ${dateStr}` : `Registered Records on ${dateStr}`}
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#888] font-bold border border-slate-200 dark:border-white/10">
              {dateLogs.length} {lang === 'id' ? 'Data' : 'Logs'}
            </span>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
              Total Out: {formatNumber(dateTotalVolume, 1)} L
            </span>
            {dateTotalFuelIn > 0 && (
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold border border-cyan-500/20">
                Total In: {formatNumber(dateTotalFuelIn, 1)} L
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Table Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari unit / operator..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="text-xs pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 w-44 sm:w-56"
              />
            </div>

            <button
              type="button"
              onClick={() => refetchDateLogs()}
              className="px-3 py-1.5 rounded-xl text-xs text-slate-600 hover:text-slate-900 dark:text-[#999] dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] transition-all flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {filteredDateLogs.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-50 dark:bg-[#121212] border border-dashed border-slate-200 dark:border-white/[0.08] text-center text-xs text-slate-400">
            {tableSearch
              ? `Tidak ditemukan transaksi dengan kata kunci "${tableSearch}" pada tanggal ${dateStr}.`
              : `Belum ada transaksi bahan bakar yang tercatat pada tanggal ${dateStr}.`}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/[0.06]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/[0.06] bg-slate-50/70 dark:bg-[#121212] text-slate-400 text-[11px]">
                  <th className="py-3 px-3.5 font-semibold">No</th>
                  <th className="py-3 px-3.5 font-semibold">Jam</th>
                  <th className="py-3 px-3.5 font-semibold">Unit Fleet</th>
                  <th className="py-3 px-3.5 font-semibold">Operator</th>
                  <th className="py-3 px-3.5 font-semibold">Shift</th>
                  <th className="py-3 px-3.5 font-semibold">HM</th>
                  <th className="py-3 px-3.5 font-semibold">KM</th>
                  <th className="py-3 px-3.5 font-semibold">Qty Out</th>
                  <th className="py-3 px-3.5 font-semibold">Fuelman</th>
                  <th className="py-3 px-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {filteredDateLogs.map((log) => {
                  const isCurrentTarget = log.unitId === selectedUnitId;
                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors ${
                        isCurrentTarget ? 'bg-amber-500/5 dark:bg-amber-500/5' : ''
                      }`}
                    >
                      <td className="py-3 px-3.5 font-mono text-slate-500">#{log.no}</td>
                      <td className="py-3 px-3.5 font-mono font-medium text-slate-800 dark:text-white">
                        {log.jamStr}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-semibold text-slate-900 dark:text-white font-mono">
                            {log.unitCode}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border ${getCategoryColor(
                              log.category
                            )}`}
                          >
                            {log.category}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-slate-700 dark:text-white/80 font-medium">
                        {log.operator}
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 dark:text-[#888] font-mono text-[11px]">
                        {log.shift}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-900 dark:text-white">
                        {formatNumber(log.currentHm, 1)}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-900 dark:text-white">
                        {formatNumber(log.currentKm, 1)}
                      </td>
                      <td className="py-3 px-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatNumber(log.volumeLiters, 1)} L
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 dark:text-[#888]">
                        {log.fuelmanName}
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold ${
                            log.syncStatus === 'SYNCED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {log.syncStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
