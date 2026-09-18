// Minimal, dependency-free IndexedDB wrapper for QualityMate.
// Everything is stored 100% locally in the browser. No network calls.

const DB_NAME = 'expirymate-db';
const DB_VERSION = 4;

export const STORES = {
  categories: 'categories',
  products: 'products',
  batches: 'batches',
  shelfLifeDb: 'shelfLifeDb',
  nonConforming: 'nonConforming',
  receivingSessions: 'receivingSessions',
  reports: 'reports',
  settings: 'settings',
  employees: 'employees',
  healthCertificates: 'healthCertificates',
  notificationLog: 'notificationLog',
  maintenancePlanItems: 'maintenancePlanItems',
  maintenanceVisits: 'maintenanceVisits',
  maintenanceRequests: 'maintenanceRequests'
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      Object.values(STORES).forEach((store) => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function dbGetAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGet<T>(store: StoreName, id: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function dbPut<T extends { id: string }>(store: StoreName, value: T): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbBulkPut<T extends { id: string }>(store: StoreName, values: T[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    values.forEach((v) => os.put(v));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbDelete(store: StoreName, id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbClear(store: StoreName): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Exports the entire local database as a single JSON-serializable object (for Backup). */
export async function exportAllData(): Promise<Record<StoreName, unknown[]>> {
  const result = {} as Record<StoreName, unknown[]>;
  for (const store of Object.values(STORES)) {
    result[store] = await dbGetAll(store);
  }
  return result;
}

/** Restores the entire local database from a previously exported backup object. */
export async function importAllData(data: Record<string, unknown[]>): Promise<void> {
  for (const store of Object.values(STORES)) {
    if (Array.isArray(data[store])) {
      await dbClear(store);
      await dbBulkPut(store, data[store] as { id: string }[]);
    }
  }
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
