'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuditLog } from '@/types';
import {
  ShieldCheck,
  Search,
  Trash2,
  Edit3,
  Plus,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Check,
  Database,
  Layers,
  Code2,
  Calendar,
  User,
  Globe,
  Activity,
  FileText,
} from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import ModalPortal from '@/components/shared/ModalPortal';
import { toast } from 'react-toastify';

// Helper: Humanize audit reasons so they don't look like raw stringified objects
function getHumanizedReason(log: AuditLog, lang: 'id' | 'en'): { summary: string; tag?: string; parsed: any | null } {
  // If no newValues or oldValues
  if (!log.newValues && !log.oldValues) {
    if (log.action === 'LOGIN') {
      return {
        summary: lang === 'id' ? 'Login ke sistem berhasil' : 'User authenticated successfully',
        tag: 'Auth',
        parsed: null,
      };
    }
    if (log.action === 'EXPORT') {
      return {
        summary: lang === 'id' ? 'Ekspor laporan transaksi' : 'Exported transaction report',
        tag: 'Export',
        parsed: null,
      };
    }
    return { summary: '-', parsed: null };
  }

  try {
    const data = JSON.parse(log.newValues || log.oldValues || '{}');

    // 1. Explicit reason / note written by user
    if (data.reason && typeof data.reason === 'string') {
      return { summary: data.reason, tag: 'Catatan', parsed: data };
    }
    if (data.note && typeof data.note === 'string') {
      return { summary: data.note, tag: 'Catatan', parsed: data };
    }

    // 2. StorageTank mutations
    if (log.entity === 'StorageTank') {
      const code = data.tankCode || '';
      const name = data.name || '';
      const stock = data.currentStockLiters ? `${Number(data.currentStockLiters).toLocaleString('id-ID')} L` : '';
      const cap = data.capacityLiters ? `${Number(data.capacityLiters).toLocaleString('id-ID')} L` : '';

      if (log.action === 'CREATE') {
        return {
          summary: lang === 'id'
            ? `Pendaftaran tangki: ${code} ${name ? `(${name})` : ''} • Kapasitas: ${cap}`
            : `Registered storage tank: ${code} ${name ? `(${name})` : ''} • Capacity: ${cap}`,
          tag: 'Tank',
          parsed: data,
        };
      }
      if (log.action === 'UPDATE') {
        return {
          summary: lang === 'id'
            ? `Pembaruan tangki: ${code} ${name ? `(${name})` : ''} ${stock ? `• Stok: ${stock}` : ''}`
            : `Updated storage tank: ${code} ${name ? `(${name})` : ''} ${stock ? `• Stock: ${stock}` : ''}`,
          tag: 'Tank',
          parsed: data,
        };
      }
      if (log.action === 'DELETE') {
        return {
          summary: lang === 'id'
            ? `Hapus tangki penyimpanan: ${code} ${name ? `(${name})` : ''}`
            : `Deleted storage tank: ${code} ${name ? `(${name})` : ''}`,
          tag: 'Tank',
          parsed: data,
        };
      }
    }

    // 3. FuelLog mutations
    if (log.entity === 'FuelLog') {
      if (log.action === 'BATCH_IMPORT' || data.rowsScanned || data.logsImported) {
        const rows = data.logsImported || data.rowsScanned || 0;
        const sheets = data.sheetsCount ? ` (${data.sheetsCount} sheets)` : '';
        return {
          summary: lang === 'id'
            ? `Impor Excel: ${Number(rows).toLocaleString('id-ID')} transaksi${sheets}`
            : `Excel Import: ${Number(rows).toLocaleString('en-US')} records${sheets}`,
          tag: 'Import',
          parsed: data,
        };
      }

      const unit = data.unitCode || (data.unitLastKm ? `Unit #${data.unitId?.slice(0, 6) || ''}` : '');
      const vol = data.volumeDispensed ? `+${Number(data.volumeDispensed).toLocaleString('id-ID')} L` : '';
      const shift = data.shift ? `Shift ${data.shift}` : '';
      const isBackdate = data.isBackdate ? (lang === 'id' ? ' (Input Susulan)' : ' (Backdate)') : '';

      if (log.action === 'DELETE') {
        return {
          summary: lang === 'id'
            ? `Hapus log transaksi: ${unit} ${vol}`.trim()
            : `Deleted transaction: ${unit} ${vol}`.trim(),
          tag: 'Dispense',
          parsed: data,
        };
      }
      if (log.action === 'CREATE') {
        return {
          summary: lang === 'id'
            ? `Pengisian BBM: ${unit} ${vol} ${shift}${isBackdate}`.trim()
            : `Fuel Dispense: ${unit} ${vol} ${shift}${isBackdate}`.trim(),
          tag: 'Dispense',
          parsed: data,
        };
      }
      if (log.action === 'UPDATE') {
        return {
          summary: lang === 'id'
            ? `Pembaruan log BBM: ${unit} ${vol} ${shift}`.trim()
            : `Updated fuel log: ${unit} ${vol} ${shift}`.trim(),
          tag: 'Dispense',
          parsed: data,
        };
      }
    }

    // 4. User mutations
    if (log.entity === 'User') {
      const name = data.fullName || data.username || '';
      const role = data.role ? `[${data.role}]` : '';
      if (log.action === 'CREATE') {
        return {
          summary: lang === 'id' ? `Registrasi akun user: ${name} ${role}` : `Registered user: ${name} ${role}`,
          tag: 'User',
          parsed: data,
        };
      }
      if (log.action === 'UPDATE') {
        return {
          summary: lang === 'id' ? `Pembaruan data user: ${name} ${role}` : `Updated user: ${name} ${role}`,
          tag: 'User',
          parsed: data,
        };
      }
      if (log.action === 'DELETE') {
        return {
          summary: lang === 'id' ? `Hapus akun user: ${name}` : `Deleted user: ${name}`,
          tag: 'User',
          parsed: data,
        };
      }
      if (log.action === 'LOGIN') {
        return {
          summary: lang === 'id' ? `Login akun user: ${name}` : `User login: ${name}`,
          tag: 'Auth',
          parsed: data,
        };
      }
    }

    // 5. Unit mutations
    if (log.entity === 'Unit') {
      const code = data.unitCode || '';
      const cat = data.category || '';
      if (log.action === 'CREATE') {
        return {
          summary: lang === 'id' ? `Pendaftaran unit armada: ${code} (${cat})` : `Registered fleet unit: ${code} (${cat})`,
          tag: 'Fleet',
          parsed: data,
        };
      }
      if (log.action === 'UPDATE') {
        return {
          summary: lang === 'id' ? `Pembaruan unit armada: ${code} (${cat})` : `Updated fleet unit: ${code} (${cat})`,
          tag: 'Fleet',
          parsed: data,
        };
      }
      if (log.action === 'DELETE') {
        return {
          summary: lang === 'id' ? `Hapus unit armada: ${code}` : `Deleted fleet unit: ${code}`,
          tag: 'Fleet',
          parsed: data,
        };
      }
    }

    // Fallback: clean preview of key fields without JSON brackets
    const keys = Object.keys(data).filter((k) => !['id', 'createdAt', 'updatedAt'].includes(k));
    if (keys.length > 0) {
      const preview = keys
        .slice(0, 4)
        .map((k) => `${k}: ${String(data[k])}`)
        .join(' • ');
      return { summary: preview, parsed: data };
    }

    return { summary: log.newValues || '-', parsed: data };
  } catch {
    // If not JSON, it is already a plain human readable string!
    return { summary: log.newValues || log.oldValues || '-', parsed: null };
  }
}

export default function AuditPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Modal States
  const [selectedLogForDetail, setSelectedLogForDetail] = useState<AuditLog | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLog, setEditingLog] = useState<AuditLog | null>(null);
  const [deletingLog, setDeletingLog] = useState<AuditLog | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Create Form State
  const [createAction, setCreateAction] = useState('UPDATE');
  const [createEntity, setCreateEntity] = useState('StorageTank');
  const [createEntityId, setCreateEntityId] = useState('');
  const [createReason, setCreateReason] = useState('');
  const [createDetails, setCreateDetails] = useState('');

  // Edit Form State
  const [editReason, setEditReason] = useState('');

  // Fetch Audit Logs
  const { data: auditLogs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ['auditLogs'],
    queryFn: async () => {
      const res = await api.get('/audit?limit=250');
      return res.data.data;
    },
  });

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchesSearch =
        searchTerm === '' ||
        log.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.user?.fullName && log.user.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.user?.username && log.user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.ipAddress && log.ipAddress.includes(searchTerm)) ||
        (log.newValues && log.newValues.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.oldValues && log.oldValues.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
      const matchesEntity = entityFilter === 'ALL' || log.entity === entityFilter;

      return matchesSearch && matchesAction && matchesEntity;
    });
  }, [auditLogs, searchTerm, actionFilter, entityFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const paginatedLogs = useMemo(() => {
    const start = (activePage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, activePage, itemsPerPage]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post('/audit', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      toast.success(lang === 'id' ? 'Catatan audit baru berhasil dicatat.' : 'Audit record logged successfully.');
      setShowCreateModal(false);
      resetCreateForm();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Gagal menambahkan catatan audit.';
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await api.put(`/audit/${id}`, { reason });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      toast.success(lang === 'id' ? 'Catatan audit berhasil diperbarui.' : 'Audit record updated successfully.');
      setEditingLog(null);
      if (selectedLogForDetail && selectedLogForDetail.id === res.data.data.id) {
        setSelectedLogForDetail(res.data.data);
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Gagal memperbarui catatan audit.';
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/audit/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      toast.success(lang === 'id' ? 'Log audit berhasil dihapus.' : 'Audit log deleted successfully.');
      setDeletingLog(null);
      if (selectedLogForDetail && selectedLogForDetail.id === deletingLog?.id) {
        setSelectedLogForDetail(null);
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Gagal menghapus log audit.';
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  const resetCreateForm = () => {
    setCreateAction('UPDATE');
    setCreateEntity('StorageTank');
    setCreateEntityId('');
    setCreateReason('');
    setCreateDetails('');
    setErrorMessage(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createReason.trim()) {
      const msg = lang === 'id' ? 'Alasan / Catatan audit wajib diisi.' : 'Reason / Audit note is required.';
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }
    createMutation.mutate({
      action: createAction,
      entity: createEntity,
      entityId: createEntityId.trim() || undefined,
      reason: createReason.trim(),
      details: createDetails.trim() || undefined,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    if (!editReason.trim()) {
      const msg = lang === 'id' ? 'Catatan audit wajib diisi.' : 'Audit note is required.';
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }
    updateMutation.mutate({
      id: editingLog.id,
      reason: editReason.trim(),
    });
  };

  const handleOpenEdit = (log: AuditLog) => {
    setEditingLog(log);
    const parsedInfo = getHumanizedReason(log, lang);
    setEditReason(parsedInfo.summary !== '-' ? parsedInfo.summary : '');
    setErrorMessage(null);
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    toast.success(lang === 'id' ? 'ID audit disalin ke clipboard!' : 'Audit ID copied to clipboard!');
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Distinct entity list for filter
  const entityOptions = useMemo(() => {
    const list = Array.from(new Set(auditLogs.map((l) => l.entity))).filter(Boolean);
    return list.sort();
  }, [auditLogs]);

  return (
    <div className="space-y-6">
      {/* Header & CRUD Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-slate-700 dark:text-white/70" />
            <span>{t('audit.title', 'System Audit Trail')}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#888888] mt-0.5">
            {t('audit.subtitle', 'Immutable logging of dispensing actions, overrides, and administrative mutations')}
          </p>
        </div>

        {user?.role === 'ADMIN' && (
          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              onClick={() => {
                resetCreateForm();
                setShowCreateModal(true);
              }}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black font-semibold text-xs shadow-md hover:bg-slate-800 dark:hover:bg-[#EAEAEA] active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'id' ? 'Catat Temuan Audit' : 'Record Audit Log'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/50 dark:bg-[#0A0A0A]/50 p-3 rounded-2xl border border-slate-200/80 dark:border-white/[0.06]">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-400 dark:text-[#666]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={lang === 'id' ? 'Cari entitas, aksi, user, IP, atau alasan...' : 'Search entity, action, user, IP, or reason...'}
            className="w-full text-xs pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-[#0D0D0D] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#666] focus:border-slate-400 dark:focus:border-white/30 focus:outline-none font-mono shadow-xs"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center space-x-2 text-xs">
          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-white dark:bg-[#0D0D0D] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-white text-xs font-mono focus:outline-none cursor-pointer shadow-xs"
          >
            <option value="ALL">{lang === 'id' ? 'Semua Aksi' : 'All Actions'}</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="BATCH_IMPORT">BATCH_IMPORT</option>
            <option value="BYPASS_DISPENSE">BYPASS_DISPENSE</option>
            <option value="LOGIN">LOGIN</option>
            <option value="EXPORT">EXPORT</option>
          </select>

          {/* Entity Filter */}
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-white dark:bg-[#0D0D0D] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-white text-xs font-mono focus:outline-none cursor-pointer shadow-xs"
          >
            <option value="ALL">{lang === 'id' ? 'Semua Entitas' : 'All Entities'}</option>
            {entityOptions.map((ent) => (
              <option key={ent} value={ent}>
                {ent}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#0A0A0A] shadow-sm dark:shadow-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#111111] border-b border-slate-200 dark:border-white/[0.06] text-[11px] font-semibold text-slate-500 dark:text-[#888888]">
              <th className="py-3 px-4">{t('audit.colTimestamp', 'TIMESTAMP')}</th>
              <th className="py-3 px-4">{t('audit.colAction', 'ACTION')}</th>
              <th className="py-3 px-4">{t('audit.colEntity', 'ENTITY')}</th>
              <th className="py-3 px-4">{t('audit.colUser', 'PERFORMED BY')}</th>
              <th className="py-3 px-4">{t('audit.colIp', 'IP / CLIENT')}</th>
              <th className="py-3 px-4">{t('audit.colDetails', 'MUTATION DIFF / REASON')}</th>
              <th className="py-3 px-4 text-center">{lang === 'id' ? 'AKSI' : 'ACTIONS'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] font-mono text-[11px]">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-600 dark:text-slate-400">
                  <div className="inline-block w-5 h-5 border-2 border-slate-300 dark:border-white/20 border-t-slate-900 dark:border-t-white rounded-full animate-spin mb-2" />
                  <p>{lang === 'id' ? 'Memuat jejak audit...' : 'Loading audit logs...'}</p>
                </td>
              </tr>
            ) : paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-[#666]">
                  {lang === 'id' ? 'Tidak ada catatan audit yang cocok dengan filter.' : 'No audit records match the filter.'}
                </td>
              </tr>
            ) : (
              paginatedLogs.map((log) => {
                const { summary } = getHumanizedReason(log, lang);

                return (
                  <tr
                    key={log.id}
                    onClick={() => {
                      setSelectedLogForDetail(log);
                      setShowRawJson(false);
                    }}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors text-slate-800 dark:text-white/90 cursor-pointer group"
                    title={lang === 'id' ? 'Klik untuk melihat detail modal audit' : 'Click to view audit modal details'}
                  >
                    {/* Timestamp */}
                    <td className="py-3 px-4 text-slate-500 dark:text-[#777] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    {/* Action Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold tracking-wider ${
                          log.action === 'DELETE'
                            ? 'bg-rose-500/[0.08] text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
                            : 'bg-slate-100 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-white/10'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>

                    {/* Entity */}
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {log.entity}
                    </td>

                    {/* User */}
                    <td className="py-3 px-4 text-slate-700 dark:text-white/80 font-sans whitespace-nowrap">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {log.user?.fullName || log.user?.username || t('audit.systemWorker', 'System Worker')}
                      </span>
                      {log.user?.role && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                          {log.user.role}
                        </span>
                      )}
                    </td>

                    {/* IP / Client */}
                    <td className="py-3 px-4 text-slate-500 dark:text-[#777] font-mono whitespace-nowrap">
                      {log.ipAddress || '127.0.0.1'}
                    </td>

                    {/* SIMPLIFIED REASON (Human-readable instead of raw JSON object) */}
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-md font-sans text-xs">
                      <div className="flex items-center space-x-1.5 truncate">
                        <span className="truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                          {summary}
                        </span>
                      </div>
                    </td>

                    {/* CRUD Actions */}
                    <td
                      className="py-3 px-4 text-center whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        {/* UPDATE: Edit Note */}
                        {user?.role === 'ADMIN' && (
                          <button
                            onClick={() => handleOpenEdit(log)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:text-[#777] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition"
                            title={lang === 'id' ? 'Ubah Catatan Audit (Update)' : 'Edit Audit Note (Update)'}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* DELETE: Delete Record */}
                        {user?.role === 'ADMIN' && (
                          <button
                            onClick={() => {
                              setDeletingLog(log);
                              setErrorMessage(null);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:text-[#777] dark:hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title={lang === 'id' ? 'Hapus Log Audit (Delete)' : 'Delete Audit Log (Delete)'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-[#888888] bg-slate-50/80 dark:bg-[#111111]/60">
          <div className="flex items-center space-x-3">
            <div>
              {lang === 'id' ? 'Menampilkan' : 'Showing'}{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {filteredLogs.length > 0 ? (activePage - 1) * itemsPerPage + 1 : 0}
              </span>{' '}
              {lang === 'id' ? 'hingga' : 'to'}{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {Math.min(activePage * itemsPerPage, filteredLogs.length)}
              </span>{' '}
              {lang === 'id' ? 'dari' : 'of'}{' '}
              <span className="font-semibold text-slate-900 dark:text-white">{filteredLogs.length}</span>{' '}
              {lang === 'id' ? 'log audit' : 'audit records'}
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
              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] text-slate-700 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/[0.1] shadow-xs transition"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={activePage === 1}
              title={lang === 'id' ? 'Sebelumnya' : 'Previous'}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] text-slate-700 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/[0.1] shadow-xs transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-2.5 py-1 text-xs font-mono font-medium text-slate-700 dark:text-white/90 bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg shadow-xs">
              {activePage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={activePage === totalPages}
              title={lang === 'id' ? 'Berikutnya' : 'Next'}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] text-slate-700 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/[0.1] shadow-xs transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={activePage === totalPages}
              title={lang === 'id' ? 'Halaman Terakhir' : 'Last Page'}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] text-slate-700 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/[0.1] shadow-xs transition"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. READ POPUP MODAL CARD (Modal Detail Audit)                             */}
      {/* ========================================================================= */}
      {selectedLogForDetail && (
        <ModalPortal>
          <div className="fixed inset-0 w-screen h-screen z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#FAFBFD] dark:bg-[#121212] border border-slate-200 dark:border-white/[0.12] rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 text-slate-900 dark:text-white animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Card Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-white/[0.08]">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-black flex items-center justify-center font-black shadow-sm shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {lang === 'id' ? 'Detail Catatan Audit' : 'Audit Record Details'}
                      </h3>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold tracking-wider ${
                          selectedLogForDetail.action === 'DELETE'
                            ? 'bg-rose-500/[0.08] text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
                            : 'bg-slate-100 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-white/10'
                        }`}
                      >
                        {selectedLogForDetail.action}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-[#888] font-mono mt-0.5">
                      ID: {selectedLogForDetail.id}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedLogForDetail(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 dark:text-[#666] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Actor & Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                {/* Performed By */}
                <div className="p-3 rounded-2xl bg-white dark:bg-[#181818] border border-slate-200/80 dark:border-white/[0.06]">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block flex items-center space-x-1">
                    <User className="w-3 h-3" />
                    <span>{lang === 'id' ? 'Pelaksana' : 'Actor'}</span>
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white block mt-1 truncate">
                    {selectedLogForDetail.user?.fullName || selectedLogForDetail.user?.username || 'System'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-[#888]">
                    {selectedLogForDetail.user?.role || 'SYSTEM'}
                  </span>
                </div>

                {/* Entity */}
                <div className="p-3 rounded-2xl bg-white dark:bg-[#181818] border border-slate-200/80 dark:border-white/[0.06]">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block flex items-center space-x-1">
                    <Layers className="w-3 h-3" />
                    <span>{lang === 'id' ? 'Entitas' : 'Entity'}</span>
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white block mt-1">
                    {selectedLogForDetail.entity}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-[#888] truncate block">
                    {selectedLogForDetail.entityId ? `#${selectedLogForDetail.entityId.slice(0, 8)}` : 'Global'}
                  </span>
                </div>

                {/* IP / Network */}
                <div className="p-3 rounded-2xl bg-white dark:bg-[#181818] border border-slate-200/80 dark:border-white/[0.06]">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block flex items-center space-x-1">
                    <Globe className="w-3 h-3" />
                    <span>{lang === 'id' ? 'IP Client' : 'Client IP'}</span>
                  </span>
                  <span className="font-semibold font-mono text-slate-900 dark:text-white block mt-1">
                    {selectedLogForDetail.ipAddress || '127.0.0.1'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-[#888] block">IPv4/IPv6</span>
                </div>

                {/* Timestamp */}
                <div className="p-3 rounded-2xl bg-white dark:bg-[#181818] border border-slate-200/80 dark:border-white/[0.06]">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{lang === 'id' ? 'Waktu' : 'Time'}</span>
                  </span>
                  <span className="font-semibold font-mono text-slate-900 dark:text-white block mt-1 text-[11px]">
                    {new Date(selectedLogForDetail.createdAt).toLocaleTimeString(lang === 'id' ? 'id-ID' : 'en-US')}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-[#888] block">
                    {new Date(selectedLogForDetail.createdAt).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US')}
                  </span>
                </div>
              </div>

              {/* Humanized Reason / Summary Banner */}
              {(() => {
                const { summary } = getHumanizedReason(selectedLogForDetail, lang);
                return (
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#181818] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-1.5">
                    <div className="text-[10px] font-bold uppercase font-mono tracking-wider flex items-center space-x-1.5 text-slate-500 dark:text-[#888]">
                      <Activity className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                      <span>{lang === 'id' ? 'Ringkasan Aktivitas / Alasan' : 'Activity Summary / Reason'}</span>
                    </div>
                    <p className="text-xs font-medium leading-relaxed font-sans text-slate-900 dark:text-slate-100">{summary}</p>
                  </div>
                );
              })()}

              {/* Parsed Attributes Breakdown (Clean key-value representation) */}
              {(() => {
                const { parsed } = getHumanizedReason(selectedLogForDetail, lang);
                if (!parsed || typeof parsed !== 'object' || Object.keys(parsed).length === 0) return null;

                const entries = Object.entries(parsed).filter(
                  ([k]) => !['id', 'createdAt', 'updatedAt'].includes(k)
                );

                if (entries.length === 0) return null;

                return (
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono uppercase font-bold text-slate-500 dark:text-[#888] block">
                      {lang === 'id' ? 'Parameter Perubahan Data' : 'Changed Data Parameters'}
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      {entries.map(([key, val]) => (
                        <div
                          key={key}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#161616] border border-slate-200/70 dark:border-white/[0.04]"
                        >
                          <span className="text-[10px] font-mono text-slate-400 uppercase block truncate">
                            {key}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white font-mono text-[11px] block mt-0.5 truncate">
                            {typeof val === 'boolean'
                              ? val
                                ? 'True'
                                : 'False'
                              : val === null || val === undefined
                              ? '-'
                              : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Raw JSON Accordion Toggle */}
              <div className="pt-2 border-t border-slate-200 dark:border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-[#888] dark:hover:text-white transition cursor-pointer"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>
                      {showRawJson
                        ? lang === 'id'
                          ? 'Sembunyikan Raw JSON Payload'
                          : 'Hide Raw JSON Payload'
                        : lang === 'id'
                        ? 'Tampilkan Raw JSON Payload'
                        : 'View Raw JSON Payload'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyId(selectedLogForDetail.newValues || selectedLogForDetail.id)}
                    className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-900 dark:text-[#888] dark:hover:text-white transition"
                  >
                    {copiedId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId ? 'Tersalin' : 'Salin Data'}</span>
                  </button>
                </div>

                {showRawJson && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-slate-900 text-slate-200 dark:bg-black border border-slate-800 dark:border-white/[0.1] font-mono text-[11px] max-h-48 overflow-y-auto">
                    <pre className="whitespace-pre-wrap break-all">
                      {(() => {
                        try {
                          const parsed = JSON.parse(selectedLogForDetail.newValues || selectedLogForDetail.oldValues || '{}');
                          return JSON.stringify(parsed, null, 2);
                        } catch {
                          return selectedLogForDetail.newValues || selectedLogForDetail.oldValues || '{}';
                        }
                      })()}
                    </pre>
                  </div>
                )}
              </div>

              {/* Modal Card Footer Controls */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/[0.08]">
                <div className="flex items-center space-x-2">
                  {user?.role === 'ADMIN' && (
                    <button
                      onClick={() => {
                        handleOpenEdit(selectedLogForDetail);
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.05] text-slate-700 dark:text-white text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/[0.1] transition cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{lang === 'id' ? 'Ubah Catatan' : 'Edit Note'}</span>
                    </button>
                  )}

                  {user?.role === 'ADMIN' && (
                    <button
                      onClick={() => {
                        setDeletingLog(selectedLogForDetail);
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-500/15 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{lang === 'id' ? 'Hapus' : 'Delete'}</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setSelectedLogForDetail(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-black font-semibold text-xs shadow-xs hover:bg-slate-800 dark:hover:bg-[#EAEAEA] active:scale-95 transition cursor-pointer"
                >
                  {t('common.close', 'Tutup')}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* 2. CREATE MANUAL AUDIT LOG MODAL                                          */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <ModalPortal>
          <div className="fixed inset-0 w-screen h-screen z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#FAFBFD] dark:bg-[#121212] border border-slate-200 dark:border-white/[0.12] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-slate-900 dark:text-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.08]">
                <div className="flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-slate-700 dark:text-white" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'id' ? 'Catat Temuan / Log Audit Manual' : 'Record Manual Audit Log / Finding'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-900 dark:text-[#666] dark:hover:text-white transition"
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

              <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-500 dark:text-[#888] font-medium block mb-1">
                      {lang === 'id' ? 'Tipe Aksi' : 'Action Type'}
                    </label>
                    <select
                      value={createAction}
                      onChange={(e) => setCreateAction(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono focus:outline-none"
                    >
                      <option value="UPDATE">UPDATE</option>
                      <option value="CREATE">CREATE</option>
                      <option value="DELETE">DELETE</option>
                      <option value="BYPASS_DISPENSE">BYPASS_DISPENSE</option>
                      <option value="EXPORT">EXPORT</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-500 dark:text-[#888] font-medium block mb-1">
                      {lang === 'id' ? 'Entitas Target' : 'Target Entity'}
                    </label>
                    <select
                      value={createEntity}
                      onChange={(e) => setCreateEntity(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono focus:outline-none"
                    >
                      <option value="StorageTank">StorageTank</option>
                      <option value="FuelLog">FuelLog</option>
                      <option value="Unit">Unit</option>
                      <option value="User">User</option>
                      <option value="SystemCompliance">SystemCompliance</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 dark:text-[#888] font-medium block mb-1">
                    {lang === 'id' ? 'Alasan / Temuan Audit (Wajib)' : 'Audit Reason / Finding (Required)'}
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={createReason}
                    onChange={(e) => setCreateReason(e.target.value)}
                    placeholder={
                      lang === 'id'
                        ? 'Contoh: Pemeriksaan sounding fisik tangki 01, selisih 10L dalam batas wajar toleransi site'
                        : 'e.g. Physical dipstick check of main tank 01, variance 10L within operational tolerance'
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white font-sans focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-500 dark:text-[#888] font-medium block mb-1">
                    {lang === 'id' ? 'Rincian / Data Tambahan (Opsional)' : 'Additional Details / Notes (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={createDetails}
                    onChange={(e) => setCreateDetails(e.target.value)}
                    placeholder={lang === 'id' ? 'misal: Tiket #AUD-2026-09' : 'e.g. Reference Ticket #AUD-2026-09'}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-[#888] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
                  >
                    {t('common.cancel', 'Batal')}
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-black hover:opacity-90 transition disabled:opacity-50"
                  >
                    {createMutation.isPending ? t('common.saving', 'Menyimpan...') : lang === 'id' ? 'Simpan Log Audit' : 'Save Audit Log'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* 3. UPDATE AUDIT NOTE MODAL                                                */}
      {/* ========================================================================= */}
      {editingLog && (
        <ModalPortal>
          <div className="fixed inset-0 w-screen h-screen z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#FAFBFD] dark:bg-[#121212] border border-slate-200 dark:border-white/[0.12] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-900 dark:text-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.08]">
                <div className="flex items-center space-x-2">
                  <Edit3 className="w-4 h-4 text-slate-700 dark:text-white" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'id' ? 'Ubah Catatan / Alasan Audit' : 'Update Audit Reason / Note'}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingLog(null)}
                  className="p-1 text-slate-400 hover:text-slate-900 dark:text-[#666] dark:hover:text-white transition"
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

              <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#181818] border border-slate-200 dark:border-white/[0.06] text-xs">
                  <span className="font-mono text-slate-400 text-[10px] block">TARGET LOG:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {editingLog.action} • {editingLog.entity}
                  </span>
                  <p className="text-[10px] font-mono text-slate-500 dark:text-[#888] mt-0.5">
                    {new Date(editingLog.createdAt).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US')}
                  </p>
                </div>

                <div>
                  <label className="text-slate-500 dark:text-[#888] font-medium block mb-1">
                    {lang === 'id' ? 'Catatan / Alasan Audit Terkini' : 'Updated Audit Reason / Note'}
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder={lang === 'id' ? 'Tuliskan catatan perbaikan atau klarifikasi temuan...' : 'Enter updated note or clarification...'}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white font-sans focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setEditingLog(null)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-[#888] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
                  >
                    {t('common.cancel', 'Batal')}
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-black hover:opacity-90 transition disabled:opacity-50"
                  >
                    {updateMutation.isPending ? t('common.saving', 'Menyimpan...') : lang === 'id' ? 'Perbarui Catatan' : 'Update Note'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* 4. DELETE CONFIRMATION MODAL                                              */}
      {/* ========================================================================= */}
      {deletingLog && (
        <ModalPortal>
          <div className="fixed inset-0 w-screen h-screen z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#FAFBFD] dark:bg-[#121212] border border-slate-200 dark:border-white/[0.12] rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-slate-900 dark:text-white">
              <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
                <div className="p-2 rounded-full bg-rose-500/10 border border-rose-500/20">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'id' ? 'Hapus Catatan Audit?' : 'Delete Audit Log Record?'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-[#888]">
                    {lang === 'id' ? 'Tindakan ini permanen.' : 'This action is irreversible.'}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-[#181818] border border-slate-200 dark:border-white/[0.06] text-xs font-mono space-y-1">
                <div>
                  <span className="text-slate-400">AKSI: </span>
                  <span className="font-bold text-slate-900 dark:text-white">{deletingLog.action}</span>
                </div>
                <div>
                  <span className="text-slate-400">ENTITAS: </span>
                  <span className="text-slate-800 dark:text-white/90">{deletingLog.entity}</span>
                </div>
                <div>
                  <span className="text-slate-400">WAKTU: </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {new Date(deletingLog.createdAt).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setDeletingLog(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-[#888] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
                >
                  {t('common.cancel', 'Batal')}
                </button>
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(deletingLog.id)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition disabled:opacity-50"
                >
                  {deleteMutation.isPending ? t('common.saving', 'Menghapus...') : t('common.delete', 'Hapus')}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
