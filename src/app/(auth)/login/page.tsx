'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { api } from '@/lib/api';
import { Lock, User, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';

export default function LoginPage() {
  const { login } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      const emptyMsg = lang === 'id' ? 'Silakan lengkapi username dan password.' : 'Please enter both username and password.';
      setError(emptyMsg);
      toast.warning(emptyMsg);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      const { user, tokens } = res.data.data;
      toast.success(lang === 'id' ? `Login berhasil! Selamat datang, ${user.fullName || user.username}` : `Login successful! Welcome, ${user.fullName || user.username}`);
      login(user, tokens.accessToken, tokens.refreshToken);
    } catch (err: any) {
      const msg = err.response?.data?.message || (lang === 'id' ? 'Autentikasi gagal. Periksa username dan password.' : 'Authentication failed. Please verify credentials.');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F4F6F9] dark:bg-black transition-colors duration-200">
      {/* ========================================================================= */}
      {/* LEFT SECTION: Site Photo Showcase (/img/loginpage.jpg)                    */}
      {/* ========================================================================= */}
      <div className="hidden lg:block lg:w-1/2 xl:w-[54%] relative overflow-hidden border-r border-slate-200/10 dark:border-white/[0.08]">
        <Image
          src="/img/loginpage.jpg"
          alt="Batara Mining Fuel Operation Site"
          fill
          className="object-cover object-center"
          priority
          sizes="55vw"
        />

        {/* 30% Dark Fade Overlay */}
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />

        {/* Top-Left Corporate Logo */}
        <div className="absolute top-8 left-8 xl:top-9 xl:left-9 z-10">
          <Image
            src="/img/bbp_logo_202409_LeftAligment.png"
            alt="PT Batara Dharma Persada"
            width={280}
            height={95}
            className="h-12 sm:h-14 lg:h-15 xl:h-16 w-auto object-contain"
            priority
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT SECTION: Login Form Panel                                           */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-1/2 xl:w-[46%] flex flex-col justify-between p-6 sm:p-10 lg:p-14 bg-white dark:bg-[#090909] text-slate-900 dark:text-white transition-colors duration-200">
        {/* Top Header & Language Switcher */}
        <div className="flex items-center justify-between w-full">
          {/* Mobile brand indicator (visible only when left banner is hidden) */}
          <div className="flex lg:hidden items-center space-x-2.5">
            <div className="h-9 relative flex items-center justify-center">
              <Image
                src="/img/bbp_logo_202409_LeftAligment.png"
                alt="PT Batara Dharma Persada"
                width={180}
                height={55}
                className="h-8 w-auto object-contain"
                priority
              />
            </div>
          </div>

          {/* Language Switcher */}
          <div className="ml-auto flex items-center bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-full p-0.5 text-[11px] font-mono shadow-sm">
            <button
              type="button"
              onClick={() => setLang('id')}
              className={`px-3 py-1 rounded-full transition-all ${
                lang === 'id'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-bold shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white'
              }`}
            >
              ID
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded-full transition-all ${
                lang === 'en'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-bold shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Center Login Form Container */}
        <div className="max-w-sm w-full mx-auto my-auto py-8 space-y-6">
          {/* Logo & Headline */}
          <div className="space-y-3">
            <div className="relative">
              <Image
                src="/img/BATARA.png"
                alt="Batara Logo"
                width={36}
                height={54}
                className="h-12 w-auto object-contain"
                priority
              />
            </div>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {lang === 'id' ? 'Masuk ke Sistem' : 'Sign in to Terminal'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-[#888888] mt-1 leading-relaxed">
                {t('login.subtitle')}
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs flex items-center space-x-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>{t('login.username')}</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={lang === 'id' ? 'Masukkan username' : 'Enter username'}
                className="w-full text-xs font-mono px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#666] focus:bg-white dark:focus:bg-[#161616] focus:border-slate-900 dark:focus:border-white/40 focus:outline-none transition-all shadow-sm"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>{t('login.password')}</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={lang === 'id' ? 'Masukkan password' : 'Enter password'}
                  className="w-full text-xs font-mono pl-4 pr-11 py-3 rounded-2xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#666] focus:bg-white dark:focus:bg-[#161616] focus:border-slate-900 dark:focus:border-white/40 focus:outline-none transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-[#EAEAEA] dark:text-black font-semibold text-xs tracking-wider uppercase transition-all shadow-md hover:shadow-lg active:scale-[0.99] flex items-center justify-center space-x-2 disabled:opacity-50 mt-2 text-white-forced"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" />
                  <span>{t('login.authenticating')}</span>
                </div>
              ) : (
                <>
                  <span>{t('login.signIn')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="pt-6 border-t border-slate-100 dark:border-white/[0.06] text-center">
          <p className="text-[11px] text-slate-400 dark:text-[#666666] font-mono">
            &copy; {new Date().getFullYear()} PT Batara Fuel System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
