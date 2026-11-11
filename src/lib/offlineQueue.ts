// Batara FMS IndexedDB Offline Outbox & Cache Engine
import { AxiosInstance } from 'axios';

const DB_NAME = 'batara_fms_offline_db';
const DB_VERSION = 1;
const STORE_OUTBOX = 'outbox';
const STORE_CACHE = 'master_cache';

export interface OfflineDispenseRecord {
  id: string;
  endpoint: string;
  payload: any;
  createdAt: number;
  dateStr: string;
  jamStr: string;
  unitCode: string;
  unitId: string;
  tankId: string;
  volumeLiters: number;
  shift: string;
  operator: string;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  lastError?: string;
  retryCount: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        const outboxStore = db.createObjectStore(STORE_OUTBOX, { keyPath: 'id' });
        outboxStore.createIndex('createdAt', 'createdAt', { unique: false });
        outboxStore.createIndex('status', 'status', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ----------------------------------------------------------------------
// Outbox Transactions Management
// ----------------------------------------------------------------------

export async function enqueueOfflineDispense(
  endpoint: string,
  payload: any,
  meta: {
    unitCode?: string;
    unitId?: string;
    tankId?: string;
    volumeLiters?: number;
    shift?: string;
    operator?: string;
    dateStr?: string;
    jamStr?: string;
  }
): Promise<OfflineDispenseRecord> {
  const db = await openDB();
  const now = Date.now();
  const record: OfflineDispenseRecord = {
    id: `off_${now}_${Math.random().toString(36).substring(2, 7)}`,
    endpoint,
    payload,
    createdAt: now,
    dateStr: meta.dateStr || new Date().toISOString().split('T')[0],
    jamStr: meta.jamStr || new Date().toTimeString().split(' ')[0],
    unitCode: meta.unitCode || 'Armada',
    unitId: meta.unitId || payload.unitId || '',
    tankId: meta.tankId || payload.tankId || '',
    volumeLiters: meta.volumeLiters ?? payload.volumeLiters ?? 0,
    shift: meta.shift || payload.shift || 'Shift 1',
    operator: meta.operator || payload.operator || '',
    status: 'PENDING',
    retryCount: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, 'readwrite');
    const store = tx.objectStore(STORE_OUTBOX);
    const req = store.add(record);

    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function getOfflineQueue(): Promise<OfflineDispenseRecord[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OUTBOX, 'readonly');
      const store = tx.objectStore(STORE_OUTBOX);
      const req = store.getAll();

      req.onsuccess = () => {
        const results: OfflineDispenseRecord[] = req.result || [];
        // Sort FIFO (First In, First Out) by createdAt
        results.sort((a, b) => a.createdAt - b.createdAt);
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function getPendingOfflineCount(): Promise<number> {
  const queue = await getOfflineQueue();
  return queue.filter((item) => item.status === 'PENDING' || item.status === 'FAILED').length;
}

export async function removeOfflineRecord(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OUTBOX, 'readwrite');
      const store = tx.objectStore(STORE_OUTBOX);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error deleting offline record:', err);
  }
}

export async function updateOfflineRecordStatus(
  id: string,
  status: 'PENDING' | 'SYNCING' | 'FAILED',
  lastError?: string
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OUTBOX, 'readwrite');
      const store = tx.objectStore(STORE_OUTBOX);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const record = getReq.result as OfflineDispenseRecord;
        if (!record) {
          resolve();
          return;
        }
        record.status = status;
        if (lastError) record.lastError = lastError;
        if (status === 'FAILED') record.retryCount += 1;

        const putReq = store.put(record);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.error('Error updating offline record status:', err);
  }
}

// ----------------------------------------------------------------------
// Master Data Caching (Units & Storage Tanks)
// ----------------------------------------------------------------------

export async function cacheMasterData(key: string, data: any): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CACHE, 'readwrite');
      const store = tx.objectStore(STORE_CACHE);
      const req = store.put({ key, data, cachedAt: Date.now() });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`Could not cache master data "${key}":`, err);
  }
}

export async function getCachedMasterData<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CACHE, 'readonly');
      const store = tx.objectStore(STORE_CACHE);
      const req = store.get(key);

      req.onsuccess = () => {
        if (req.result && req.result.data) {
          resolve(req.result.data as T);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------
// Background Sync Engine (Flush Queue to Server)
// ----------------------------------------------------------------------

export async function flushOfflineQueue(
  apiClient: AxiosInstance
): Promise<{ total: number; synced: number; failed: number }> {
  const queue = await getOfflineQueue();
  const pendingItems = queue.filter((i) => i.status !== 'SYNCING');

  if (pendingItems.length === 0) {
    return { total: 0, synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const item of pendingItems) {
    // Check if device lost connection during processing
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      break;
    }

    try {
      await updateOfflineRecordStatus(item.id, 'SYNCING');

      // Dispatch to API
      const res = await apiClient.post(item.endpoint, item.payload);

      if (res.status === 200 || res.status === 201) {
        await removeOfflineRecord(item.id);
        synced++;
      } else {
        await updateOfflineRecordStatus(item.id, 'FAILED', `Status ${res.status}`);
        failed++;
      }
    } catch (err: any) {
      const isNetworkError =
        !err.response ||
        err.code === 'ERR_NETWORK' ||
        err.message?.includes('Network Error');

      if (isNetworkError) {
        // Still no connectivity, reset to PENDING and stop flushing
        await updateOfflineRecordStatus(item.id, 'PENDING');
        break;
      } else {
        // Server rejected (e.g. 422 or 400 validation error)
        const errMsg = err.response?.data?.message || err.message || 'Server error';
        await updateOfflineRecordStatus(item.id, 'FAILED', errMsg);
        failed++;
      }
    }
  }

  return { total: pendingItems.length, synced, failed };
}
