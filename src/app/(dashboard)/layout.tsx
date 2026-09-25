'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/shared/Sidebar';
import Header from '@/components/shared/Header';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();
  const { lang } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F4F6F9] dark:bg-black font-mono text-xs transition-colors duration-150">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-6 h-6 border-2 border-slate-300 dark:border-white/20 border-t-slate-800 dark:border-t-white rounded-full animate-spin" />
          <span className="text-slate-700 dark:text-[#888] tracking-widest uppercase font-medium">
            {lang === 'id' ? 'Memuat Telemetri...' : 'Loading Telemetry...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#000000] text-white selection:bg-white selection:text-black transition-colors duration-200">
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
