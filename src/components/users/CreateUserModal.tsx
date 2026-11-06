'use client';

import React, { useState } from 'react';
import { Role } from '@/types';
import { UserPlus, X, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import ModalPortal from '@/components/shared/ModalPortal';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: {
    username: string;
    fullName: string;
    email: string;
    password: string;
    role: Role;
    isActive: boolean;
  }) => void;
  isPending: boolean;
  errorMessage: string | null;
}

export default function CreateUserModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  errorMessage,
}: CreateUserModalProps) {
  const { t, lang } = useLanguage();
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    role: 'FUELMAN' as Role,
    isActive: true,
  });
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

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
                <UserPlus className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold">{t('users.createModalTitle')}</h3>
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
                  {t('users.username')}
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="e.g. fuelman_andi"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#1A1A1A] border border-slate-300 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono focus:border-slate-500 dark:focus:border-white/30 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-[#888888] font-medium block mb-1">
                  {t('users.systemRole')}
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#1A1A1A] border border-slate-300 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono focus:border-slate-500 dark:focus:border-white/30 focus:outline-none"
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
                placeholder="e.g. Andi Wijaya"
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
                placeholder="andi.wijaya@batara.co.id"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#1A1A1A] border border-slate-300 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono focus:border-slate-500 dark:focus:border-white/30 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-600 dark:text-[#888888] font-medium block mb-1">
                {t('users.initialPassword')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={lang === 'id' ? 'Min. 6 karakter' : 'Min. 6 characters'}
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
                  {formData.isActive ? t('users.activeDesc') : t('users.inactiveDesc')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${
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
                {isPending ? t('common.saving') : (lang === 'id' ? 'Daftarkan Pengguna' : 'Register User')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}

