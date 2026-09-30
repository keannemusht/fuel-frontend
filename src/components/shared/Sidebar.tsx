'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  Fuel,
  Truck,
  Database,
  ShieldCheck,
  Users,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  CalendarPlus,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { useLanguage } from '../providers/LanguageProvider';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('fms_sidebar_collapsed');
    if (saved === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('fms_sidebar_collapsed', String(next));
      return next;
    });
  };

  const navItems = [
    {
      name: t('nav.dashboard', 'Dashboard'),
      href: '/',
      icon: LayoutDashboard,
    },
    {
      name: t('nav.dispenser', 'Dispenser'),
      href: '/dispenser',
      icon: Fuel,
      allowedRoles: ['ADMIN', 'FUELMAN'],
    },
    {
      name: t('nav.history', 'Monthly History'),
      href: '/history',
      icon: CalendarClock,
      allowedRoles: ['ADMIN', 'MANAGEMENT'],
    },
    {
      name: t('nav.backdate', 'Backdate Input'),
      href: '/backdate',
      icon: CalendarPlus,
      allowedRoles: ['ADMIN', 'MANAGEMENT'],
    },
    {
      name: t('nav.units', 'Fleet Units'),
      href: '/units',
      icon: Truck,
      allowedRoles: ['ADMIN', 'MANAGEMENT'],
    },
    {
      name: t('nav.tanks', 'Storage Tanks'),
      href: '/tanks',
      icon: Database,
      allowedRoles: ['ADMIN', 'MANAGEMENT', 'FUELMAN'],
    },
    {
      name: t('nav.users', 'User Management'),
      href: '/users',
      icon: Users,
      allowedRoles: ['ADMIN'],
    },
    {
      name: t('nav.audit', 'Audit Trail'),
      href: '/audit',
      icon: ShieldCheck,
      allowedRoles: ['ADMIN', 'MANAGEMENT'],
    },
  ];

  const renderContent = (collapsed: boolean) => (
    <div className="flex flex-col justify-between h-full overflow-hidden">
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        {/* Brand Header */}
        <div
          className={`p-4 border-b border-slate-200 dark:border-white/[0.06] flex items-center ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 relative flex items-center justify-center shrink-0">
              <Image
                src="/img/BATARA.png"
                alt="Batara Logo"
                width={36}
                height={36}
                className="h-8 w-auto object-contain"
                priority
              />
            </div>
            {!collapsed && (
              <div className="truncate">
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white block leading-tight">
                  BATARA
                </span>
                <p className="text-[11px] text-slate-500 dark:text-[#888888] font-medium leading-tight mt-0.5">
                  Fuel System
                </p>
              </div>
            )}
          </div>

          {/* Close button for mobile drawer */}
          {onClose && !collapsed && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 dark:text-[#888888] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-3 mt-2 space-y-1 flex-1">
          {!collapsed && (
            <div className="text-[11px] font-medium text-slate-400 dark:text-[#666666] px-3 py-1.5 uppercase tracking-wider">
              {t('nav.menu', 'Menu')}
            </div>
          )}
          {navItems.map((item) => {
            if (item.allowedRoles && (!user?.role || !item.allowedRoles.includes(user.role))) {
              return null;
            }
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <a
                key={item.name}
                href={item.href}
                onClick={onClose}
                title={collapsed ? item.name : undefined}
                className={`group flex items-center ${
                  collapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-3'
                } rounded-2xl text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'fms-nav-active bg-slate-900 !text-white dark:bg-white/[0.08] dark:!text-white border border-slate-900 dark:border-white/[0.12] shadow-sm font-semibold'
                    : 'fms-nav-inactive text-slate-600 dark:text-[#888888] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? '!text-white'
                        : 'text-slate-500 dark:text-[#666666] group-hover:text-slate-900 dark:group-hover:text-white'
                    }`}
                  />
                  {!collapsed && (
                    <span className={isActive ? '!text-white font-semibold' : ''}>
                      {item.name}
                    </span>
                  )}
                </div>
              </a>
            );
          })}
        </nav>
      </div>

      {/* Footer: Pure Logout Only */}
      <div className="p-3 border-t border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-transparent">
        {collapsed ? (
          <div className="flex justify-center">
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/15 text-rose-500 dark:text-rose-400 transition-all active:scale-95 flex items-center justify-center"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className="w-full group flex items-center justify-center space-x-2 px-4 py-2.5 rounded-2xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/15 text-rose-500 dark:text-rose-400 text-xs font-semibold transition-all active:scale-95 shadow-sm"
          >
            <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>{t('profile.signOut', 'Sign Out')}</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar with Collapsible Slider */}
      <aside
        className={`hidden lg:flex relative bg-white dark:bg-[#000000] border-r border-slate-200 dark:border-white/[0.08] flex-col justify-between shrink-0 h-screen sticky top-0 z-40 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        {/* Slider Handle Button (Floating on sidebar border) */}
        <button
          onClick={toggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="hidden lg:flex items-center justify-center absolute -right-3.5 top-6 w-7 h-7 rounded-full bg-white dark:bg-[#1A1A1A] text-slate-700 dark:text-white border border-slate-300 dark:border-white/20 shadow-md hover:scale-110 active:scale-95 transition-all z-50 cursor-pointer"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>

        {renderContent(isCollapsed)}
      </aside>

      {/* Mobile Slide-over Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Mobile Slide-over Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-[#000000] border-r border-slate-200 dark:border-white/[0.08] z-50 lg:hidden transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderContent(false)}
      </aside>
    </>
  );
}
