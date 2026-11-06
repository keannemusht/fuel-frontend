'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/shared/Sidebar';
import Header from '@/components/shared/Header';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();
  const { lang, mounted } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F4F6F9] dark:bg-slate-950 font-mono text-xs transition-colors duration-150">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-6 h-6 border-2 border-slate-300 dark:border-slate-700 border-t-slate-800 dark:border-t-slate-200 rounded-full animate-spin" />
          <span
            suppressHydrationWarning
            className="text-slate-700 dark:text-slate-400 tracking-widest uppercase font-medium"
          >
            Loading Telemetry...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F4F6F9] dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-slate-900 selection:text-white dark:selection:bg-slate-100 dark:selection:text-slate-900 transition-colors duration-200">
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-[1700px] w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
