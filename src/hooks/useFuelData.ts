'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Unit,
  StorageTank,
  ShiftSummary,
  SyncTelemetry,
  FuelLog,
  User,
  AuditLog,
  StockTransfer,
} from '@/types';

// ==========================================
// TANKS HOOKS
// ==========================================
export function useTanks() {
  return useQuery<StorageTank[]>({
    queryKey: ['tanks'],
    queryFn: async () => {
      const res = await api.get('/tanks');
      return res.data.data;
    },
    staleTime: 30000,
  });
}

// ==========================================
// UNITS HOOKS
// ==========================================
export function useUnits(search?: string, category?: string) {
  return useQuery<Unit[]>({
    queryKey: ['units', search, category],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      const res = await api.get(`/units?${params.toString()}`);
      return res.data.data;
    },
    staleTime: 60000,
  });
}

// ==========================================
// SHIFT SUMMARY HOOKS
// ==========================================
export function useShiftSummary(dateStr?: string, shift?: string, site?: string) {
  return useQuery<ShiftSummary>({
    queryKey: ['shiftSummary', dateStr, shift, site],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateStr) params.append('dateStr', dateStr);
      if (shift) params.append('shift', shift);
      if (site && site !== 'ALL') params.append('site', site);
      const res = await api.get(`/fuel/summary?${params.toString()}`);
      return res.data.data;
    },
    refetchInterval: 15000,
  });
}

// ==========================================
// GOOGLE SHEETS SYNC STATUS HOOKS
// ==========================================
export function useSyncTelemetry() {
  return useQuery<SyncTelemetry>({
    queryKey: ['sync-status'],
    queryFn: async () => {
      const res = await api.get('/sync/status');
      return res.data.data;
    },
    refetchInterval: 20000,
  });
}

// ==========================================
// FUEL LOGS HOOKS
// ==========================================
export function useFuelLogs(options: {
  page?: number;
  limit?: number;
  unitCode?: string;
  dateStr?: string;
  shift?: string;
  site?: string;
} = {}) {
  const { page = 1, limit = 10, unitCode, dateStr, shift, site } = options;

  return useQuery<{ fuelLogs: FuelLog[]; total: number; totalPages: number }>({
    queryKey: ['fuelLogs', page, limit, unitCode, dateStr, shift, site],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (unitCode) params.append('unitCode', unitCode);
      if (dateStr) params.append('dateStr', dateStr);
      if (shift) params.append('shift', shift);
      if (site && site !== 'ALL') params.append('site', site);

      const res = await api.get(`/fuel/logs?${params.toString()}`);
      const raw = res.data.data;

      if (Array.isArray(raw)) {
        return { fuelLogs: raw, total: raw.length, totalPages: 1 };
      }
      return {
        fuelLogs: raw?.fuelLogs || raw?.data || [],
        total: raw?.total || (raw?.fuelLogs?.length ?? 0),
        totalPages: raw?.totalPages || 1,
      };
    },
    refetchInterval: 15000,
  });
}

// ==========================================
// OPERATORS HOOKS
// ==========================================
export function useOperators() {
  return useQuery<string[]>({
    queryKey: ['operators'],
    queryFn: async () => {
      const res = await api.get('/fuel/operators');
      return res.data.data || [];
    },
    staleTime: 60000,
  });
}

// ==========================================
// USERS HOOKS
// ==========================================
export function useUsers(query: { search?: string; role?: string; isActive?: string } = {}) {
  return useQuery<User[]>({
    queryKey: ['users', query.search, query.role, query.isActive],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query.search) params.append('search', query.search);
      if (query.role) params.append('role', query.role);
      if (query.isActive !== undefined) params.append('isActive', query.isActive);

      const res = await api.get(`/users?${params.toString()}`);
      return res.data.data || [];
    },
    staleTime: 30000,
  });
}

// ==========================================
// AUDIT LOGS HOOKS
// ==========================================
export function useAuditLogs(options: {
  page?: number;
  limit?: number;
  action?: string;
  entity?: string;
  userId?: string;
} = {}) {
  const { page = 1, limit = 20, action, entity, userId } = options;

  return useQuery<{ logs: AuditLog[]; total: number; totalPages: number }>({
    queryKey: ['auditLogs', page, limit, action, entity, userId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (action) params.append('action', action);
      if (entity) params.append('entity', entity);
      if (userId) params.append('userId', userId);

      const res = await api.get(`/audit?${params.toString()}`);
      return res.data.data;
    },
  });
}

