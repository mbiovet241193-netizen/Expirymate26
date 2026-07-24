import type { ProductStatus, ShelfLifeUnit } from '../types';

/**
 * Egyptian Shelf-Life Engine — ExpiryMate business rules (confirmed by Product Owner)
 *
 * Rule 1 — Shelf life <= 3 months:
 *   Exact calendar-day calculation. The production day counts as day 1 of the
 *   shelf life, so: expiry = productionDate + shelfLife - 1 day.
 *   e.g. 02 Apr 2026 + 1 month -> 01 May 2026
 *        30 Apr 2026 + 1 month -> 29 May 2026
 *
 * Rule 2 — Shelf life > 3 months:
 *   The production day is ignored entirely. The production month counts as
 *   Month 1, and the expiry date is always the LAST DAY of the final month.
 *   e.g. 05 May 2026 + 4 months -> May=1, Jun=2, Jul=3, Aug=4 -> 31 Aug 2026
 *        29 May 2026 + 4 months -> 31 Aug 2026 (same, day is irrelevant)
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
  return d;
}

function lastDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/** Converts a shelf-life value + unit into an equivalent number of months (approx), used only for the 3-month threshold test. */
export function shelfLifeInMonths(value: number, unit: ShelfLifeUnit): number {
  switch (unit) {
    case 'days':
      return value / 30;
    case 'months':
      return value;
    case 'years':
      return value * 12;
  }
}

/** Converts a shelf-life value + unit into an equivalent number of days, used for half-life and remaining-day math. */
export function shelfLifeInDays(value: number, unit: ShelfLifeUnit): number {
  switch (unit) {
    case 'days':
      return value;
    case 'months':
      return value * 30;
    case 'years':
      return value * 365;
  }
}

export interface ExpiryCalculationInput {
  productionDate: string; // ISO yyyy-mm-dd
  shelfLifeValue: number;
  shelfLifeUnit: ShelfLifeUnit;
}

export interface ExpiryCalculationResult {
  expiryDate: string;
  halfLifeDate: string;
  usesShortRule: boolean; // true = Day/Month/Year exact, false = Month/Year (last day)
}

/** Calculates expiry date & half-life date per ExpiryMate business rules. */
export function calculateExpiry(input: ExpiryCalculationInput): ExpiryCalculationResult {
  const { productionDate, shelfLifeValue, shelfLifeUnit } = input;
  const prodDate = parseISODate(productionDate);
  const months = shelfLifeInMonths(shelfLifeValue, shelfLifeUnit);
  const usesShortRule = months <= 3;

  let expiry: Date;
  if (usesShortRule) {
    // Rule 1: exact calendar-day arithmetic. Production day = day 1 of shelf
    // life, so the raw addition is shifted back by one day.
    let raw: Date;
    if (shelfLifeUnit === 'days') {
      raw = addDays(prodDate, shelfLifeValue);
    } else if (shelfLifeUnit === 'months') {
      raw = addMonths(prodDate, shelfLifeValue);
    } else {
      raw = addMonths(prodDate, shelfLifeValue * 12);
    }
    expiry = addDays(raw, -1);
  } else {
    // Rule 2: production month = Month 1 (production day ignored entirely).
    // Expiry is always the last day of the final counted month.
    let rawMonthsToAdd: number;
    if (shelfLifeUnit === 'days') {
      rawMonthsToAdd = Math.round(shelfLifeValue / 30);
    } else if (shelfLifeUnit === 'months') {
      rawMonthsToAdd = shelfLifeValue;
    } else {
      rawMonthsToAdd = shelfLifeValue * 12;
    }
    const target = addMonths(prodDate, rawMonthsToAdd - 1);
    expiry = lastDayOfMonth(target);
  }

  // Half shelf-life: midpoint between production date and expiry date (in days)
  const totalDays = Math.round((expiry.getTime() - prodDate.getTime()) / MS_PER_DAY);
  const halfDays = Math.floor(totalDays / 2);
  const half = addDays(prodDate, halfDays);

  return {
    expiryDate: toISODate(expiry),
    halfLifeDate: toISODate(half),
    usesShortRule
  };
}

export interface BatchStatusResult {
  remainingDays: number;
  remainingDaysToHalf: number;
  consumptionPercent: number;
  status: ProductStatus;
}

/**
 * Determines whether a product's final warning window (before expiry) uses the
 * short-shelf-life rule (Remaining Days 1-9 => "Expiring Soon") or the standard
 * long-shelf-life rule (Remaining Days <= 30 => "Will Expire Within 30 Days").
 * Reuses the same <= 3 months threshold already established in calculateExpiry().
 */
export function isShortShelfLife(shelfLifeValue: number, shelfLifeUnit: ShelfLifeUnit): boolean {
  return shelfLifeInMonths(shelfLifeValue, shelfLifeUnit) <= 3;
}

/** Computes live status of a batch (remaining days, consumption %, and color-coded status). */
export function computeBatchStatus(
  productionDate: string,
  expiryDate: string,
  halfLifeDate: string,
  shelfLifeValue: number,
  shelfLifeUnit: ShelfLifeUnit,
  today: Date = new Date()
): BatchStatusResult {
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const prod = parseISODate(productionDate);
  const expiry = parseISODate(expiryDate);
  const half = parseISODate(halfLifeDate);

  const remainingDays = Math.round((expiry.getTime() - todayMid.getTime()) / MS_PER_DAY);
  const remainingDaysToHalf = Math.round((half.getTime() - todayMid.getTime()) / MS_PER_DAY);

  const totalLifeDays = Math.max(1, Math.round((expiry.getTime() - prod.getTime()) / MS_PER_DAY));
  const elapsedDays = Math.round((todayMid.getTime() - prod.getTime()) / MS_PER_DAY);
  const consumptionPercent = Math.min(100, Math.max(0, (elapsedDays / totalLifeDays) * 100));

  const shortRule = isShortShelfLife(shelfLifeValue, shelfLifeUnit);
  // Final warning window: standard products warn at <= 30 days remaining;
  // short shelf-life products only warn once <= 9 days remain (see "Expiring Soon").
  const inFinalWarningWindow = shortRule ? remainingDays <= 9 : remainingDays <= 30;

  let status: ProductStatus;
  if (remainingDays < 1) {
    status = 'expired';
  } else if (inFinalWarningWindow) {
    status = 'near_expiry';
  } else if (todayMid.getTime() > half.getTime()) {
    status = 'after_half';
  } else {
    status = 'within_shelf_life';
  }

  return { remainingDays, remainingDaysToHalf, consumptionPercent, status };
}

export const STATUS_COLORS: Record<ProductStatus, string> = {
  within_shelf_life: '#2E7D5B', // green
  after_half: '#C9A400', // yellow/amber
  near_expiry: '#1565C0', // blue
  expired: '#C62828' // red
};

/** near_expiry label depends on shelf-life length: long products get "Will Expire Within 30 Days", short products get "Expiring Soon". */
export function nearExpiryLabel(shortRule: boolean, lang: 'ar' | 'en'): string {
  if (shortRule) {
    return lang === 'ar' ? 'تنتهي قريبًا' : 'Expiring Soon';
  }
  return lang === 'ar' ? 'ستنتهي خلال 30 يومًا' : 'Will Expire Within 30 Days';
}

export const STATUS_LABELS_EN: Record<ProductStatus, string> = {
  within_shelf_life: 'Within Shelf Life',
  after_half: 'Passed Half Shelf Life',
  near_expiry: 'Will Expire Within 30 Days',
  expired: 'Expired'
};

export const STATUS_LABELS_AR: Record<ProductStatus, string> = {
  within_shelf_life: 'ضمن مدة الصلاحية',
  after_half: 'تجاوز نصف مدة الصلاحية',
  near_expiry: 'ستنتهي خلال 30 يومًا',
  expired: 'منتهي الصلاحية'
};

export { toISODate, parseISODate };
