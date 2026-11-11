'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  getPendingOfflineCount,
  flushOfflineQueue,
  getOfflineQueue,
  OfflineDispenseRecord,
} from '@/lib/offlineQueue';
import { toast } from 'react-toastify';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface OfflineSyncContextType {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  offlineQueue: OfflineDispenseRecord[];
  flushQueue: () => Promise<void>;
  refreshQueue: () => Promise<void>;
}

const OfflineSyncContext = createContext<OfflineSyncContextType>({
  isOnline: true,
  pendingCount: 0,
  isSyncing: false,
  offlineQueue: [],
  flushQueue: async () => {},
  refreshQueue: async () => {},
});

export const useOfflineSync = () => useContext(OfflineSyncContext);

export default function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [offlineQueue, setOfflineQueue] = useState<OfflineDispenseRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showQueueModal, setShowQueueModal] = useState<boolean>(false);

  const refreshQueue = useCallback(async () => {
    try {
      const queue = await getOfflineQueue();
      setOfflineQueue(queue);
      const pending = queue.filter((i) => i.status === 'PENDING' || i.status === 'FAILED').length;
      setPendingCount(pending);
    } catch {
      // Ignore if IndexedDB is not accessible
    }
  }, []);

  const flushQueue = useCallback(async () => {
    if (isSyncing) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.warning('Perangkat masih offline. Sinkronisasi akan otomatis berjalan saat sinyal kembali.');
      return;
    }

    setIsSyncing(true);
    try {
      const res = await flushOfflineQueue(api);
      if (res.synced > 0) {
        toast.success(`Berhasil menyinkronkan ${res.synced} transaksi offline ke database server!`);
        // Refresh server query caches
        queryClient.invalidateQueries({ queryKey: ['fuelLogs'] });
        queryClient.invalidateQueries({ queryKey: ['shiftSummary'] });
        queryClient.invalidateQueries({ queryKey: ['units'] });
        queryClient.invalidateQueries({ queryKey: ['tanks'] });
        queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      }
      if (res.failed > 0) {
        toast.error(`${res.failed} transaksi gagal divalidasi server. Periksa rincian antrean.`);
      }
    } catch (err: any) {
      console.error('Offline queue flush error:', err);
    } finally {
      setIsSyncing(false);
      await refreshQueue();
    }
  }, [isSyncing, queryClient, refreshQueue]);

  // 1. Initialize Network listeners & Service Worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    refreshQueue();

    // Register Service Worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    }

    const handleOnline = () => {
      setIsOnline(true);
      toast.info('Sinyal online terhubung kembali. Memeriksa antrean sinkronisasi...', {
        autoClose: 4000,
        icon: <Wifi className="w-4 h-4 text-emerald-500" />,
      });
      flushQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warn('Perangkat beralih ke Mode Offline. Transaksi pengisian akan tersimpan aman di perangkat.', {
        autoClose: 6000,
        icon: <WifiOff className="w-4 h-4 text-amber-500" />,
      });
      refreshQueue();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check every 15 seconds if items are pending and online
    const interval = setInterval(() => {
      refreshQueue();
      if (navigator.onLine && pendingCount > 0 && !isSyncing) {
        flushQueue();
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [flushQueue, isSyncing, pendingCount, refreshQueue]);

  return (
    <OfflineSyncContext.Provider
      value={{
        isOnline,
        pendingCount,
        isSyncing,
        offlineQueue,
        flushQueue,
        refreshQueue,
      }}
    >
      {children}

      {/* Persistent Floating Indicator when Offline or when Pending Transactions exist */}
      {(!isOnline || pendingCount > 0) && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
          <div
            onClick={() => setShowQueueModal(true)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl shadow-xl border cursor-pointer select-none transition-all duration-300 backdrop-blur-xl ${
              !isOnline
                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                : pendingCount > 0
                ? 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/25'
                : 'bg-slate-900/90 text-white border-slate-700'
            }`}
            title="Klik untuk melihat antrean pengisian offline"
          >
            {!isOnline ? (
              <WifiOff className="w-4 h-4 text-amber-500 animate-pulse" />
            ) : (
              <Wifi className="w-4 h-4 text-emerald-500" />
            )}

            <span className="text-xs font-semibold">
              {!isOnline
                ? `Mode Offline (${pendingCount} antrean)`
                : `Menyinkronkan (${pendingCount} antrean)`}
            </span>

            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400 ml-1" />
            ) : isOnline && pendingCount > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  flushQueue();
                }}
                className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors ml-1"
              >
                Sync
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* Simple Details Modal for Offline Queue */}
      {showQueueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    !isOnline ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                  }`}
                >
                  {!isOnline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Antrean Pengisian Offline (PWA)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Status: {isOnline ? 'Online (Terhubung)' : 'Offline (Tersimpan Lokal)'} • {pendingCount} Pending
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQueueModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {offlineQueue.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Tidak ada transaksi yang tertunda di perangkat ini.
                </div>
              ) : (
                offlineQueue.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {item.unitCode}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {item.volumeLiters} L
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            item.status === 'FAILED'
                              ? 'bg-rose-500/15 text-rose-500'
                              : item.status === 'SYNCING'
                              ? 'bg-blue-500/15 text-blue-500'
                              : 'bg-amber-500/15 text-amber-600'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {item.dateStr} {item.jamStr} • {item.operator || 'Driver'} • {item.shift}
                      </p>
                      {item.lastError && (
                        <p className="text-[10px] text-rose-500 mt-1 font-mono">{item.lastError}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-slate-400">
                Data akan terkirim otomatis saat perangkat kembali bersinyal.
              </span>
              <div className="flex items-center gap-2">
                {isOnline && pendingCount > 0 && (
                  <button
                    type="button"
                    onClick={flushQueue}
                    disabled={isSyncing}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isSyncing ? 'Sinkronisasi...' : 'Sinkronkan Sekarang'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowQueueModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </OfflineSyncContext.Provider>
  );
}
