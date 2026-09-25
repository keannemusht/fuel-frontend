'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { Globe, Moon, Sun, LogOut, ChevronDown } from 'lucide-react';

export default function ProfileDropdown() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute initials (e.g. "Kemal Musthafa Rajabi" -> "KM", "Admin" -> "AD")
  const getInitials = (name?: string) => {
    if (!name) return 'KM';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const displayName = user?.fullName || user?.username || 'Kemal Musthafa Rajabi';
  const initials = getInitials(displayName);
  const subtitle =
    user?.role === 'ADMIN'
      ? (lang === 'id' ? 'Akses Penuh' : 'Full Access')
      : user?.role === 'MANAGEMENT'
      ? (lang === 'id' ? 'Pengawas / Manajemen' : 'Management')
      : lang === 'id'
      ? 'Petugas Lapangan'
      : 'Site Fuelman';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 1. Trigger Button matching exact target style */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center space-x-2.5 px-2.5 py-1.5 rounded-xl bg-slate-50/80 hover:bg-slate-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/10 transition-all cursor-pointer shadow-xs active:scale-98"
        aria-label="User Profile Menu"
      >
        {/* Plum/Magenta Circle Avatar */}
        <div className="w-8 h-8 rounded-full bg-[#8C2B6A] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 tracking-wide">
          <span>{initials}</span>
        </div>

        {/* Name & Role (Desktop) */}
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[130px]">
            {displayName}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-[#888] leading-tight">
            {subtitle}
          </span>
        </div>

        {/* Chevron Indicator */}
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-600 dark:text-slate-300 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* 2. Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 shadow-xl p-3.5 z-50 text-slate-900 dark:text-white transition-all">
          {/* Header: User Full Name & Access Level */}
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              {displayName}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-[#888]">
              {subtitle}
            </p>
          </div>

          {/* Thin Divider */}
          <div className="border-t border-slate-200/90 dark:border-white/[0.08] my-3" />

          {/* Row 1: Bahasa Switcher */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-200 text-xs">
              <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
              <span className="font-normal">{t('profile.languageLabel', 'Bahasa')}</span>
            </div>

            {/* Segmented Pill ID / EN */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setLang('id')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  lang === 'id'
                    ? 'bg-white dark:bg-[#222] text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-white/10'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
                }`}
              >
                ID
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  lang === 'en'
                    ? 'bg-white dark:bg-[#222] text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-white/10'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          {/* Row 2: Tema / Theme Switcher */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-200 text-xs">
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500 shrink-0" />
              )}
              <span className="font-normal">{t('profile.themeLabel', 'Tema')}</span>
            </div>

            {/* Segmented Pill Light / Dark */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white dark:bg-[#222] text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-white/10'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
                }`}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-white dark:bg-[#222] text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-white/10'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
                }`}
              >
                Dark
              </button>
            </div>
          </div>

          {/* Thin Divider */}
          <div className="border-t border-slate-200/90 dark:border-white/[0.08] my-3" />

          {/* Row 3: Logout Action */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
            className="w-full flex items-center space-x-2 text-xs font-medium text-[#B91C1C] hover:text-[#991B1B] dark:text-rose-400 dark:hover:text-rose-300 transition-colors py-1 cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0 text-[#B91C1C] dark:text-rose-400" />
            <span>{t('profile.logoutLabel', 'Keluar')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
