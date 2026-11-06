'use client';

import React from 'react';
import { User } from '@/types';
import { Trash2, AlertTriangle } from 'lucide-react';
import ModalPortal from '@/components/shared/ModalPortal';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface DeleteUserModalProps {
  user: User | null;
  onClose: () => void;
  onConfirm: () => void;
  onDeactivateInstead?: () => void;
  isPending: boolean;
  errorMessage: string | null;
}

export default function DeleteUserModal({
  user,
  onClose,
  onConfirm,
  onDeactivateInstead,
  isPending,
  errorMessage,
}: DeleteUserModalProps) {
  const { t, lang } = useLanguage();

  if (!user) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 w-screen h-screen z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-[#121212] border border-rose-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-900 dark:text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('users.deleteUser')}</h3>
              <p className="text-xs text-slate-500 dark:text-[#888888]">
                @{user.username} ({user.fullName})
              </p>
            </div>
          </div>

          {errorMessage ? (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs space-y-2">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              {onDeactivateInstead && (
                <div className="pt-2 border-t border-rose-500/20 flex justify-end">
                  <button
                    onClick={onDeactivateInstead}
                    className="px-3 py-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] font-medium transition-colors"
                  >
                    {t('users.deactivateInstead')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-600 dark:text-[#999999] leading-relaxed">
              {t('users.deleteConfirm')}
              {(user._count?.fuelLogs || 0) > 0 && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400 font-medium">
                  {t('users.deleteWarningHasLogs')}
                </span>
              )}
            </p>
          )}

          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#888888] hover:text-slate-900 dark:hover:text-white text-xs font-medium transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className="px-5 py-2 rounded-full bg-rose-600 text-white font-semibold text-xs hover:bg-rose-500 active:scale-95 transition-all shadow-xs"
            >
              {isPending ? (lang === 'id' ? 'Menghapus...' : 'Deleting...') : t('users.confirmDelete')}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

