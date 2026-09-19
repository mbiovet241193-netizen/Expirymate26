// Core domain types for QualityMate

export type ShelfLifeUnit = 'days' | 'months' | 'years';

export type ProductStatus = 'before_half' | 'after_half' | 'near_expiry' | 'expiring_soon' | 'expired';

export interface Category {
  id: string;
  name: string;
  nameAr?: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  defaultShelfLifeValue?: number;
  defaultShelfLifeUnit?: ShelfLifeUnit;
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  id: string;
  productId: string;
  batchCode?: string;
  siteName?: string; // optional for backward compatibility with batches created before site tracking existed
  productionDate: string; // ISO date
  shelfLifeValue: number;
  shelfLifeUnit: ShelfLifeUnit;
  expiryDate: string; // ISO date, last day of expiry month if > 3 months
  halfLifeDate: string; // ISO date
  quantity?: number;
  notes?: string;
  createdAt: string;
}

/** @deprecated Legacy store, kept only so old backups can be migrated into Product. */
export interface ShelfLifeDbEntry {
  id: string;
  productName: string;
  categoryId: string;
  shelfLifeValue: number;
  shelfLifeUnit: ShelfLifeUnit;
}

export type NonConformingDecision = 'disposal' | 'returned' | 'rejected' | 'pending';

export interface NonConformingRecord {
  id: string;
  productId?: string;
  productName: string;
  date: string;
  reason: string;
  decision: NonConformingDecision;
  notes?: string;
  createdAt: string;
}

export interface ReceivingRow {
  id: string;
  productId?: string; // linked to central Products database when the name matches an existing product
  productName: string;
  categoryId: string;
  productionDate: string;
  shelfLifeValue: number;
  shelfLifeUnit: ShelfLifeUnit;
  expiryDate: string;
  halfLifeDate: string;
  status: ProductStatus;
  productTemp?: string;
  notes?: string;
}

export interface ReceivingSession {
  id: string;
  siteName: string;
  supplierName: string;
  receivingDate: string;
  receivingTime: string;
  doctorName: string;
  doctorCode: string;
  vehicleTemp?: string; // applies to the whole receiving session, entered once
  rows: ReceivingRow[];
  createdAt: string;
}

export type ReportType =
  | 'full'
  | 'expiry_followup'
  | 'maintenance'
  | 'receiving'
  | 'non_conforming'
  | 'monthly_receiving'
  | 'health_certificates'
  | 'hygiene_violations';

export interface SavedReport {
  id: string;
  type: ReportType;
  title: string;
  createdAt: string;
  payload: unknown; // snapshot data used to re-render/re-export the report
}

export interface NotificationSettings {
  enabled: boolean; // master switch - off by default
  time: string; // 'HH:mm', default '08:00'
  categories: {
    expiredProducts: boolean;
    halfLifeProducts: boolean;
    expiringProducts: boolean; // within 30 days
    dailyReminder: boolean;
    expiredCertificates: boolean;
    expiringCertificates: boolean; // within 30 days
  };
}

export interface AppSettings {
  companyLogo?: string; // base64
  companyName: string;
  siteNames: string[];
  supplierList: string[];
  doctorName: string;
  doctorCode: string;
  doctorGender: 'male' | 'female'; // grammar only — never affects reports/records
  backupWhatsAppNumber?: string; // last-used recipient number for shift-handover backup sharing
  theme: 'light' | 'dark';
  language: 'ar' | 'en';
  notifications: NotificationSettings;
}

export interface BatchComputed extends Batch {
  remainingDays: number;
  remainingDaysToHalf: number;
  consumptionPercent: number;
  status: ProductStatus;
}

// --- Health Certificates module ---

export type CertificateStatus = 'valid' | 'near_expiry' | 'expired';

export interface Employee {
  id: string;
  code: string;
  name: string;
  jobTitle: string;
  healthCertExpiryDate?: string; // ISO date, optional — imported/entered health certificate expiry
  insuranceNumber?: string; // رقم التأمين الطبي
  mobilePhone?: string;
  notes?: string; // general notes, entered and edited only via Employee Management
  imageDataUrl?: string; // base64 health certificate photo — captured/managed only via Employee Management
  createdAt: string;
  updatedAt: string;
}

export interface HealthCertificate {
  id: string;
  siteName: string;
  employeeId: string;
  expiryDate: string; // ISO date
  notes?: string;
  imageDataUrl?: string; // base64, optional front-of-certificate photo
  createdAt: string;
}

// Maintenance module: annual preventive maintenance plan, one item per scheduled
// element per month. "Preventive" (وقائية) only — corrective work lives in MaintenanceRequest.
export interface MaintenancePlanItem {
  id: string;
  siteName: string;
  year: number;
  month: number; // 1-12
  elementName: string; // بند/عنصر الصيانة الوقائية
  done: boolean;
  doneDate?: string; // ISO date - set when marked done (directly or via a visit)
  visitId?: string; // the visit during which it was completed, if any
  notes?: string;
  createdAt: string;
}

// Maintenance module: a logged site visit. Selecting pending plan items / requests
// during a visit marks them done and stamps them with this visit's date.
export interface MaintenanceVisit {
  id: string;
  siteName: string;
  visitDate: string; // ISO date
  companyName?: string; // شركة الصيانة، من قائمة الموردين
  technicianName: string;
  supervisorName: string;
  notes?: string;
  createdAt: string;
}

// Maintenance module: corrective ("علاجية") maintenance requests, tracked separately
// from the preventive plan. Closing one records who closed it and when.
export interface MaintenanceRequest {
  id: string;
  siteName: string;
  requestDate: string; // ISO date
  requesterName: string; // مقدم الطلب
  description: string;
  status: 'pending' | 'done';
  closedDate?: string;
  closedByName?: string; // من أغلق الطلب
  visitId?: string; // the visit during which it was closed, if any
  createdAt: string;
}

// Shift Notes module: free-form daily notes logged per site, as discrete items.
export interface ShiftNote {
  id: string;
  siteName: string;
  date: string; // ISO date
  text: string;
  createdAt: string;
}

// Pest Control module: logged site visits by an external pest-control company.
export interface PestControlVisit {
  id: string;
  siteName: string;
  visitDate: string;
  companyName: string; // من قائمة الموردين
  performedByName: string; // القائم بأعمال المكافحة
  followUpByName: string; // المسؤول بالمتابعة
  reportImageDataUrl?: string; // صورة المحضر
  notes?: string;
  createdAt: string;
}

// Training module: annual plan (same shape as the maintenance plan, plus a target audience),
// and actual training records (planned against the plan, or unplanned/ad-hoc).
export interface TrainingPlanItem {
  id: string;
  siteName: string;
  year: number;
  month: number; // 1-12
  topic: string; // موضوع/بند التدريب
  targetAudience: string; // الفئة المستهدفة
  done: boolean;
  doneDate?: string;
  recordId?: string; // the TrainingRecord that fulfilled this plan item, if any
  createdAt: string;
}

export interface TrainingRecord {
  id: string;
  siteName: string;
  date: string;
  planItemId?: string; // set when this fulfills a planned item; undefined = unplanned/ad-hoc
  programName: string;
  traineeCount: number;
  trainerName: string; // القائم بالتدريب
  imageDataUrl?: string; // صورة سجل التدريب
  notes?: string;
  createdAt: string;
}

// Personal Hygiene module: daily walk-through violations logged per site.
export interface HygieneViolation {
  id: string;
  siteName: string;
  date: string;
  employeeId: string; // من قائمة إدارة الموظفين
  violation: string;
  correctiveAction: string;
  status: 'warning' | 'deduction'; // إنذار أو خصم
  directSupervisorName: string;
  inspectorName: string;
  createdAt: string;
}

// Deep Cleaning module: a weekly plan (items tagged with the weekdays they apply to,
// so one item can repeat across several days), plus daily execution follow-up.
export interface DeepCleaningPlanItem {
  id: string;
  siteName: string;
  elementName: string;
  daysOfWeek: number[]; // 0=Sunday .. 6=Saturday; the weekdays this item is scheduled on
  createdAt: string;
}

export interface DeepCleaningExecution {
  id: string;
  siteName: string;
  date: string; // ISO date - the day this execution belongs to
  planItemId?: string; // set when fulfilling a scheduled plan item (even on an unplanned day)
  elementName: string; // denormalized: copied from the plan item, or typed fresh for an ad-hoc item
  performedByName: string;
  createdAt: string;
}
