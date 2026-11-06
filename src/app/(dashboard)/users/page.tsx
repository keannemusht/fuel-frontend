'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { User, Role } from '@/types';
import {
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  Edit3,
  Trash2,
  X,
  Shield,
  ShieldAlert,
  Fuel,
  Briefcase,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import Link from 'next/link';
import CreateUserModal from '@/components/users/CreateUserModal';
import EditUserModal from '@/components/users/EditUserModal';
import DeleteUserModal from '@/components/users/DeleteUserModal';
import { toast } from 'react-toastify';

// Clean 2-letter initials helper
const getUserInitials = (name?: string, username?: string): string => {
  const target = name?.trim() || username?.trim() || 'U';
  const parts = target.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return target.slice(0, 2).toUpperCase();
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch Users
  const { data: users = [], isLoading } = useQuery<User[]>({
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
    toast.success(msg);
  };

  // Create User Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post('/users', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreateModal(false);
      setErrorMessage(null);
      showNotification(
        lang === 'id'
          ? 'Akun pengguna baru berhasil didaftarkan.'
          : 'New user account registered successfully.'
      );
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || (lang === 'id' ? 'Gagal mendaftarkan pengguna baru.' : 'Failed to register new user.');
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
      setErrorMessage(null);
      showNotification(
        lang === 'id'
          ? 'Data pengguna berhasil diperbarui.'
          : 'User details updated successfully.'
      );
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || (lang === 'id' ? 'Gagal memperbarui pengguna.' : 'Failed to update user.');
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
          ? (lang === 'id' ? 'Akun pengguna berhasil diaktifkan.' : 'User account activated successfully.')
          : (lang === 'id' ? 'Akun pengguna berhasil dinonaktifkan.' : 'User account deactivated successfully.')
      );
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || (lang === 'id' ? 'Gagal memperbarui status akun.' : 'Failed to update account status.');
      setErrorMessage(msg);
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
      showNotification(
        lang === 'id'
          ? 'Akun pengguna berhasil dihapus permanen.'
          : 'User account permanently deleted.'
      );
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || (lang === 'id' ? 'Gagal menghapus pengguna.' : 'Failed to delete user.');
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  const handleOpenCreate = () => {
    setErrorMessage(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (target: User) => {
    setErrorMessage(null);
    setEditingUser(target);
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
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{t('users.accessRestricted')}</h2>
          <p className="text-xs text-slate-500 dark:text-[#888888] max-w-sm">
            {t('users.accessRestrictedDesc')}
          </p>
        </div>
        <Link
          href="/dispenser"
          className="px-4 py-2 rounded-full bg-slate-900 text-white dark:bg-white dark:text-black font-semibold text-xs hover:bg-slate-800 dark:hover:bg-[#EAEAEA] transition-colors"
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

  const activeFilterCount = (roleFilter !== 'ALL' ? 1 : 0) + (statusFilter !== 'ALL' ? 1 : 0);

  // Segmented Role Filter Tabs
  const roleTabs = [
    { id: 'ALL', label: lang === 'id' ? 'Semua Akun' : 'All Accounts', count: totalCount },
    { id: 'ADMIN', label: 'Admin', count: adminCount },
    { id: 'MANAGEMENT', label: 'Management', count: managementCount },
    { id: 'FUELMAN', label: 'Fuelmen', count: fuelmanCount },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/[0.08]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2.5">
            <Users className="w-6 h-6 text-slate-800 dark:text-white" />
            <span>{t('users.title')}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#888888] mt-1">
            {t('users.subtitle')}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleOpenCreate}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-semibold text-xs shadow-xs hover:bg-slate-800 dark:hover:bg-[#EAEAEA] active:scale-95 transition-all text-white-forced cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-white dark:text-black" />
            <span className="text-white dark:text-black font-semibold">{t('users.addUser')}</span>
          </button>
        </div>
      </div>

      {/* Quick KPI Stats Cards - Sophisticated Monochromatic Industrial Design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Users */}
        <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-[#888888]">
              {t('users.totalUsers')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-center text-slate-600 dark:text-slate-400">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <h3 className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {totalCount}
            </h3>
            <span className="text-[11px] text-slate-400 dark:text-[#777] font-mono">
              {t('users.registeredPersonnel', 'registered')}
            </span>
          </div>
        </div>

        {/* Active Accounts */}
        <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-[#888888]">
              {t('users.activeAccounts')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-center text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <h3 className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {activeCount}
            </h3>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0}% {t('users.active')}
            </span>
          </div>
        </div>

        {/* Administrators */}
        <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-[#888888]">
              {t('users.administrators')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-center text-slate-600 dark:text-slate-400">
              <Shield className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <h3 className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {adminCount}
            </h3>
            <span className="text-[11px] text-slate-400 dark:text-[#777] font-mono">
              {t('users.rootPrivileged', 'full access')}
            </span>
          </div>
        </div>

        {/* Fuelmen & Field Crew */}
        <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-[#888888]">
              {t('users.fuelmenOfficers')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-center text-slate-600 dark:text-slate-400">
              <Fuel className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <h3 className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {fuelmanCount}
            </h3>
            <span className="text-[11px] text-slate-400 dark:text-[#777] font-mono">
              {managementCount > 0 ? `+ ${managementCount} mgmt` : t('users.fieldCrew')}
            </span>
          </div>
        </div>
      </div>

      {/* Segmented Filter Control & Search Toolbar */}
      <div className="space-y-3 relative z-20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Minimalist Segmented Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] overflow-x-auto self-start sm:self-auto">
            {roleTabs.map((tab) => {
              const isActive = roleFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setRoleFilter(tab.id as any)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-[#1A1A1A] text-slate-900 dark:text-white font-semibold shadow-xs'
                      : 'text-slate-500 dark:text-[#888] hover:text-slate-900 dark:hover:text-white font-medium'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="text-[10px] font-mono opacity-60">
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Controls: Search Input + Status Filter + Filter Popover */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3.5 top-2.5 text-slate-400 dark:text-[#666]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('users.searchPlaceholder')}
                className="w-full text-xs pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-[#0D0D0D] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#666] focus:border-slate-400 dark:focus:border-white/30 focus:outline-none font-mono shadow-xs"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Clean Status Switch */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] shrink-0">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-[#1A1A1A] text-slate-900 dark:text-white font-semibold shadow-xs'
                    : 'text-slate-500 dark:text-[#888] font-medium'
                }`}
              >
                {lang === 'id' ? 'Semua' : 'All'}
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-white dark:bg-[#1A1A1A] text-slate-900 dark:text-white font-semibold shadow-xs'
                    : 'text-slate-500 dark:text-[#888] font-medium'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{lang === 'id' ? 'Aktif' : 'Active'}</span>
              </button>
              <button
                onClick={() => setStatusFilter('INACTIVE')}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                  statusFilter === 'INACTIVE'
                    ? 'bg-white dark:bg-[#1A1A1A] text-slate-900 dark:text-white font-semibold shadow-xs'
                    : 'text-slate-500 dark:text-[#888] font-medium'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>{lang === 'id' ? 'Nonaktif' : 'Inactive'}</span>
              </button>
            </div>

            {/* Filter Popover Button */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setShowFilterDropdown((prev) => !prev)}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all shadow-xs active:scale-95 cursor-pointer ${
                  activeFilterCount > 0
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-black border-slate-900 dark:border-white'
                    : 'bg-white dark:bg-[#0D0D0D] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{t('common.filter', 'Filter')}</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center bg-emerald-500 text-white font-mono">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    showFilterDropdown ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Filter Dropdown Popover */}
              {showFilterDropdown && (
                <div className="filter-dropdown-card absolute right-0 top-full mt-2 w-72 rounded-2xl p-4 z-50 animate-in fade-in duration-150 shadow-2xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/[0.12]">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
                    <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-semibold text-xs">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-white/60" />
                      <span>{lang === 'id' ? 'Filter Pengguna' : 'Filter Users'}</span>
                    </div>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={() => {
                          setRoleFilter('ALL');
                          setStatusFilter('ALL');
                        }}
                        className="text-[11px] font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400 flex items-center space-x-1 transition cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-4 py-3">
                    {/* Role Filter */}
                    <div>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-[#777777] block mb-2">
                        {t('users.roleFilter')}
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => setRoleFilter('ALL')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium text-left transition-all ${
                            roleFilter === 'ALL'
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-semibold shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] text-slate-700 dark:text-[#888888] dark:hover:bg-white/[0.08]'
                          }`}
                        >
                          {t('users.allRoles')}
                        </button>
                        <button
                          onClick={() => setRoleFilter('ADMIN')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium text-left transition-all ${
                            roleFilter === 'ADMIN'
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-semibold shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] text-slate-700 dark:text-[#888888] dark:hover:bg-white/[0.08]'
                          }`}
                        >
                          {t('users.admins')}
                        </button>
                        <button
                          onClick={() => setRoleFilter('MANAGEMENT')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium text-left transition-all ${
                            roleFilter === 'MANAGEMENT'
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-semibold shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] text-slate-700 dark:text-[#888888] dark:hover:bg-white/[0.08]'
                          }`}
                        >
                          {t('users.management', 'Management')}
                        </button>
                        <button
                          onClick={() => setRoleFilter('FUELMAN')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium text-left transition-all ${
                            roleFilter === 'FUELMAN'
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-semibold shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] text-slate-700 dark:text-[#888888] dark:hover:bg-white/[0.08]'
                          }`}
                        >
                          {t('users.fuelmen')}
                        </button>
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-[#777777] block mb-2">
                        {t('users.statusFilter')}
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => setStatusFilter('ALL')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-center transition-all ${
                            statusFilter === 'ALL'
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-semibold shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] text-slate-700 dark:text-[#888888] dark:hover:bg-white/[0.08]'
                          }`}
                        >
                          {t('users.allStatus')}
                        </button>
                        <button
                          onClick={() => setStatusFilter('ACTIVE')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 transition-all ${
                            statusFilter === 'ACTIVE'
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-semibold shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] text-slate-700 dark:text-[#888888] dark:hover:bg-white/[0.08]'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>{t('users.active')}</span>
                        </button>
                        <button
                          onClick={() => setStatusFilter('INACTIVE')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 transition-all ${
                            statusFilter === 'INACTIVE'
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-semibold shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] text-slate-700 dark:text-[#888888] dark:hover:bg-white/[0.08]'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span>{t('users.inactive')}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400 dark:text-[#666]">
                      {users.length} {lang === 'id' ? 'pengguna' : 'users'}
                    </span>
                    <button
                      onClick={() => setShowFilterDropdown(false)}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-800 dark:text-white text-xs font-semibold transition cursor-pointer"
                    >
                      {lang === 'id' ? 'Selesai' : 'Done'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-0.5 animate-in fade-in duration-150">
            <span className="text-[11px] text-slate-400 dark:text-[#666] font-medium">
              {lang === 'id' ? 'Filter aktif:' : 'Active filters:'}
            </span>

            {roleFilter !== 'ALL' && (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.08]">
                <span>
                  {t('users.roleFilter')}:{' '}
                  <strong className="font-semibold text-slate-900 dark:text-white">
                    {roleFilter === 'ADMIN'
                      ? t('users.admins')
                      : roleFilter === 'MANAGEMENT'
                      ? t('users.management', 'Management')
                      : t('users.fuelmen')}
                  </strong>
                </span>
                <button
                  onClick={() => setRoleFilter('ALL')}
                  className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/20 text-slate-400 hover:text-slate-700 dark:text-white/60 dark:hover:text-white transition cursor-pointer"
                  title="Remove filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.08]">
                <span>
                  {t('users.statusFilter')}:{' '}
                  <strong className="font-semibold text-slate-900 dark:text-white">
                    {statusFilter === 'ACTIVE' ? t('users.active') : t('users.inactive')}
                  </strong>
                </span>
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/20 text-slate-400 hover:text-slate-700 dark:text-white/60 dark:hover:text-white transition cursor-pointer"
                  title="Remove filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              onClick={() => {
                setRoleFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:underline ml-1 cursor-pointer"
            >
              {lang === 'id' ? 'Hapus Semua' : 'Clear All'}
            </button>
          </div>
        )}
      </div>

      {/* Users Table - High-End Minimalist Enterprise Layout */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-[#111111] border-b border-slate-200/80 dark:border-white/[0.06] text-[10px] font-mono font-bold text-slate-500 dark:text-[#888888] uppercase tracking-wider">
                <th className="py-3.5 px-5">{t('users.userAndIdentity', 'PENGGUNA & IDENTITAS')}</th>
                <th className="py-3.5 px-4">{t('users.emailAndContact', 'ALAMAT EMAIL')}</th>
                <th className="py-3.5 px-4 text-center">{t('users.assignedRole', 'PERAN')}</th>
                <th className="py-3.5 px-4 text-center">{t('users.colAccountStatus', 'STATUS')}</th>
                <th className="py-3.5 px-4 text-center">{t('users.fuelOperations', 'LOG PENGISIAN')}</th>
                <th className="py-3.5 px-4">{t('users.registeredOn', 'TERDAFTAR')}</th>
                <th className="py-3.5 px-4 text-center">{t('users.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-600 dark:text-slate-400">
                    <div className="inline-block w-5 h-5 border-2 border-slate-300 dark:border-white/20 border-t-slate-900 dark:border-t-white rounded-full animate-spin mb-2" />
                    <p className="text-xs font-mono">{t('users.loadingUsers')}</p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 dark:text-[#666666]">
                    <Users className="w-7 h-7 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">{t('users.noUsersFound')}</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  const initials = getUserInitials(u.fullName, u.username);

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* User & Identity (Minimalist Avatar + Typography) */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-white/[0.1] flex items-center justify-center font-bold text-xs shrink-0 tracking-wide">
                            <span>{initials}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                                {u.fullName}
                              </span>
                              {isSelf && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 font-medium shrink-0">
                                  {t('users.you')}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-slate-500 dark:text-[#777777] block truncate">
                              @{u.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email Address */}
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                        <span className="truncate">{u.email}</span>
                      </td>

                      {/* Role Tag (Understated Typography Badge) */}
                      <td className="py-3.5 px-4 text-center">
                        {u.role === 'ADMIN' ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs">
                            <Shield className="w-3 h-3 text-slate-300 dark:text-slate-700" />
                            <span>ADMIN</span>
                          </span>
                        ) : u.role === 'MANAGEMENT' ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-100 text-slate-700 dark:bg-white/[0.06] dark:text-slate-300 border border-slate-200/90 dark:border-white/[0.08]">
                            <Briefcase className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                            <span>MANAGEMENT</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-100 text-slate-700 dark:bg-white/[0.06] dark:text-slate-300 border border-slate-200/90 dark:border-white/[0.08]">
                            <Fuel className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                            <span>FUELMAN</span>
                          </span>
                        )}
                      </td>

                      {/* Status (Quiet inline indicator) */}
                      <td className="py-3.5 px-4 text-center">
                        {isSelf ? (
                          <span className="inline-flex items-center space-x-1.5 font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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
                            className="inline-flex items-center space-x-1.5 font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                              }`}
                            />
                            <span>{u.isActive ? t('users.active').toUpperCase() : t('users.inactive').toUpperCase()}</span>
                          </button>
                        )}
                      </td>

                      {/* Operational records count */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        <span className={`text-xs ${(u._count?.fuelLogs || 0) > 0 ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                          {u._count?.fuelLogs || 0}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-[#666] ml-1">
                          logs
                        </span>
                      </td>

                      {/* Created At (Dual-Row Timestamp) */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <span className="block font-medium text-slate-700 dark:text-slate-300">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-'}
                        </span>
                        <span className="block text-[10px] text-slate-400 dark:text-[#777]">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleTimeString(lang === 'id' ? 'id-ID' : 'en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 dark:text-[#777] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
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
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:text-[#777] dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
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

        {/* Table Footer with Summary Breakdown */}
        <div className="px-5 py-3 border-t border-slate-200/80 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#0E0E0E] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-[#888] gap-2">
          <span>
            {t('users.showingCount', 'Menampilkan')}{' '}
            <strong className="font-mono text-slate-900 dark:text-white">{users.length}</strong>{' '}
            {t('users.of', 'dari')}{' '}
            <strong className="font-mono text-slate-900 dark:text-white">{totalCount}</strong>{' '}
            {t('users.accounts', 'akun')}
          </span>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            <span>{adminCount} Admins</span>
            <span>•</span>
            <span>{managementCount} Management</span>
            <span>•</span>
            <span>{fuelmanCount} Fuelmen</span>
          </div>
        </div>
      </div>

      {/* Modular Modals */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
        errorMessage={errorMessage}
      />

      <EditUserModal
        user={editingUser}
        currentUserId={currentUser?.id}
        onClose={() => setEditingUser(null)}
        onSubmit={(data) => {
          if (!editingUser) return;
          const payload: any = {
            fullName: data.fullName,
            email: data.email,
            role: data.role,
            isActive: data.isActive,
          };
          if (data.password && data.password.trim().length > 0) {
            payload.password = data.password;
          }
          updateMutation.mutate({ id: editingUser.id, payload });
        }}
        isPending={updateMutation.isPending}
        errorMessage={errorMessage}
      />

      <DeleteUserModal
        user={deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDeleteConfirm}
        onDeactivateInstead={() => {
          if (!deletingUser) return;
          toggleActiveMutation.mutate({ id: deletingUser.id, isActive: false });
          setDeletingUser(null);
        }}
        isPending={deleteMutation.isPending}
        errorMessage={errorMessage}
      />
    </div>
  );
}
