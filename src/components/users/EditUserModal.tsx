'use client';

import React, { useState, useEffect } from 'react';
import { User, Role } from '@/types';
import { Edit3, X, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import ModalPortal from '@/components/shared/ModalPortal';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface EditUserModalProps {
  user: User | null;
  currentUserId?: string;
  onClose: () => void;
  onSubmit: (formData: {
    fullName: string;
    email: string;
    password?: string;
    role: Role;
    isActive: boolean;
  }) => void;
  isPending: boolean;
  errorMessage: string | null;
}

export default function EditUserModal({
  user,
  currentUserId,
  onClose,
  onSubmit,
  isPending,
  errorMessage,
}: EditUserModalProps) {
  const { t, lang } = useLanguage();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'FUELMAN' as Role,
    isActive: true,
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        password: '',
        role: user.role,
        isActive: user.isActive,
      });
      setShowPassword(false);
    }
  }, [user]);

  if (!user) return null;

  const isSelf = currentUserId === user.id;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 w-screen h-screen z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-white border border-slate-200 dark:border-white/[0.12] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.06]">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-black flex items-center justify-center font-bold">
                <Edit3 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold">
                {t('users.editModalTitle')}: @{user.username}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-900 dark:text-[#666] dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-600 dark:text-[#888888] font-medium block mb-1">
                  {t('users.username')} ({lang === 'id' ? 'Tetap' : 'Fixed'})
                </label>
                <input
                  type="text"
                  disabled
                  value={user.username}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/[0.05] text-slate-500 dark:text-[#777] font-mono opacity-80 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-[#888888] font-medium block mb-1">
                  {t('users.systemRole')}
                </label>
                <select
                  value={formData.role}
                  disabled={isSelf}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#1A1A1A] border border-slate-300 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono focus:border-slate-500 dark:focus:border-white/30 focus:outline-none disabled:opacity-50"
                >
                  <option value="FUELMAN">FUELMAN ({lang === 'id' ? 'Operator' : 'Operator'})</option>
                  <option value="MANAGEMENT">
                    MANAGEMENT ({lang === 'id' ? 'Pengawas / Manajerial (Read-Only)' : 'Supervisor / Management (Read-Only)'})
                  </option>
                  <option value="ADMIN">ADMIN ({lang === 'id' ? 'Akses Penuh' : 'Full Control'})</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-600 dark:text-[#888888] font-medium block mb-1">
                {t('users.fullName')}
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#1A1A1A] border border-slate-300 dark:border-white/[0.1] text-slate-900 dark:text-white focus:border-slate-500 dark:focus:border-white/30 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-600 dark:text-[#888888] font-medium block mb-1">
                {t('users.emailAddress')}
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#1A1A1A] border border-slate-300 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono focus:border-slate-500 dark:focus:border-white/30 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-600 dark:text-[#888888] font-medium block">
                  {t('users.resetPassword')} <span className="text-slate-400 dark:text-[#555]">({t('users.optional')})</span>
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={t('users.leaveBlank')}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#1A1A1A] border border-slate-300 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono focus:border-slate-500 dark:focus:border-white/30 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-900 dark:text-[#666] dark:hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100 dark:bg-[#171717] border border-slate-200 dark:border-white/[0.06]">
              <div>
                <span className="font-medium block">{t('users.accountStatus')}</span>
                <span className="text-slate-500 dark:text-[#777] text-[11px]">
                  {isSelf
                    ? t('users.cannotDeactivateSelf')
                    : formData.isActive
                    ? t('users.activeDesc')
                    : t('users.inactiveDesc')}
                </span>
              </div>
              <button
                type="button"
                disabled={isSelf}
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 disabled:opacity-40 ${
                  formData.isActive ? 'bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    formData.isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] text-slate-600 dark:text-[#888888] hover:text-slate-900 dark:hover:text-white text-xs font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 rounded-full bg-slate-900 text-white dark:bg-white dark:text-black font-semibold text-xs hover:opacity-90 active:scale-95 transition-all shadow-xs"
              >
                {isPending ? t('common.saving') : (lang === 'id' ? 'Simpan Perubahan' : 'Save Changes')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}

