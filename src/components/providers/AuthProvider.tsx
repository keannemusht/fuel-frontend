'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User } from '@/types';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'react-toastify';
import { useLanguage } from './LanguageProvider';

// Default idle timeout: 15 minutes of user inactivity triggers safe auto-logout
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const ACTIVITY_THROTTLE_MS = 10 * 1000; // Update activity at most once every 10s

export type LogoutMessage = string | { id: string; en: string } | any;

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: (customMessage?: LogoutMessage) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { lang, t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const lastActivityRef = useRef<number>(Date.now());

  // Safe Logout with Server Revocation Notification
  const logout = useCallback(
    async (customMessage?: LogoutMessage) => {
      try {
        const storedRefreshToken = localStorage.getItem('fms_refresh_token');
        // Notify backend to blacklist token immediately
        await api.post('/auth/logout', { refreshToken: storedRefreshToken }).catch(() => {});
      } catch {
        // Ignore network errors on logout
      } finally {
        setUser(null);
        setToken(null);
        localStorage.removeItem('fms_access_token');
        localStorage.removeItem('fms_refresh_token');
        localStorage.removeItem('fms_user');
        localStorage.removeItem('fms_last_activity');

        // Determine effective language safely
        const effectiveLang =
          (typeof window !== 'undefined' ? (localStorage.getItem('fms_lang') as 'id' | 'en') : null) ||
          lang ||
          'id';

        if (
          customMessage &&
          typeof customMessage === 'object' &&
          !('nativeEvent' in customMessage) &&
          ('id' in customMessage || 'en' in customMessage)
        ) {
          const msg = customMessage[effectiveLang] || customMessage.id || customMessage.en;
          toast.warn(msg);
        } else if (typeof customMessage === 'string' && customMessage.trim()) {
          toast.warn(customMessage);
        } else {
          toast.info(
            effectiveLang === 'en'
              ? 'Session ended. You have been signed out.'
              : 'Sesi telah berakhir. Anda berhasil keluar.'
          );
        }

        router.push('/login');
      }
    },
    [router, lang]
  );

  // 1. Initial Authentication Hydration (Runs only once on mount)
  useEffect(() => {
    let isMounted = true;

    const hydrateAuth = async () => {
      try {
        const storedToken = localStorage.getItem('fms_access_token');
        const storedUser = localStorage.getItem('fms_user');

        if (storedToken && storedUser) {
          if (isMounted) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            lastActivityRef.current = Date.now();
            localStorage.setItem('fms_last_activity', String(Date.now()));
          }

          // Background validation to ensure account is not deactivated
          try {
            const res = await api.get('/auth/me');
            if (res.data?.success && res.data?.data && isMounted) {
              setUser(res.data.data);
              localStorage.setItem('fms_user', JSON.stringify(res.data.data));
            }
          } catch (err: any) {
            // If 401 or user was deactivated, log out immediately
            if (err.response?.status === 401 || err.response?.status === 403) {
              logout({
                id: 'Sesi login tidak valid atau telah berakhir.',
                en: 'Your login session is invalid or has expired.',
              });
              return;
            }
          }
        }
      } catch (e) {
        console.error('Auth hydration error:', e);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    hydrateAuth();

    return () => {
      isMounted = false;
    };
  }, [logout]);

  // 2. Client-Side Route Protection Guard
  useEffect(() => {
    if (!isLoading && !user && !pathname.includes('/login')) {
      router.push('/login');
    }
  }, [isLoading, user, pathname, router]);

  // 3. User Activity & Inactivity (Idle Timeout) Monitoring
  useEffect(() => {
    if (!user) return;

    // Track user input across all interactions (throttled to avoid CPU overhead)
    let lastRecord = Date.now();
    const recordUserActivity = () => {
      const now = Date.now();
      if (now - lastRecord > ACTIVITY_THROTTLE_MS) {
        lastRecord = now;
        lastActivityRef.current = now;
        localStorage.setItem('fms_last_activity', String(now));
      }
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, recordUserActivity, { passive: true });
    });

    // Heartbeat check every 20 seconds for inactivity
    const intervalTimer = setInterval(() => {
      const storedLastActivity = Number(localStorage.getItem('fms_last_activity')) || lastActivityRef.current;
      const idleTime = Date.now() - storedLastActivity;

      if (idleTime >= IDLE_TIMEOUT_MS) {
        logout({
          id: 'Sesi Anda telah berakhir otomatis demi keamanan karena tidak ada aktivitas selama 15 menit. Silakan masuk kembali.',
          en: 'Your session has expired automatically due to 15 minutes of inactivity for your security. Please sign in again.',
        });
      }
    }, 20 * 1000);

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, recordUserActivity);
      });
      clearInterval(intervalTimer);
    };
  }, [user, logout]);

  const login = (userData: User, accessToken: string, refreshToken: string) => {
    setUser(userData);
    setToken(accessToken);
    const now = Date.now();
    lastActivityRef.current = now;
    localStorage.setItem('fms_access_token', accessToken);
    localStorage.setItem('fms_refresh_token', refreshToken);
    localStorage.setItem('fms_user', JSON.stringify(userData));
    localStorage.setItem('fms_last_activity', String(now));
    router.push('/dispenser');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
