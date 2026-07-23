import { STORES, dbGetAll, dbPut, dbDelete, dbClear, generateId } from './db';
import type {
  Category,
  Product,
  Batch,
  ShelfLifeDbEntry,
  NonConformingRecord,
  ReceivingSession,
  SavedReport,
  AppSettings,
  Employee,
  HealthCertificate,
  NotificationSettings
} from '../types';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  time: '08:00',
  categories: {
    expiredProducts: false,
    halfLifeProducts: false,
    expiringProducts: false,
    dailyReminder: false,
    expiredCertificates: false,
    expiringCertificates: false
  }
};

const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'createdAt'>[] = [
  { name: 'Frozen', nameAr: 'مجمدات', isDefault: true },
  { name: 'Chilled', nameAr: 'مبردات', isDefault: true },
  { name: 'Dry', nameAr: 'جافة', isDefault: true },
  { name: 'Chemicals', nameAr: 'كيماويات', isDefault: true }
];

export async function ensureDefaultCategories(): Promise<void> {
  const existing = await dbGetAll<Category>(STORES.categories);
  if (existing.length > 0) return;
  const now = new Date().toISOString();
  for (const cat of DEFAULT_CATEGORIES) {
    await dbPut<Category>(STORES.categories, { ...cat, id: generateId(), createdAt: now });
  }
}

export async function ensureDefaultSettings(): Promise<AppSettings> {
  const existing = await dbGetAll<AppSettings & { id: string }>(STORES.settings);
  if (existing.length > 0) {
    // Backfill notifications block for settings saved before this feature existed.
    if (!existing[0].notifications) {
      existing[0].notifications = DEFAULT_NOTIFICATION_SETTINGS;
      await dbPut(STORES.settings, existing[0]);
    }
    return existing[0];
  }
  const defaults: AppSettings & { id: string } = {
    id: 'app-settings',
    companyName: '',
    siteNames: [],
    supplierList: [],
    doctorName: '',
    doctorCode: '',
    theme: 'light',
    language: 'ar',
    notifications: DEFAULT_NOTIFICATION_SETTINGS
  };
  await dbPut(STORES.settings, defaults);
  return defaults;
}

// Categories
export const CategoryRepo = {
  all: () => dbGetAll<Category>(STORES.categories),
  save: (c: Category) => dbPut(STORES.categories, c),
  remove: (id: string) => dbDelete(STORES.categories, id)
};

// Products
export const ProductRepo = {
  all: () => dbGetAll<Product>(STORES.products),
  save: (p: Product) => dbPut(STORES.products, p),
  remove: (id: string) => dbDelete(STORES.products, id)
};

// Batches
export const BatchRepo = {
  all: () => dbGetAll<Batch>(STORES.batches),
  save: (b: Batch) => dbPut(STORES.batches, b),
  remove: (id: string) => dbDelete(STORES.batches, id)
};

// Legacy shelf-life database (deprecated - kept only to migrate old data into Products).
// Do NOT use this repo for new features; Product is now the single source of truth.
const LegacyShelfLifeDbRepo = {
  all: () => dbGetAll<ShelfLifeDbEntry>(STORES.shelfLifeDb),
  clear: () => dbClear(STORES.shelfLifeDb)
};

/**
 * One-time migration: folds any legacy "Shelf-Life Database" entries into the
 * central Products table (creating a Product when none matches by name, case-insensitive),
 * then clears the legacy store. Safe to call on every app start - it is a no-op
 * once the legacy store is empty.
 */
export async function migrateLegacyShelfLifeDbIntoProducts(): Promise<void> {
  const legacyEntries = await LegacyShelfLifeDbRepo.all();
  if (legacyEntries.length === 0) return;

  const existingProducts = await dbGetAll<Product>(STORES.products);
  const byNameLower = new Map(existingProducts.map((p) => [p.name.trim().toLowerCase(), p]));
  const now = new Date().toISOString();

  for (const entry of legacyEntries) {
    const key = entry.productName.trim().toLowerCase();
    if (!key) continue;
    const match = byNameLower.get(key);
    if (match) {
      // Product already exists - do not overwrite, just leave it as-is (no duplication).
      continue;
    }
    const newProduct: Product = {
      id: generateId(),
      name: entry.productName.trim(),
      categoryId: entry.categoryId,
      defaultShelfLifeValue: entry.shelfLifeValue,
      defaultShelfLifeUnit: entry.shelfLifeUnit,
      createdAt: now,
      updatedAt: now
    };
    await dbPut<Product>(STORES.products, newProduct);
    byNameLower.set(key, newProduct);
  }

  await LegacyShelfLifeDbRepo.clear();
}

// Non-conforming records
export const NonConformingRepo = {
  all: () => dbGetAll<NonConformingRecord>(STORES.nonConforming),
  save: (r: NonConformingRecord) => dbPut(STORES.nonConforming, r),
  remove: (id: string) => dbDelete(STORES.nonConforming, id)
};

// Receiving sessions
export const ReceivingRepo = {
  all: () => dbGetAll<ReceivingSession>(STORES.receivingSessions),
  save: (r: ReceivingSession) => dbPut(STORES.receivingSessions, r),
  remove: (id: string) => dbDelete(STORES.receivingSessions, id)
};

// Reports archive (last 3 months only, enforced by pruneOldReports)
export const ReportRepo = {
  all: () => dbGetAll<SavedReport>(STORES.reports),
  save: (r: SavedReport) => dbPut(STORES.reports, r),
  remove: (id: string) => dbDelete(STORES.reports, id),
  async pruneOldReports() {
    const all = await dbGetAll<SavedReport>(STORES.reports);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);
    const stale = all.filter((r) => new Date(r.createdAt).getTime() < cutoff.getTime());
    for (const r of stale) await dbDelete(STORES.reports, r.id);
  }
};

// Settings (single-row store)
export const SettingsRepo = {
  async get(): Promise<AppSettings & { id: string }> {
    return (await ensureDefaultSettings()) as AppSettings & { id: string };
  },
  save: (s: AppSettings & { id: string }) => dbPut(STORES.settings, s)
};

// Health Certificates module: centralized employee database (no site info here)
export const EmployeeRepo = {
  all: () => dbGetAll<Employee>(STORES.employees),
  save: (e: Employee) => dbPut(STORES.employees, e),
  remove: (id: string) => dbDelete(STORES.employees, id)
};

// Health Certificates module: certificate records (one per employee per site)
export const HealthCertificateRepo = {
  all: () => dbGetAll<HealthCertificate>(STORES.healthCertificates),
  save: (c: HealthCertificate) => dbPut(STORES.healthCertificates, c),
  remove: (id: string) => dbDelete(STORES.healthCertificates, id)
};

// Notification dedup log: one entry per (date + category), so the same
// category never notifies more than once per day. Resets naturally each
// new day since the id is date-scoped.
interface NotificationLogEntry {
  id: string; // `${yyyy-mm-dd}:${category}`
  sentAt: string;
}
export const NotificationLogRepo = {
  async wasSentToday(category: string): Promise<boolean> {
    const today = new Date().toISOString().slice(0, 10);
    const all = await dbGetAll<NotificationLogEntry>(STORES.notificationLog);
    return all.some((e) => e.id === `${today}:${category}`);
  },
  async markSentToday(category: string): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    await dbPut<NotificationLogEntry>(STORES.notificationLog, {
      id: `${today}:${category}`,
      sentAt: new Date().toISOString()
    });
    // Housekeeping: drop entries older than 7 days so the store never grows unbounded.
    const all = await dbGetAll<NotificationLogEntry>(STORES.notificationLog);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    for (const e of all) {
      const datePart = e.id.split(':')[0];
      if (new Date(datePart).getTime() < cutoff.getTime()) {
        await dbDelete(STORES.notificationLog, e.id);
      }
    }
  }
};
