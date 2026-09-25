'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'react-toastify';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const hydrateAuth = async () => {
      try {
        const storedToken = localStorage.getItem('fms_access_token');
        const storedUser = localStorage.getItem('fms_user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Verify token against backend in background
          try {
            const res = await api.get('/auth/me');
            if (res.data.success && res.data.data) {
              setUser(res.data.data);
              localStorage.setItem('fms_user', JSON.stringify(res.data.data));
            }
          } catch (err: any) {
            console.warn('Session verification fallback:', err.message);
          }
        } else if (!pathname.includes('/login')) {
          router.push('/login');
        }
      } catch (e) {
        console.error('Auth hydration error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    hydrateAuth();
  }, [pathname, router]);

  const login = (userData: User, accessToken: string, refreshToken: string) => {
    setUser(userData);
    setToken(accessToken);
    localStorage.setItem('fms_access_token', accessToken);
    localStorage.setItem('fms_refresh_token', refreshToken);
    localStorage.setItem('fms_user', JSON.stringify(userData));
    router.push('/dispenser');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('fms_access_token');
    localStorage.removeItem('fms_refresh_token');
    localStorage.removeItem('fms_user');
    toast.info('Sesi telah berakhir. Anda berhasil keluar.');
    router.push('/login');
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
