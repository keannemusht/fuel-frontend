'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Clock, FileSpreadsheet, Download, RefreshCw, ExternalLink, Menu, MapPin, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { SyncTelemetry } from '@/types';
import ProfileDropdown from './ProfileDropdown';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useSite } from '@/components/providers/SiteProvider';
import { toast } from 'react-toastify';

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export default function Header({ onOpenMobileMenu }: HeaderProps) {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const { site, setSite, siteLabel } = useSite();
  const [showSiteMenu, setShowSiteMenu] = useState(false);
  const siteMenuRef = useRef<HTMLDivElement>(null);

  const [witaTime, setWitaTime] = useState<string>('');
  const [wibTime, setWibTime] = useState<string>('');
  const [witaDate, setWitaDate] = useState<string>('');
  const [witaHour, setWitaHour] = useState<number>(8);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (siteMenuRef.current && !siteMenuRef.current.contains(e.target as Node)) {
        setShowSiteMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      toast.success(
        lang === 'id'
          ? 'Laporan log BBM Excel berhasil diunduh!'
          : 'Fuel log Excel report downloaded successfully!'
      );
    } catch (e: any) {
      toast.error(
        lang === 'id'
          ? 'Gagal mengunduh laporan log BBM Excel.'
          : 'Failed to download fuel log Excel report.'
      );
      console.error('Export error:', e);
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/85 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Menu Trigger + Clock */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 -ml-1 rounded-xl text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Dual Telemetry Clock Badge (WITA & WIB) */}
        <div className="flex items-center space-x-2 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 sm:px-3 py-1.5 rounded-full shadow-sm">
          <Clock className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0" />
          
          {/* Primary: WITA (Mining Site Operational Time) */}
          <div className="flex items-center space-x-1 font-mono">
            <span className="font-bold text-slate-900 dark:text-white">{witaTime || '00:00:00'}</span>
            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
              WITA
            </span>
          </div>

          {/* Secondary: WIB */}
          <span className="hidden lg:inline text-slate-300 dark:text-slate-700">|</span>
          <div className="hidden lg:flex items-center space-x-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            <span>{wibTime}</span>
            <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">WIB</span>
          </div>

          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
          <span className="hidden sm:inline text-slate-600 dark:text-slate-400">{witaDate}</span>
        </div>

        {/* Global Jobsite Filter Selector (Directly adjacent to WITA Clock) */}
        <div className="relative" ref={siteMenuRef}>
          <button
            onClick={() => setShowSiteMenu((prev) => !prev)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Filter Jobsite Operasional (Senyiur / Muara Pahu)"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="whitespace-nowrap">{siteLabel}</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showSiteMenu ? 'rotate-180' : ''}`} />
          </button>

          {showSiteMenu && (
            <div className="absolute left-0 top-full mt-2 w-52 rounded-2xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 shadow-xl py-1.5 z-50 animate-in fade-in duration-100">
              <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#777]">
                PILIH JOBSITE
              </div>
              <button
                onClick={() => { setSite('ALL'); setShowSiteMenu(false); }}
                className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between transition-colors ${site === 'ALL' ? 'bg-slate-100 dark:bg-white/10 font-bold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-[#888] hover:bg-slate-50 dark:hover:bg-white/5'}`}
              >
                <span>Semua Jobsite</span>
                {site === 'ALL' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              </button>
              <button
                onClick={() => { setSite('SENYIUR'); setShowSiteMenu(false); }}
                className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between transition-colors ${site === 'SENYIUR' ? 'bg-slate-100 dark:bg-white/10 font-bold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-[#888] hover:bg-slate-50 dark:hover:bg-white/5'}`}
              >
                <div className="flex flex-col">
                  <span>Site Senyiur</span>
                  <span className="text-[10px] text-slate-400 font-mono font-normal">Sloc: MTK001 (SNY)</span>
                </div>
                {site === 'SENYIUR' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              </button>
              <button
                onClick={() => { setSite('MUARA_PAHU'); setShowSiteMenu(false); }}
                className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between transition-colors ${site === 'MUARA_PAHU' ? 'bg-slate-100 dark:bg-white/10 font-bold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-[#888] hover:bg-slate-50 dark:hover:bg-white/5'}`}
              >
                <div className="flex flex-col">
                  <span>Site Muara Pahu</span>
                  <span className="text-[10px] text-slate-400 font-mono font-normal">Sloc: MTK003 (MPH)</span>
                </div>
                {site === 'MUARA_PAHU' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              </button>
            </div>
          )}
        </div>

        {/* Operational Shift (Driven by WITA Hours) */}
        <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-full">
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
