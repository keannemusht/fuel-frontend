'use client';

import React, { useState, useEffect } from 'react';
import { Clock, FileSpreadsheet, Download, RefreshCw, ExternalLink, Menu } from 'lucide-react';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { SyncTelemetry } from '@/types';
import ProfileDropdown from './ProfileDropdown';
import { useAuth } from '@/components/providers/AuthProvider';
import { toast } from 'react-toastify';

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export default function Header({ onOpenMobileMenu }: HeaderProps) {
  const { user } = useAuth();
  const [witaTime, setWitaTime] = useState<string>('');
  const [wibTime, setWibTime] = useState<string>('');
  const [witaDate, setWitaDate] = useState<string>('');
  const [witaHour, setWitaHour] = useState<number>(8);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      // WITA Time (Asia/Makassar, UTC+8)
      try {
        setWitaTime(
          now.toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Makassar',
            hour12: false,
          })
        );
        setWitaDate(
          now.toLocaleDateString('en-US', {
            timeZone: 'Asia/Makassar',
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })
        );
        const witaHourStr = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Makassar',
          hour: 'numeric',
          hour12: false,
        }).format(now);
        setWitaHour(parseInt(witaHourStr, 10));
      } catch {
        const utcHour = now.getUTCHours();
        const calcHour = (utcHour + 8) % 24;
        setWitaHour(calcHour);
        setWitaTime(now.toTimeString().split(' ')[0]);
        setWitaDate(
          now.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })
        );
      }

      // WIB Time (Asia/Jakarta, UTC+7)
      try {
        setWibTime(
          now.toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Jakarta',
            hour12: false,
          })
        );
      } catch {
        setWibTime(now.toTimeString().split(' ')[0]);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentShift = witaHour >= 6 && witaHour < 18 ? 'Shift 1' : 'Shift 2';

  const { data: syncData, refetch: refetchSync } = useQuery<SyncTelemetry>({
    queryKey: ['sync-status'],
    queryFn: async () => {
      const res = await api.get('/sync/status');
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  const handleExportExcel = async () => {
    try {
      const res = await api.get('/excel/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BATARA_FUEL_LOG_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Laporan log BBM Excel berhasil diunduh!');
    } catch (e: any) {
      toast.error('Gagal mengunduh laporan log BBM Excel.');
      console.error('Export error:', e);
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-white/[0.08] bg-white/70 dark:bg-black/70 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Menu Trigger + Clock */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 -ml-1 rounded-xl text-slate-700 dark:text-white/80 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Dual Telemetry Clock Badge (WITA & WIB) */}
        <div className="flex items-center space-x-2 text-[11px] sm:text-xs text-slate-600 dark:text-[#888888] bg-slate-100 dark:bg-[#0E0E0E] border border-slate-200 dark:border-white/[0.08] px-2.5 sm:px-3 py-1.5 rounded-full shadow-sm">
          <Clock className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0" />
          
          {/* Primary: WITA (Mining Site Operational Time) */}
          <div className="flex items-center space-x-1 font-mono">
            <span className="font-bold text-slate-900 dark:text-white">{witaTime || '00:00:00'}</span>
            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
              WITA
            </span>
          </div>

          {/* Secondary: WIB */}
          <span className="hidden lg:inline text-slate-300 dark:text-white/20">|</span>
          <div className="hidden lg:flex items-center space-x-1 font-mono text-[11px] text-slate-500 dark:text-[#888]">
            <span>{wibTime}</span>
            <span className="text-[9px] font-semibold text-slate-400 dark:text-[#666]">WIB</span>
          </div>

          <span className="hidden sm:inline text-slate-300 dark:text-white/20">•</span>
          <span className="hidden sm:inline text-slate-600 dark:text-[#999]">{witaDate}</span>
        </div>

        {/* Operational Shift (Driven by WITA Hours) */}
        <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-600 dark:text-[#888888] bg-slate-100 dark:bg-[#0E0E0E] border border-slate-200 dark:border-white/[0.08] px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium text-slate-900 dark:text-white">{currentShift}</span>
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-medium">(WITA)</span>
        </div>
      </div>

      {/* Right: Profile Menu Dropdown */}
      <div className="flex items-center">
        <ProfileDropdown />
      </div>
    </header>
  );
}
