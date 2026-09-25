'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { User, Role } from '@/types';
import {
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  X,
  Shield,
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  Fuel,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import Link from 'next/link';
import ModalPortal from '@/components/shared/ModalPortal';
import { toast } from 'react-toastify';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    role: 'FUELMAN' as Role,
    isActive: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Fetch Users
  const { data: users = [], isLoading, isFetching, refetch } = useQuery<User[]>({
    queryKey: ['users', search, roleFilter, statusFilter],
    queryFn: async () => {
      let url = `/users?search=${encodeURIComponent(search)}`;
      if (roleFilter !== 'ALL') url += `&role=${roleFilter}`;
      if (statusFilter === 'ACTIVE') url += `&isActive=true`;
      if (statusFilter === 'INACTIVE') url += `&isActive=false`;
      const res = await api.get(url);
      return res.data.data;
    },
    enabled: currentUser?.role === 'ADMIN',
  });

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    toast.success(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Create User Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post('/users', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreateModal(false);
      resetForm();
      showNotification('Akun pengguna baru berhasil didaftarkan.');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Gagal mendaftarkan pengguna baru.';
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  // Update User Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await api.put(`/users/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
      resetForm();
      showNotification('Data pengguna berhasil diperbarui.');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Gagal memperbarui pengguna.';
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  // Toggle Active Status Mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await api.put(`/users/${id}`, { isActive });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showNotification(
        variables.isActive
          ? 'Akun pengguna berhasil diaktifkan.'
          : 'Akun pengguna berhasil dinonaktifkan.'
      );
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Gagal memperbarui status akun.';
      showNotification(msg);
      toast.error(msg);
    },
  });

  // Delete User Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeletingUser(null);
      showNotification('Akun pengguna berhasil dihapus permanen.');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Gagal menghapus pengguna.';
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  const resetForm = () => {
    setFormData({
      username: '',
      fullName: '',
      email: '',
      password: '',
      role: 'FUELMAN',
      isActive: true,
    });
    setErrorMessage(null);
    setShowPassword(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleOpenEdit = (target: User) => {
    resetForm();
    setEditingUser(target);
    setFormData({
      username: target.username,
      fullName: target.fullName,
      email: target.email,
      password: '',
      role: target.role,
      isActive: target.isActive,
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.fullName.trim() || !formData.password.trim()) {
      const msg = 'Username, nama lengkap, dan password wajib diisi.';
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }
    setErrorMessage(null);
    createMutation.mutate(formData);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!formData.fullName.trim()) {
      const msg = 'Nama lengkap wajib diisi.';
      setErrorMessage(msg);
      toast.warning(msg);
      return;
    }
    setErrorMessage(null);

    const payload: any = {
      fullName: formData.fullName,
      email: formData.email,
      role: formData.role,
      isActive: formData.isActive,
    };
    if (formData.password.trim().length > 0) {
      payload.password = formData.password.trim();
    }

    updateMutation.mutate({ id: editingUser.id, payload });
  };

  const handleDeleteConfirm = () => {
    if (!deletingUser) return;
    setErrorMessage(null);
    deleteMutation.mutate(deletingUser.id);
  };

  // Restrict access to non-admin users
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-white">{t('users.accessRestricted')}</h2>
          <p className="text-xs text-[#888888] max-w-sm">
            {t('users.accessRestrictedDesc')}
          </p>
        </div>
        <Link
          href="/dispenser"
          className="px-4 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-[#EAEAEA] transition-colors"
        >
          {t('users.returnToDispenser')}
        </Link>
      </div>
    );
  }

  // Summary Metrics
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.isActive).length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const fuelmanCount = users.filter((u) => u.role === 'FUELMAN').length;
  const managementCount = users.filter((u) => u.role === 'MANAGEMENT').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4 py-3 rounded-2xl bg-[#111111] border border-emerald-500/40 text-emerald-400 text-xs shadow-2xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-slate-700 dark:text-white/70" />
            <span>{t('users.title')}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#888888] mt-0.5">
            {t('users.subtitle')}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleOpenCreate}
            className="flex items-center space-x-2 px-4 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black font-semibold text-xs shadow-md hover:bg-slate-800 dark:hover:bg-[#EAEAEA] active:scale-95 transition-all text-white-forced"
          >
            <UserPlus className="w-3.5 h-3.5 text-white dark:text-black" />
            <span className="text-white dark:text-black font-semibold">{t('users.addUser')}</span>
          </button>
        </div>
      </div>

      {/* Quick KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-500 dark:text-[#777777] uppercase tracking-wider">
            {t('users.totalUsers')}
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{totalCount}</span>
            <span className="text-[10px] text-slate-400 dark:text-[#666]">{t('users.registered')}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-500 dark:text-[#777777] uppercase tracking-wider">
            {t('users.activeAccounts')}
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{activeCount}</span>
            <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-mono">
              {totalCount > 0 ? `${Math.round((activeCount / totalCount) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-500 dark:text-[#777777] uppercase tracking-wider">
            {t('users.administrators')}
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{adminCount}</span>
            <span className="text-[10px] text-slate-400 dark:text-[#666]">{t('users.rootPrivileged')}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-500 dark:text-[#777777] uppercase tracking-wider">
            {t('users.fuelmenOfficers')}
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{fuelmanCount}</span>
            <span className="text-[10px] text-slate-400 dark:text-[#666]">
              {managementCount > 0 ? `+ ${managementCount} Mgmt` : t('users.fieldCrew')}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-400 dark:text-[#666]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('users.searchPlaceholder')}
            className="w-full text-xs pl-9 pr-4 py-2.5 rounded-full bg-white dark:bg-[#0D0D0D] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#666] focus:border-slate-400 dark:focus:border-white/30 focus:outline-none font-mono shadow-sm"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center p-1 rounded-full bg-slate-100 dark:bg-[#0D0D0D] border border-slate-200 dark:border-white/[0.08] text-[11px]">
            <button
              onClick={() => setRoleFilter('ALL')}
              className={`px-3 py-1 rounded-full transition-colors ${
                roleFilter === 'ALL'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-[#888888] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('users.allRoles')}
            </button>
            <button
              onClick={() => setRoleFilter('ADMIN')}
              className={`px-3 py-1 rounded-full transition-colors ${
                roleFilter === 'ADMIN'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-[#888888] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('users.admins')}
            </button>
            <button
              onClick={() => setRoleFilter('MANAGEMENT')}
              className={`px-3 py-1 rounded-full transition-colors ${
                roleFilter === 'MANAGEMENT'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-[#888888] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('users.management', 'Management')}
            </button>
            <button
              onClick={() => setRoleFilter('FUELMAN')}
              className={`px-3 py-1 rounded-full transition-colors ${
                roleFilter === 'FUELMAN'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-[#888888] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('users.fuelmen')}
            </button>
          </div>

          <div className="flex items-center p-1 rounded-full bg-slate-100 dark:bg-[#0D0D0D] border border-slate-200 dark:border-white/[0.08] text-[11px]">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-full transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-[#888888] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('users.allStatus')}
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 rounded-full transition-colors ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-[#888888] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('users.active')}
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1 rounded-full transition-colors ${
                statusFilter === 'INACTIVE'
                  ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-[#888888] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('users.inactive')}
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-[#0A0A0A] shadow-sm dark:shadow-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#111111] border-b border-slate-200 dark:border-white/[0.06] text-[11px] font-semibold text-slate-500 dark:text-[#888888]">
              <th className="py-3.5 px-4">{t('users.colUser')}</th>
              <th className="py-3.5 px-4">{t('users.colEmail')}</th>
              <th className="py-3.5 px-4 text-center">{t('users.colRole')}</th>
              <th className="py-3.5 px-4 text-center">{t('users.colStatus')}</th>
              <th className="py-3.5 px-4 text-center">{t('users.colDispenseLogs')}</th>
              <th className="py-3.5 px-4">{t('users.colCreated')}</th>
              <th className="py-3.5 px-4 text-center">{t('users.colActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] text-[11px]">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-600 dark:text-slate-400">
                  <div className="inline-block w-5 h-5 border-2 border-slate-300 dark:border-white/20 border-t-slate-900 dark:border-t-white rounded-full animate-spin mb-2" />
                  <p>{t('users.loadingUsers')}</p>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-[#666666]">
                  {t('users.noUsersFound')}
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isSelf = currentUser?.id === u.id;
                return (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors text-slate-800 dark:text-white/90"
                  >
                    {/* User info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white dark:bg-white/10 dark:text-white border border-slate-800 dark:border-white/15 flex items-center justify-center font-bold text-xs shrink-0">
                          <span className="!text-white font-bold">{u.fullName?.charAt(0)?.toUpperCase() || 'U'}</span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-semibold text-slate-900 dark:text-white">{u.fullName}</span>
                            {isSelf && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-[#bbb] border border-slate-300 dark:border-white/10">
                                {t('users.you')}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 dark:text-[#777777]">
                            @{u.username}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-[#999999]">{u.email}</td>

                    {/* Role */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono tracking-wider ${
                          u.role === 'ADMIN'
                            ? 'font-bold bg-slate-900 text-white dark:bg-white dark:text-black border border-slate-900 dark:border-white shadow-xs'
                            : u.role === 'MANAGEMENT'
                            ? 'font-semibold bg-slate-100 text-slate-800 dark:bg-white/[0.08] dark:text-slate-200 border border-slate-300 dark:border-white/20'
                            : 'font-semibold bg-slate-100 text-slate-800 dark:bg-white/[0.08] dark:text-slate-200 border border-slate-200/90 dark:border-white/10'
                        }`}
                      >
                        <Shield className={`w-3 h-3 ${u.role === 'ADMIN' ? 'text-white dark:text-black' : 'text-slate-500 dark:text-slate-400'}`} />
                        <span>{u.role}</span>
                      </span>
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      {isSelf ? (
                        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>{t('users.active').toUpperCase()}</span>
                        </span>
                      ) : (
                        <button
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: u.id,
                              isActive: !u.isActive,
                            })
                          }
                          title={u.isActive ? t('users.clickToDeactivate') : t('users.clickToActivate')}
                          className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium transition-all ${
                            u.isActive
                              ? 'bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-200/80 dark:hover:bg-white/10'
                              : 'bg-rose-500/[0.08] text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-500/15'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          ></span>
                          <span>{u.isActive ? t('users.active').toUpperCase() : t('users.inactive').toUpperCase()}</span>
                        </button>
                      )}
                    </td>

                    {/* Operational records count */}
                    <td className="py-3.5 px-4 text-center font-mono">
                      <span
                        className={`text-[11px] ${
                          (u._count?.fuelLogs || 0) > 0 ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400 dark:text-[#555]'
                        }`}
                      >
                        {u._count?.fuelLogs || 0}
                      </span>
                    </td>

                    {/* Created At */}
                    <td className="py-3.5 px-4 text-slate-500 dark:text-[#777] font-mono text-[10px]">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '-'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:text-[#777] dark:hover:text-white dark:hover:bg-white/[0.06] rounded-lg transition-colors"
                          title={t('users.editUser')}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {!isSelf && (
                          <button
                            onClick={() => {
                              setErrorMessage(null);
                              setDeletingUser(u);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-[#777] dark:hover:text-rose-400 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                            title={t('users.deleteUser')}
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
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <ModalPortal>
          <div className="fixed inset-0 w-screen h-screen z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#121212] border border-white/[0.12] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center font-bold">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">{t('users.createModalTitle')}</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 text-[#666] hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#888888] font-medium block mb-1">{t('users.username')}</label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      placeholder="e.g. fuelman_andi"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#1A1A1A] border border-white/[0.1] text-white font-mono focus:border-white/30 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[#888888] font-medium block mb-1">{t('users.systemRole')}</label>
                    <select
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value as Role })
                      }
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#1A1A1A] border border-white/[0.1] text-white font-mono focus:border-white/30 focus:outline-none"
                    >
                      <option value="FUELMAN">FUELMAN ({lang === 'id' ? 'Operator' : 'Operator'})</option>
                      <option value="MANAGEMENT">MANAGEMENT ({lang === 'id' ? 'Pengawas / Manajerial (Read-Only)' : 'Supervisor / Management (Read-Only)'})</option>
                      <option value="ADMIN">ADMIN ({lang === 'id' ? 'Akses Penuh' : 'Full Control'})</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[#888888] font-medium block mb-1">{t('users.fullName')}</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    placeholder="e.g. Andi Wijaya"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#1A1A1A] border border-white/[0.1] text-white focus:border-white/30 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[#888888] font-medium block mb-1">{t('users.emailAddress')}</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="andi.wijaya@batara.co.id"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#1A1A1A] border border-white/[0.1] text-white font-mono focus:border-white/30 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[#888888] font-medium block mb-1">{t('users.initialPassword')}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder={lang === 'id' ? 'Min. 6 karakter' : 'Min. 6 characters'}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-2xl bg-[#1A1A1A] border border-white/[0.1] text-white font-mono focus:border-white/30 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-2.5 text-[#666] hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#171717] border border-white/[0.06]">
                  <div>
                    <span className="text-white font-medium block">{t('users.accountStatus')}</span>
                    <span className="text-[#777] text-[11px]">
                      {formData.isActive ? t('users.activeDesc') : t('users.inactiveDesc')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                      formData.isActive ? 'bg-emerald-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        formData.isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-full bg-white/[0.06] text-[#888888] hover:text-white text-xs font-medium"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-5 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-[#EAEAEA] active:scale-95 transition-all"
                  >
                    {createMutation.isPending ? t('common.saving') : (lang === 'id' ? 'Daftarkan Pengguna' : 'Register User')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <ModalPortal>
          <div className="fixed inset-0 w-screen h-screen z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#121212] border border-white/[0.12] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center font-bold">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    {t('users.editModalTitle')}: @{editingUser.username}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1 text-[#666] hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleUpdateSubmit} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#888888] font-medium block mb-1">
                      {t('users.username')} ({lang === 'id' ? 'Tetap' : 'Fixed'})
                    </label>
                    <input
                      type="text"
                      disabled
                      value={formData.username}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#1A1A1A] border border-white/[0.05] text-[#777] font-mono opacity-70 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="text-[#888888] font-medium block mb-1">{t('users.systemRole')}</label>
                    <select
                      value={formData.role}
                      disabled={currentUser?.id === editingUser.id}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value as Role })
                      }
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#1A1A1A] border border-white/[0.1] text-white font-mono focus:border-white/30 focus:outline-none disabled:opacity-50"
                    >
                      <option value="FUELMAN">FUELMAN ({lang === 'id' ? 'Operator' : 'Operator'})</option>
                      <option value="MANAGEMENT">MANAGEMENT ({lang === 'id' ? 'Pengawas / Manajerial (Read-Only)' : 'Supervisor / Management (Read-Only)'})</option>
                      <option value="ADMIN">ADMIN ({lang === 'id' ? 'Akses Penuh' : 'Full Control'})</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[#888888] font-medium block mb-1">{t('users.fullName')}</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#1A1A1A] border border-white/[0.1] text-white focus:border-white/30 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[#888888] font-medium block mb-1">{t('users.emailAddress')}</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#1A1A1A] border border-white/[0.1] text-white font-mono focus:border-white/30 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[#888888] font-medium block">
                      {t('users.resetPassword')} <span className="text-[#555]">({t('users.optional')})</span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      minLength={6}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder={t('users.leaveBlank')}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-2xl bg-[#1A1A1A] border border-white/[0.1] text-white font-mono focus:border-white/30 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-2.5 text-[#666] hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#171717] border border-white/[0.06]">
                  <div>
                    <span className="text-white font-medium block">{t('users.accountStatus')}</span>
                    <span className="text-[#777] text-[11px]">
                      {currentUser?.id === editingUser.id
                        ? t('users.cannotDeactivateSelf')
                        : formData.isActive
                        ? t('users.activeDesc')
                        : t('users.inactiveDesc')}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={currentUser?.id === editingUser.id}
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 disabled:opacity-40 ${
                      formData.isActive ? 'bg-emerald-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        formData.isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 rounded-full bg-white/[0.06] text-[#888888] hover:text-white text-xs font-medium"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="px-5 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-[#EAEAEA] active:scale-95 transition-all"
                  >
                    {updateMutation.isPending ? t('common.saving') : (lang === 'id' ? 'Simpan Perubahan' : 'Save Changes')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      {deletingUser && (
        <ModalPortal>
          <div className="fixed inset-0 w-screen h-screen z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#FAFBFD] dark:bg-[#121212] border border-rose-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-900 dark:text-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('users.deleteUser')}</h3>
                  <p className="text-xs text-slate-500 dark:text-[#888888]">
                    @{deletingUser.username} ({deletingUser.fullName})
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
                          id: deletingUser.id,
                          isActive: false,
                        });
                        setDeletingUser(null);
                      }}
                      className="px-3 py-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] font-medium transition-colors"
                    >
                      {t('users.deactivateInstead')}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-600 dark:text-[#999999] leading-relaxed">
                  {t('users.deleteConfirm')}
                  {(deletingUser._count?.fuelLogs || 0) > 0 && (
                    <span className="block mt-2 text-amber-600 dark:text-amber-400 font-medium">
                      {t('users.deleteWarningHasLogs')}
                    </span>
                  )}
                </p>
              )}

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setDeletingUser(null)}
                  className="px-4 py-2 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#888888] hover:text-slate-900 dark:hover:text-white text-xs font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleteMutation.isPending}
                  className="px-5 py-2 rounded-full bg-rose-600 text-white font-semibold text-xs hover:bg-rose-500 active:scale-95 transition-all"
                >
                  {deleteMutation.isPending ? (lang === 'id' ? 'Menghapus...' : 'Deleting...') : t('users.confirmDelete')}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
