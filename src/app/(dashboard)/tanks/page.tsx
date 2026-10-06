'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StorageTank } from '@/types';
import { Database, Plus, X, Edit3, Trash2, AlertTriangle, CheckCircle2, ArrowRightLeft, Truck } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import ModalPortal from '@/components/shared/ModalPortal';
import StockTransferModal from '@/components/dispenser/StockTransferModal';
import { toast } from 'react-toastify';

export default function TanksPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGEMENT';
  const queryClient = useQueryClient();

  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSourceTankId, setTransferSourceTankId] = useState<string>('');

  // Refill Modal State
  const [selectedTank, setSelectedTank] = useState<StorageTank | null>(null);
  const [refillLiters, setRefillLiters] = useState('');
  const [notes, setNotes] = useState('');
  const [showRefillModal, setShowRefillModal] = useState(false);

  // Tank CRUD Modals State
  const [showTankModal, setShowTankModal] = useState(false);
  const [editingTank, setEditingTank] = useState<StorageTank | null>(null);
  const [deletingTank, setDeletingTank] = useState<StorageTank | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tank Form State
  const [tankCode, setTankCode] = useState('');
  const [tankName, setTankName] = useState('');
  const [fuelType, setFuelType] = useState('HIGH SPEED DIESEL / SOLAR B35');
  const [capacityLiters, setCapacityLiters] = useState('50000');
  const [currentStockLiters, setCurrentStockLiters] = useState('45000');
  const [minStockAlertLiters, setMinStockAlertLiters] = useState('5000');

  const { data: tanks = [], isLoading } = useQuery<StorageTank[]>({
    queryKey: ['tanks'],
    queryFn: async () => {
      const res = await api.get('/tanks');
      return res.data.data;
    },
    refetchInterval: 5000,
  });

  // Refill Mutation
  const refillMutation = useMutation({
    mutationFn: async ({ tankId, liters, notes }: { tankId: string; liters: number; notes: string }) => {
      return await api.post(`/tanks/${tankId}/refill`, { refilledLiters: liters, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tanks'] });
      toast.success(lang === 'id' ? 'Pengisian tangki berhasil dicatat!' : 'Tank refill recorded successfully!');
      setShowRefillModal(false);
      setRefillLiters('');
      setNotes('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || (lang === 'id' ? 'Gagal mencatat pengisian tangki.' : 'Failed to record tank refill.');
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  // Save Tank (Create / Update) Mutation
  const saveTankMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        tankCode,
        name: tankName,
        fuelType,
        capacityLiters: parseFloat(capacityLiters) || 0,
        currentStockLiters: parseFloat(currentStockLiters) || 0,
        minStockAlertLiters: parseFloat(minStockAlertLiters) || 0,
      };

      if (editingTank) {
        return await api.put(`/tanks/${editingTank.id}`, payload);
      } else {
        return await api.post('/tanks', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tanks'] });
      toast.success(
        editingTank
          ? (lang === 'id' ? 'Data tangki berhasil diperbarui!' : 'Storage tank updated successfully!')
          : (lang === 'id' ? 'Tangki baru berhasil ditambahkan!' : 'New storage tank created successfully!')
      );
      setShowTankModal(false);
      resetTankForm();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || (lang === 'id' ? 'Gagal menyimpan tangki.' : 'Failed to save storage tank.');
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  // Delete Tank Mutation
  const deleteTankMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/tanks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tanks'] });
      toast.success(lang === 'id' ? 'Tangki berhasil dihapus!' : 'Storage tank deleted successfully!');
      setDeletingTank(null);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || (lang === 'id' ? 'Gagal menghapus tangki.' : 'Failed to delete storage tank.');
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  const resetTankForm = () => {
    setEditingTank(null);
    setTankCode('');
    setTankName('');
    setFuelType('HIGH SPEED DIESEL / SOLAR B35');
    setCapacityLiters('50000');
    setCurrentStockLiters('45000');
    setMinStockAlertLiters('5000');
    setErrorMessage(null);
  };

  const handleOpenCreateTank = () => {
    resetTankForm();
    setShowTankModal(true);
  };

  const handleOpenEditTank = (tank: StorageTank) => {
    setEditingTank(tank);
    setTankCode(tank.tankCode);
    setTankName(tank.name);
    setFuelType(tank.fuelType);
    setCapacityLiters(String(tank.capacityLiters));
    setCurrentStockLiters(String(tank.currentStockLiters));
    setMinStockAlertLiters(String(tank.minStockAlertLiters));
    setErrorMessage(null);
    setShowTankModal(true);
  };

  const handleOpenRefill = (tank: StorageTank) => {
    setSelectedTank(tank);
    setShowRefillModal(true);
  };

  const handleSubmitRefill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTank) return;
    const liters = parseFloat(refillLiters);
    if (isNaN(liters) || liters <= 0) {
      const msg = lang === 'id' ? 'Volume pengisian harus lebih dari 0 Liter.' : 'Refill volume must be greater than 0 Liters.';
      toast.warning(msg);
      return;
    }
    refillMutation.mutate({
      tankId: selectedTank.id,
      liters,
      notes,
    });
  };

  const handleSubmitTank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tankCode.trim() || !tankName.trim()) {
      const msg = lang === 'id' ? 'Kode tangki dan nama tangki wajib diisi.' : 'Tank code and tank name are required.';
      toast.warning(msg);
      return;
    }
    const cap = parseFloat(capacityLiters);
    if (isNaN(cap) || cap <= 0) {
      const msg = lang === 'id' ? 'Kapasitas tangki harus lebih dari 0 Liter.' : 'Tank capacity must be greater than 0 Liters.';
      toast.warning(msg);
      return;
    }
    saveTankMutation.mutate();
  };

  const totalStock = tanks.reduce((acc, t) => acc + t.currentStockLiters, 0);
  const totalCapacity = tanks.reduce((acc, t) => acc + t.capacityLiters, 0);
  const totalPercentage = totalCapacity > 0 ? Math.round((totalStock / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
            <Database className="w-5 h-5 text-slate-700 dark:text-white/70" />
            <span>{t('tanks.title')}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#888888] mt-0.5">
            {t('tanks.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setTransferSourceTankId('');
              setShowTransferModal(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 dark:text-blue-300 font-semibold text-xs border border-blue-200 dark:border-blue-800 transition-all shadow-sm"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer Stock</span>
          </button>

          {canManage && (
            <button
              onClick={handleOpenCreateTank}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black font-semibold text-xs hover:bg-slate-800 dark:hover:bg-[#EAEAEA] active:scale-95 transition-all shadow-md text-white-forced"
            >
              <Plus className="w-4 h-4 text-white dark:text-black" />
              <span className="text-white dark:text-black font-semibold">{t('tanks.addTank')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Multi-Storage Total Stock Summary Banner */}
      <div className="p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#888]">
                Total Stok Seluruh Storage (Stationary & Mobile Fuel Truck)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {totalPercentage}% Kapasitas Terisi
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <h3 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                {formatNumber(totalStock, 0)}
              </h3>
              <span className="text-sm font-semibold text-slate-500 dark:text-[#888]">
                / {formatNumber(totalCapacity, 0)} Liter
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <span className="text-xs text-slate-500 dark:text-[#888] block">Total Tangki Terdaftar</span>
              <strong className="text-sm font-mono text-slate-900 dark:text-white">{tanks.length} Tangki</strong>
            </div>
          </div>
        </div>

        {/* Total Progress Track */}
        <div className="mt-4 w-full h-3 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 transition-all duration-700"
            style={{ width: `${Math.min(totalPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Tanks Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-600 dark:text-slate-400">
          <div className="w-6 h-6 border-2 border-slate-300 dark:border-white/20 border-t-slate-900 dark:border-t-white rounded-full animate-spin mb-2" />
          <p className="text-xs font-mono">{lang === 'id' ? 'Memuat data tangki...' : 'Loading storage tanks...'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tanks.map((tank) => {
          const percentage = Math.round((tank.currentStockLiters / tank.capacityLiters) * 100);
          const isLow = tank.currentStockLiters <= tank.minStockAlertLiters;

          return (
            <div
              key={tank.id}
              className="framer-card p-6 rounded-3xl border border-slate-200 dark:border-white/[0.08] relative overflow-hidden space-y-4 bg-white/70 dark:bg-[#121212] backdrop-blur-md shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-[#888888] border border-slate-200 dark:border-white/[0.08]">
                      {tank.tankCode}
                    </span>
                    {tank.tankType === 'MOBILE_TRUCK' || tank.tankCode.includes('FT') ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        Mobile Fuel Truck
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        Stationary Tank (Senyiur)
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border transition-colors ${
                        isLow || percentage <= 15
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          : percentage <= 30
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {percentage}% {t('tanks.full')}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight mt-2 flex items-center space-x-2">
                    <Database className="w-4 h-4 text-cyan-500 shrink-0" />
                    <span>{tank.name}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#777777] font-mono">{tank.fuelType}</p>
                </div>

                {canManage && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEditTank(tank)}
                      title={t('tanks.editTank')}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-white/[0.06] transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setDeletingTank(tank);
                        setErrorMessage(null);
                      }}
                      title={t('tanks.deleteTank')}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Progress Track */}
              <div className="space-y-2">
                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      isLow || percentage <= 15
                        ? 'bg-rose-500'
                        : percentage <= 30
                        ? 'bg-amber-500'
                        : 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-500 dark:text-[#777777]">
                  <span>0 L</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatNumber(tank.currentStockLiters, 0)} L ({percentage}%)
                  </span>
                  <span>{formatNumber(tank.capacityLiters, 0)} L</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-200 dark:border-white/[0.06] text-xs font-mono">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200/70 dark:border-white/[0.06]">
                  <span className="text-[10px] text-slate-500 dark:text-[#777] block mb-1">{t('tanks.availableFuel')}</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatNumber(tank.currentStockLiters, 1)} L
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#141414] border border-slate-200/70 dark:border-white/[0.06]">
                  <span className="text-[10px] text-slate-500 dark:text-[#777] block mb-1">{t('tanks.availableUllage')}</span>
                  <span className="text-sm font-bold text-slate-500 dark:text-[#999]">
                    {formatNumber(tank.capacityLiters - tank.currentStockLiters, 1)} L
                  </span>
                </div>
              </div>

              {/* Refill & Transfer Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {canManage && (
                  <button
                    onClick={() => handleOpenRefill(tank)}
                    className="w-full py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-slate-800 dark:text-white font-medium text-xs font-mono border border-slate-200 dark:border-white/[0.1] transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Refill</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setTransferSourceTankId(tank.id);
                    setShowTransferModal(true);
                  }}
                  className={`w-full py-2.5 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium text-xs font-mono border border-blue-200 dark:border-blue-800 transition-all flex items-center justify-center space-x-1.5 ${!canManage ? 'col-span-2' : ''}`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Transfer</span>
                </button>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* CREATE / EDIT TANK MODAL */}
      {showTankModal && (
        <ModalPortal>
          <div className="fixed inset-0 w-screen h-screen z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#FAFBFD] dark:bg-[#121212] border border-slate-200 dark:border-white/[0.12] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-slate-900 dark:text-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.06]">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Database className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <span>{editingTank ? `${t('tanks.editModalTitle')}: ${editingTank.tankCode}` : t('tanks.createModalTitle')}</span>
                </h3>
                <button
                  onClick={() => {
                    setShowTankModal(false);
                    resetTankForm();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-900 dark:text-[#666] dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmitTank} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-500 dark:text-[#888888] font-medium block mb-1">{t('tanks.tankCode')}</label>
                    <input
                      type="text"
                      required
                      value={tankCode}
                      onChange={(e) => setTankCode(e.target.value)}
                      placeholder="e.g. TANK-02"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-500 dark:text-[#888888] font-medium block mb-1">{t('tanks.tankName')}</label>
                    <input
                      type="text"
                      required
                      value={tankName}
                      onChange={(e) => setTankName(e.target.value)}
                      placeholder="e.g. Pit Area Bowsers"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 dark:text-[#888888] font-medium block mb-1">{t('tanks.fuelType')}</label>
                  <input
                    type="text"
                    required
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    placeholder="e.g. HIGH SPEED DIESEL / SOLAR B35"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-500 dark:text-[#888888] font-medium block mb-1">{t('tanks.capacityL')}</label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={capacityLiters}
                      onChange={(e) => setCapacityLiters(e.target.value)}
                      className="w-full px-3 py-2 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono font-bold focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-500 dark:text-[#888888] font-medium block mb-1">{t('tanks.currentStockL')}</label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={currentStockLiters}
                      onChange={(e) => setCurrentStockLiters(e.target.value)}
                      className="w-full px-3 py-2 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-500 dark:text-[#888888] font-medium block mb-1">{t('tanks.alertLevelL')}</label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={minStockAlertLiters}
                      onChange={(e) => setMinStockAlertLiters(e.target.value)}
                      className="w-full px-3 py-2 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono font-bold text-amber-600 dark:text-amber-400 focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200 dark:border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTankModal(false);
                      resetTankForm();
                    }}
                    className="px-4 py-2 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#888888] hover:text-slate-900 dark:hover:text-white text-xs font-medium transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={saveTankMutation.isPending}
                    className="px-5 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black font-semibold text-xs hover:bg-slate-800 dark:hover:bg-[#EAEAEA] active:scale-95 transition-all shadow-md"
                  >
                    {saveTankMutation.isPending
                      ? t('common.saving')
                      : editingTank
                      ? (lang === 'id' ? 'Simpan Perubahan' : 'Save Changes')
                      : (lang === 'id' ? 'Daftarkan Tangki' : 'Register Tank')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* DELETE TANK CONFIRMATION MODAL */}
      {deletingTank && (
        <ModalPortal>
          <div className="fixed inset-0 w-screen h-screen z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#FAFBFD] dark:bg-[#121212] border border-rose-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-900 dark:text-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('tanks.deleteTank')}</h3>
                  <p className="text-xs text-slate-500 dark:text-[#888888]">
                    {deletingTank.tankCode} • {deletingTank.name}
                  </p>
                </div>
              </div>

              {errorMessage ? (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              ) : (
                <p className="text-xs text-slate-600 dark:text-[#999999] leading-relaxed">
                  {t('tanks.deleteConfirm')}
                </p>
              )}

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    setDeletingTank(null);
                    setErrorMessage(null);
                  }}
                  className="px-4 py-2 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#888888] hover:text-slate-900 dark:hover:text-white text-xs font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => deleteTankMutation.mutate(deletingTank.id)}
                  disabled={deleteTankMutation.isPending}
                  className="px-5 py-2 rounded-full bg-rose-600 text-white font-semibold text-xs hover:bg-rose-500 active:scale-95 transition-all"
                >
                  {deleteTankMutation.isPending ? (lang === 'id' ? 'Menghapus...' : 'Deleting...') : t('tanks.confirmDelete')}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* REFILL MODAL */}
      {showRefillModal && selectedTank && (
        <ModalPortal>
          <div className="fixed inset-0 w-screen h-screen z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#FAFBFD] dark:bg-[#121212] border border-slate-200 dark:border-white/[0.12] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-900 dark:text-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.06]">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t('tanks.refillModalTitle')}: {selectedTank.name}
                </h3>
                <button
                  onClick={() => setShowRefillModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-900 dark:text-[#666] dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitRefill} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-500 dark:text-[#888888] font-medium block mb-1">
                    {t('tanks.refillVolume')}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={refillLiters}
                    onChange={(e) => setRefillLiters(e.target.value)}
                    placeholder="e.g. 10000"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-emerald-600 dark:text-emerald-400 font-mono text-base font-bold focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-500 dark:text-[#888888] font-medium block mb-1">
                    {t('tanks.refillNotes')}
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Pertamina Solar B35 Delivery DO #91823"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200 dark:border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setShowRefillModal(false)}
                    className="px-4 py-2 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#888888] hover:text-slate-900 dark:hover:text-white text-xs font-medium transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={refillMutation.isPending}
                    className="px-5 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black font-semibold text-xs hover:bg-slate-800 dark:hover:bg-[#EAEAEA] active:scale-95 transition-all"
                  >
                    {refillMutation.isPending ? t('tanks.processing') : t('tanks.confirmInbound')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* STOCK TRANSFER MODAL */}
      <StockTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        defaultSourceTankId={transferSourceTankId}
      />
    </div>
  );
}
