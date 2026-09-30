'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Unit, UnitCategory } from '@/types';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Edit3,
  Trash2,
  X,
  AlertTriangle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import ModalPortal from '@/components/shared/ModalPortal';
import ExcelImportModal from '@/components/shared/ExcelImportModal';
import { toast } from 'react-toastify';

export default function UnitsPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGEMENT';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Form State
  const [unitCode, setUnitCode] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [category, setCategory] = useState<string>('PRODUKSI');
  const [type, setType] = useState<string>('DUMP_TRUCK');
  const [lastKm, setLastKm] = useState('0');
  const [lastHm, setLastHm] = useState('0');
  const [isActive, setIsActive] = useState(true);

  const { data: units = [], isLoading } = useQuery<Unit[]>({
    queryKey: ['units', search],
    queryFn: async () => {
      const res = await api.get(`/units?search=${search}`);
      return res.data.data;
    },
  });

  const totalPages = Math.ceil(units.length / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);

  const paginatedUnits = useMemo(() => {
    const start = (activePage - 1) * itemsPerPage;
    return units.slice(start, start + itemsPerPage);
  }, [units, activePage, itemsPerPage]);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingUnit) {
        return await api.put(`/units/${editingUnit.id}`, payload);
      }
      return await api.post('/units', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success(
        editingUnit
          ? (lang === 'id' ? `Unit ${editingUnit.unitCode} berhasil diperbarui!` : `Unit ${editingUnit.unitCode} updated successfully!`)
          : (lang === 'id' ? 'Unit armada baru berhasil didaftarkan!' : 'New fleet unit registered successfully!')
      );
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || (lang === 'id' ? 'Gagal menyimpan unit armada.' : 'Failed to save unit.');
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/units/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success(lang === 'id' ? 'Unit armada berhasil dihapus!' : 'Fleet unit deleted successfully!');
      setDeletingUnit(null);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || (lang === 'id' ? 'Gagal menghapus unit armada.' : 'Failed to delete unit.');
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, nextActive }: { id: string; nextActive: boolean }) => {
      return await api.put(`/units/${id}`, { isActive: nextActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success(lang === 'id' ? 'Status operasional unit berhasil diubah.' : 'Unit active status updated.');
      setDeletingUnit(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || (lang === 'id' ? 'Gagal mengubah status unit.' : 'Failed to update unit status.'));
    },
  });

  const resetForm = () => {
    setEditingUnit(null);
    setUnitCode('');
    setPlateNumber('');
    setCategory('PRODUKSI');
    setType('DUMP_TRUCK');
    setLastKm('0');
    setLastHm('0');
    setIsActive(true);
    setErrorMessage(null);
  };

  const handleEdit = (u: Unit) => {
    setEditingUnit(u);
    setUnitCode(u.unitCode);
    setPlateNumber(u.plateNumber || '');
    setCategory(u.category || 'PRODUKSI');
    setType((u as any).type || 'DUMP_TRUCK');
    setLastKm(String(u.lastKm));
    setLastHm(String(u.lastHm));
    setIsActive(u.isActive ?? true);
    setErrorMessage(null);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitCode.trim()) {
      const msg = lang === 'id' ? 'Nomor / Kode unit wajib diisi.' : 'Unit code is required.';
      toast.warning(msg);
      return;
    }
    saveMutation.mutate({
      unitCode: unitCode.trim(),
      plateNumber: plateNumber.trim(),
      category,
      type,
      lastKm: parseFloat(lastKm) || 0,
      lastHm: parseFloat(lastHm) || 0,
      isActive,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
            <Truck className="w-5 h-5 text-slate-700 dark:text-white/70" />
            <span>{t('units.title', 'Master Fleet Equipment')}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#888888] mt-0.5">
            {t('units.subtitle', 'Equipment benchmarks, baseline KM/HM telemetry, and operational status')}
          </p>
        </div>

        {canManage && (
          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-800 dark:text-white font-medium text-xs border border-slate-200 dark:border-white/[0.1] active:scale-95 transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{t('units.importExcel', 'Import Excel')}</span>
            </button>

            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black font-semibold text-xs shadow-md hover:bg-slate-800 dark:hover:bg-[#EAEAEA] active:scale-95 transition-all text-white-forced"
            >
              <Plus className="w-3.5 h-3.5 text-white dark:text-black" />
              <span className="text-white dark:text-black font-semibold">{t('units.addUnit', 'Register Unit')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-400 dark:text-[#666]" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          placeholder={t('units.searchPlaceholder', 'Search unit code, plate, or model...')}
          className="w-full text-xs pl-9 pr-4 py-2.5 rounded-full bg-white dark:bg-[#0D0D0D] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#666] focus:border-slate-400 dark:focus:border-white/30 focus:outline-none font-mono shadow-sm"
        />
      </div>

      {/* Units Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white/70 dark:bg-[#0A0A0A] shadow-xl backdrop-blur-md">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#111111] border-b border-slate-200 dark:border-white/[0.06] text-[11px] font-medium text-slate-500 dark:text-[#888888]">
              <th className="py-3 px-4">{t('units.colCode', 'NO UNIT')}</th>
              <th className="py-3 px-4">{t('units.colCategory', 'KATEGORI')}</th>
              <th className="py-3 px-4">{t('units.colType', 'TYPE')}</th>
              <th className="py-3 px-4">{t('units.colPlate', 'PLATE NUMBER')}</th>
              <th className="py-3 px-4 text-right">{t('units.colLastKm', 'LAST KM')}</th>
              <th className="py-3 px-4 text-right">{t('units.colLastHm', 'LAST HM')}</th>
              <th className="py-3 px-4 text-center">{t('units.colStatus', 'STATUS')}</th>
              {canManage && <th className="py-3 px-4 text-center">{t('units.colActions', 'ACTION')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] font-mono text-[11px]">
            {isLoading ? (
              <tr>
                <td colSpan={canManage ? 8 : 7} className="py-12 text-center text-slate-600 dark:text-slate-400">
                  <div className="inline-block w-5 h-5 border-2 border-slate-300 dark:border-white/20 border-t-slate-900 dark:border-t-white rounded-full animate-spin mb-2" />
                  <p>{lang === 'id' ? 'Memuat data armada...' : 'Loading fleet units...'}</p>
                </td>
              </tr>
            ) : paginatedUnits.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 8 : 7} className="py-12 text-center text-slate-400 dark:text-[#666]">
                  {lang === 'id' ? 'Tidak ada unit armada yang ditemukan.' : 'No fleet units found.'}
                </td>
              </tr>
            ) : (
              paginatedUnits.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors text-slate-800 dark:text-white/90">
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{u.unitCode}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-[#888888] font-sans">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-[#999] border border-slate-200 dark:border-white/[0.08]">
                      {u.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-white/80 font-sans text-xs">{(u as any).type || u.makeModel || '-'}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-[#777]">{u.plateNumber || '-'}</td>
                  <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">{formatNumber(u.lastKm, 1)} KM</td>
                  <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">{formatNumber(u.lastHm, 1)} HRS</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                        u.isActive !== false
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-[#888] border-slate-200 dark:border-white/[0.08]'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                      <span>{u.isActive !== false ? t('common.active', 'ACTIVE') : t('common.inactive', 'INACTIVE')}</span>
                    </span>
                  </td>
                  {canManage && (
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleEdit(u)}
                          className="p-1 text-slate-400 hover:text-slate-900 dark:text-[#777] dark:hover:text-white transition-colors"
                          title={t('units.edit', 'Edit Unit')}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingUnit(u);
                            setErrorMessage(null);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-500 dark:text-[#777] dark:hover:text-rose-400 transition-colors"
                          title={t('units.delete', 'Delete Unit')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-[#888888] bg-slate-50/80 dark:bg-[#111111]/60">
          <div className="flex items-center space-x-3">
            <div>
              {lang === 'id' ? 'Menampilkan' : 'Showing'}{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {units.length > 0 ? (activePage - 1) * itemsPerPage + 1 : 0}
              </span>{' '}
              {lang === 'id' ? 'hingga' : 'to'}{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {Math.min(activePage * itemsPerPage, units.length)}
              </span>{' '}
              {lang === 'id' ? 'dari' : 'of'}{' '}
              <span className="font-semibold text-slate-900 dark:text-white">{units.length}</span>{' '}
              {lang === 'id' ? 'unit armada' : 'fleet units'}
            </div>

            <div className="hidden sm:flex items-center space-x-1.5 pl-3 border-l border-slate-200 dark:border-white/[0.08]">
              <span className="text-[11px] text-slate-400 dark:text-[#666]">
                {lang === 'id' ? 'Baris:' : 'Rows:'}
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#151515] text-slate-700 dark:text-white font-mono text-[11px] focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={activePage === 1}
              title={lang === 'id' ? 'Halaman Pertama' : 'First Page'}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] text-slate-700 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/[0.1] shadow-sm transition"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={activePage === 1}
              title={lang === 'id' ? 'Sebelumnya' : 'Previous'}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] text-slate-700 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/[0.1] shadow-sm transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-2.5 py-1 text-xs font-mono font-medium text-slate-700 dark:text-white/90 bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg shadow-sm">
              {activePage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={activePage === totalPages}
              title={lang === 'id' ? 'Berikutnya' : 'Next'}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] text-slate-700 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/[0.1] shadow-sm transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={activePage === totalPages}
              title={lang === 'id' ? 'Halaman Terakhir' : 'Last Page'}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] text-slate-700 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/[0.1] shadow-sm transition"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT UNIT MODAL */}
      {showModal && (
        <ModalPortal>
          <div className="fixed inset-0 w-screen h-screen z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#FAFBFD] dark:bg-[#121212] border border-slate-200 dark:border-white/[0.12] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-slate-900 dark:text-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.06]">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {editingUnit
                    ? (lang === 'id' ? `Ubah Nilai Acuan Unit: ${editingUnit.unitCode}` : `Edit Unit Benchmark: ${editingUnit.unitCode}`)
                    : t('units.modalTitleCreate', 'Register New Fleet Unit')}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
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

              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-500 dark:text-[#888888] font-medium block mb-1">
                    {t('units.unitCodeLabel', 'Unit Code (NO UNIT)')}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingUnit)}
                    value={unitCode}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setUnitCode(val);
                      if (!editingUnit) {
                        if (val.startsWith('PM')) {
                          setType('DOUBLE_TRAILER');
                          setCategory('PRODUKSI');
                        } else if (val.startsWith('GS') || val.startsWith('MTV') || val.startsWith('WT') || val.startsWith('FT')) {
                          setType('SUPPORT_VEHICLE');
                          setCategory('SUPPORT');
                        } else if (val.startsWith('LV') || val.startsWith('TR')) {
                          setType('LIGHT_VEHICLE');
                          setCategory('SUPPORT');
                        }
                      }
                    }}
                    placeholder="e.g. PM 401, DT-105"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono disabled:opacity-50 focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-500 dark:text-[#888888] font-medium block mb-1">
                      {t('units.categoryLabel', 'Kategori')}
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                    >
                      <option value="PRODUKSI">PRODUKSI</option>
                      <option value="SUPPORT">SUPPORT</option>
                      <option value="CONTRACTOR">CONTRACTOR</option>
                      <option value="PLANT SERVICE">PLANT SERVICE</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-500 dark:text-[#888888] font-medium block mb-1">
                      {t('units.typeLabel', 'Type')}
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                    >
                      <option value="DOUBLE_TRAILER">DOUBLE TRAILER</option>
                      <option value="DUMP_TRUCK">DUMP TRUCK</option>
                      <option value="SUPPORT_VEHICLE">SUPPORT VEHICLE</option>
                      <option value="LIGHT_VEHICLE">LIGHT VEHICLE</option>
                      <option value="HEAVY_EQUIPMENT">HEAVY EQUIPMENT</option>
                      <option value="EXCAVATOR">EXCAVATOR</option>
                      <option value="GENERATOR">GENERATOR</option>
                      <option value="STORAGE_TANK">STORAGE TANK</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 dark:text-[#888888] font-medium block mb-1">
                    {t('units.plateLabel', 'Plate Number')}
                  </label>
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder="KT 8199 BD"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-500 dark:text-[#888888] font-medium block mb-1">
                      {lang === 'id' ? 'KM Acuan' : 'Baseline KM'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={lastKm}
                      onChange={(e) => setLastKm(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono font-bold focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 dark:text-[#888888] font-medium block mb-1">
                      {lang === 'id' ? 'HM Acuan' : 'Baseline HM'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={lastHm}
                      onChange={(e) => setLastHm(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono font-bold focus:border-slate-400 dark:focus:border-white/30 focus:outline-none"
                    />
                  </div>
                </div>

                {editingUnit && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.08]">
                    <div>
                      <span className="text-slate-800 dark:text-white font-medium block">
                        {lang === 'id' ? 'Status Operasional' : 'Operational Status'}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-[#888888]">
                        {lang === 'id' ? 'Izinkan pengisian bahan bakar ke unit ini' : 'Allow fuel dispensing to this unit'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsActive(!isActive)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-white/20'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200 dark:border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#888888] hover:text-slate-900 dark:hover:text-white text-xs font-medium transition-colors"
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="px-5 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black font-semibold text-xs hover:bg-slate-800 dark:hover:bg-[#EAEAEA] active:scale-95 transition-all shadow-md"
                  >
                    {saveMutation.isPending ? t('common.saving', 'Saving...') : editingUnit ? (lang === 'id' ? 'Simpan Perubahan' : 'Save Changes') : t('units.save', 'Save Unit')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* DELETE UNIT CONFIRMATION MODAL */}
      {deletingUnit && (
        <ModalPortal>
          <div className="fixed inset-0 w-screen h-screen z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#FAFBFD] dark:bg-[#121212] border border-rose-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-900 dark:text-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'id' ? 'Hapus Unit Armada' : 'Delete Fleet Unit'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#888888]">
                    {deletingUnit.unitCode} • {deletingUnit.makeModel || deletingUnit.category}
                  </p>
                </div>
              </div>

              {errorMessage ? (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs space-y-2">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                  <div className="pt-2 border-t border-rose-500/20 flex justify-end">
                    <button
                      onClick={() => {
                        toggleActiveMutation.mutate({
                          id: deletingUnit.id,
                          nextActive: false,
                        });
                      }}
                      className="px-3 py-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] font-medium transition-colors"
                    >
                      {lang === 'id' ? 'Nonaktifkan Unit Saja' : 'Deactivate Unit Instead'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-600 dark:text-[#999999] leading-relaxed">
                  {lang === 'id'
                    ? `Apakah Anda yakin ingin menghapus permanen unit ${deletingUnit.unitCode}? Unit dengan riwayat transaksi pengisian tidak dapat dihapus.`
                    : `Are you sure you want to permanently delete unit ${deletingUnit.unitCode}? Units with associated historical fuel logs cannot be deleted.`}
                </p>
              )}

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    setDeletingUnit(null);
                    setErrorMessage(null);
                  }}
                  className="px-4 py-2 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#888888] hover:text-slate-900 dark:hover:text-white text-xs font-medium"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(deletingUnit.id)}
                  disabled={deleteMutation.isPending}
                  className="px-5 py-2 rounded-full bg-rose-600 text-white font-semibold text-xs hover:bg-rose-500 active:scale-95 transition-all"
                >
                  {deleteMutation.isPending ? (lang === 'id' ? 'Menghapus...' : 'Deleting...') : (lang === 'id' ? 'Konfirmasi Hapus' : 'Confirm Delete')}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* EXCEL BULK IMPORT MODAL */}
      <ExcelImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        defaultTab="units"
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['units'] });
        }}
      />
    </div>
  );
}
