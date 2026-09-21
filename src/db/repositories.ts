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
  NotificationSettings,
  MaintenancePlanItem,
  MaintenanceVisit,
  MaintenanceRequest,
  ShiftNote,
  PestControlVisit,
  TrainingPlanItem,
  TrainingRecord,
  HygieneViolation,
  DeepCleaningPlanItem,
  DeepCleaningExecution,
  DocumentReminder,
  ActivityLogEntry,
  ActivityActionKey
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
    expiringCertificates: false,
    expiredDocuments: false,
    expiringDocuments: false
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
    let dirty = false;
    // Backfill notifications block for settings saved before this feature existed.
    if (!existing[0].notifications) {
      existing[0].notifications = DEFAULT_NOTIFICATION_SETTINGS;
      dirty = true;
    }
    if (!existing[0].doctorGender) {
      existing[0].doctorGender = 'male';
      dirty = true;
    }
    if (dirty) await dbPut(STORES.settings, existing[0]);
    return existing[0];
  }
  const defaults: AppSettings & { id: string } = {
    id: 'app-settings',
    companyName: '',
    siteNames: [],
    supplierList: [],
    doctorName: '',
    doctorCode: '',
    doctorGender: 'male',
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
  remove: (id: string) => dbDelete(STORES.batches, id),
  clearAll: () => dbClear(STORES.batches)
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

// Maintenance module: annual preventive plan items (one per element per month)
export const MaintenancePlanRepo = {
  all: () => dbGetAll<MaintenancePlanItem>(STORES.maintenancePlanItems),
  save: (i: MaintenancePlanItem) => dbPut(STORES.maintenancePlanItems, i),
  remove: (id: string) => dbDelete(STORES.maintenancePlanItems, id)
};

// Maintenance module: logged site visits
export const MaintenanceVisitRepo = {
  all: () => dbGetAll<MaintenanceVisit>(STORES.maintenanceVisits),
  save: (v: MaintenanceVisit) => dbPut(STORES.maintenanceVisits, v),
  remove: (id: string) => dbDelete(STORES.maintenanceVisits, id)
};

// Maintenance module: corrective (علاجية) maintenance requests
export const MaintenanceRequestRepo = {
  all: () => dbGetAll<MaintenanceRequest>(STORES.maintenanceRequests),
  save: (r: MaintenanceRequest) => dbPut(STORES.maintenanceRequests, r),
  remove: (id: string) => dbDelete(STORES.maintenanceRequests, id)
};

// Shift Notes: daily notes logged per site
export const ShiftNoteRepo = {
  all: () => dbGetAll<ShiftNote>(STORES.shiftNotes),
  save: (n: ShiftNote) => dbPut(STORES.shiftNotes, n),
  remove: (id: string) => dbDelete(STORES.shiftNotes, id)
};

// Pest Control: logged visits per site
export const PestControlRepo = {
  all: () => dbGetAll<PestControlVisit>(STORES.pestControlVisits),
  save: (v: PestControlVisit) => dbPut(STORES.pestControlVisits, v),
  remove: (id: string) => dbDelete(STORES.pestControlVisits, id)
};

// Training: annual plan items
export const TrainingPlanRepo = {
  all: () => dbGetAll<TrainingPlanItem>(STORES.trainingPlanItems),
  save: (i: TrainingPlanItem) => dbPut(STORES.trainingPlanItems, i),
  remove: (id: string) => dbDelete(STORES.trainingPlanItems, id)
};

// Training: actual delivered records (planned or unplanned)
export const TrainingRecordRepo = {
  all: () => dbGetAll<TrainingRecord>(STORES.trainingRecords),
  save: (r: TrainingRecord) => dbPut(STORES.trainingRecords, r),
  remove: (id: string) => dbDelete(STORES.trainingRecords, id)
};

// Personal Hygiene: daily walk-through violations
export const HygieneViolationRepo = {
  all: () => dbGetAll<HygieneViolation>(STORES.hygieneViolations),
  save: (v: HygieneViolation) => dbPut(STORES.hygieneViolations, v),
  remove: (id: string) => dbDelete(STORES.hygieneViolations, id)
};

// Deep Cleaning: weekly plan items
export const DeepCleaningPlanRepo = {
  all: () => dbGetAll<DeepCleaningPlanItem>(STORES.deepCleaningPlanItems),
  save: (i: DeepCleaningPlanItem) => dbPut(STORES.deepCleaningPlanItems, i),
  remove: (id: string) => dbDelete(STORES.deepCleaningPlanItems, id)
};

// Deep Cleaning: daily execution follow-up
export const DeepCleaningExecutionRepo = {
  all: () => dbGetAll<DeepCleaningExecution>(STORES.deepCleaningExecutions),
  save: (e: DeepCleaningExecution) => dbPut(STORES.deepCleaningExecutions, e),
  remove: (id: string) => dbDelete(STORES.deepCleaningExecutions, id)
};

// Document Reminder: simple standalone document tracker
export const DocumentReminderRepo = {
  all: () => dbGetAll<DocumentReminder>(STORES.documentReminders),
  save: (d: DocumentReminder) => dbPut(STORES.documentReminders, d),
  remove: (id: string) => dbDelete(STORES.documentReminders, id)
};

// Activity Feed: real actions the user performed, for the Dashboard's Activity Feed.
// Deliberately keeps only the most recent 4 entries in storage (nothing else needs
// older ones), trimming on every write to stay lightweight.
export const ActivityLogRepo = {
  async recent(limit = 4): Promise<ActivityLogEntry[]> {
    const all = await dbGetAll<ActivityLogEntry>(STORES.activityLog);
    return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
  },
  async log(actionKey: ActivityActionKey, detail?: string): Promise<void> {
    const entry: ActivityLogEntry = { id: generateId(), actionKey, detail, timestamp: new Date().toISOString() };
    await dbPut(STORES.activityLog, entry);
    const all = await dbGetAll<ActivityLogEntry>(STORES.activityLog);
    const sorted = all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const stale = sorted.slice(4);
    for (const e of stale) await dbDelete(STORES.activityLog, e.id);
  }
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
