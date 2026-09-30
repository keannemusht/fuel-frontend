export type Role = 'ADMIN' | 'FUELMAN' | 'MANAGEMENT';

export type UnitCategory =
  | 'PRODUKSI'
  | 'SUPPORT'
  | 'CONTRACTOR'
  | 'PLANT SERVICE'
  | 'PENGISIAN'
  | 'SALDO AWAL'
  | string;

export type VehicleType =
  | 'DOUBLE_TRAILER'
  | 'DUMP_TRUCK'
  | 'SUPPORT_VEHICLE'
  | 'LIGHT_VEHICLE'
  | 'HEAVY_EQUIPMENT'
  | 'EXCAVATOR'
  | 'GENERATOR'
  | 'STORAGE_TANK'
  | string;

export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    fuelLogs: number;
    auditLogs: number;
  };
}

export interface Unit {
  id: string;
  unitCode: string;
  plateNumber: string | null;
  category: string;
  type: string;
  makeModel?: string | null;
  lastKm: number;
  lastHm: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StorageTank {
  id: string;
  tankCode: string;
  name: string;
  capacityLiters: number;
  currentStockLiters: number;
  minStockAlertLiters: number;
  fuelType: string;
}

export interface FuelLog {
  id: string;
  logNumber: string;
  no: number | string;
  unitId: string;
  fuelmanId: string;
  tankId: string;
  unitCode: string;
  category: string;
  type: string;
  dateStr: string;
  jamStr: string;
  previousHm: number;
  currentHm: number;
  deltaHm: number;
  previousKm: number;
  currentKm: number;
  deltaKm: number;
  volumeLiters: number;
  shift: string;
  operator: string;
  fuelInLiters: number;
  totalFuelOut: number;
  stockAkhir: number;
  totalFuelIn: number;
  fuelmanName: string;
  bypassValidation: boolean;
  bypassReason: string | null;
  syncStatus: SyncStatus;
  syncedAt: string | null;
  syncError?: string | null;
  dispensedAt: string;
  unit?: Unit;
  tank?: StorageTank;
}

export interface ShiftSummary {
  date: string;
  shift: string;
  totalDispensedLiters: number;
  totalFuelInLiters: number;
  totalTransactions: number;
  tanks: StorageTank[];
}

export interface MonthlySummary {
  monthStr: string;
  totalDispensedLiters: number;
  totalFuelInLiters: number;
  totalTransactions: number;
  distinctUnits: number;
  syncedCount: number;
  pendingCount: number;
  failedCount: number;
  dailyBreakdown: Record<string, { dispensed: number; fuelIn: number; transactions: number }>;
}


export interface SyncTelemetry {
  isConfigured: boolean;
  spreadsheetId: string | null;
  sheetName: string;
  spreadsheetUrl: string | null;
  pendingCount: number;
  failedCount: number;
  syncedCount: number;
  lastSyncedAt: string | null;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  oldValues: string | null;
  newValues: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    fullName: string;
    role: Role;
  };
}

export interface MeterContextResponse {
  unit: Unit;
  precedingLog: {
    id: string;
    logNumber: string;
    dateStr: string;
    jamStr: string;
    currentKm: number;
    currentHm: number;
    deltaKm: number;
    deltaHm: number;
    operator: string;
  } | null;
  subsequentLog: {
    id: string;
    logNumber: string;
    dateStr: string;
    jamStr: string;
    currentKm: number;
    currentHm: number;
    deltaKm: number;
    deltaHm: number;
    operator: string;
  } | null;
  baselineKm: number;
  baselineHm: number;
  maxAllowedKm: number | null;
  maxAllowedHm: number | null;
}
