// Core domain types for ExpiryMate

export type ShelfLifeUnit = 'days' | 'months' | 'years';

export type ProductStatus = 'within_shelf_life' | 'after_half' | 'near_expiry' | 'expired';

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
  | 'expired'
  | 'near_expiry'
  | 'within_shelf_life'
  | 'after_half'
  | 'by_category'
  | 'receiving'
  | 'non_conforming'
  | 'monthly_receiving'
  | 'health_certificates';

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
