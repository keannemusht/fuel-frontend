'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useSite } from '@/components/providers/SiteProvider';
import { Fuel } from 'lucide-react';

export default function DashboardHeader() {
  const { t } = useLanguage();
  const { siteLabel } = useSite();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-white/[0.08]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
            <Fuel className="w-5 h-5 sm:w-6 sm:h-6 text-slate-800 dark:text-white shrink-0" />
            <span>{t('dash.title', 'Dashboard Operasional Bahan Bakar')}</span>
          </h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-medium bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-white/[0.06]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{t('dash.liveTelemetry', 'Telemetri Aktif')}</span>
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-[#888] mt-1">
          PT Batara Perkasa • <strong className="text-slate-700 dark:text-slate-200">{siteLabel}</strong> &mdash;{' '}
          {t('dash.subtitle', 'Monitoring Inventori Solar B35, Konsumsi Armada, & Sinkronisasi Site')}
        </p>
      </div>

      {/* Action Controls Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Primary CTA: Terminal Dispenser */}
        <Link
          href="/dispenser"
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-black hover:opacity-90 transition-all shadow-xs cursor-pointer"
        >
          <Fuel className="w-4 h-4 shrink-0" />
          <span>{t('dash.recordDispense', 'Catat Pengisian (Dispenser)')}</span>
        </Link>
      </div>
    </div>
  );
}

