// Shared insights engine — the SAME logic feeds both Dr. Deja's dashboard card
// and the Comprehensive Report's executive summary, so the two are always
// consistent. Deliberately simple: every rule is day-count or occurrence-count
// based (never a synthetic "score"), and every item links straight to its screen.
import type { Batch, Product, HealthCertificate, DocumentReminder, NonConformingRecord, MaintenancePlanItem, MaintenanceRequest, TrainingPlanItem, HygieneViolation, DeepCleaningPlanItem, DeepCleaningExecution } from '../types';
import type { Route } from '../router/Router';
import { computeBatchStatus } from './shelfLifeEngine';
import { computeCertificateStatus } from './certificateEngine';
import { computeDocumentStatus } from './documentEngine';

export interface AttentionItem {
  id: string;
  tier: 1 | 2 | 3; // 1 = urgent (red), 2 = soon (orange), 3 = worth watching (yellow)
  icon: string;
  textAr: string;
  textEn: string;
  route: Route;
}

export interface AttentionListInput {
  batches: Batch[];
  products: Product[];
  certificates: HealthCertificate[];
  documents: DocumentReminder[];
  nonConforming: NonConformingRecord[];
  maintenancePlan: MaintenancePlanItem[];
  maintenanceRequests: MaintenanceRequest[];
  trainingPlan: TrainingPlanItem[];
  /** When set, scopes every site-aware module to this site. Omit for an app-wide view. */
  siteName?: string;
  today?: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Builds the prioritized attention list (max 5 items) from live data across every module. */
export function buildAttentionList(input: AttentionListInput): AttentionItem[] {
  const today = input.today ?? new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const candidates: AttentionItem[] = [];

  const productById = new Map(input.products.map((p) => [p.id, p]));
  const siteBatches = input.siteName ? input.batches.filter((b) => !b.siteName || b.siteName === input.siteName) : input.batches;

  // --- Products: expired / near expiry (aggregated, not one item per batch) ---
  let expiredProducts = 0;
  let nearExpiryProducts = 0;
  siteBatches.forEach((b) => {
    const product = productById.get(b.productId);
    if (!product) return;
    const { status } = computeBatchStatus(b.productionDate, b.expiryDate, b.halfLifeDate, b.shelfLifeValue, b.shelfLifeUnit, todayMid);
    if (status === 'expired') expiredProducts++;
    else if (status === 'near_expiry' || status === 'expiring_soon') nearExpiryProducts++;
  });
  if (expiredProducts > 0) {
    candidates.push({
      id: 'products-expired',
      tier: 1,
      icon: '📦',
      textAr: `${expiredProducts} منتج منتهي الصلاحية يحتاج مراجعة`,
      textEn: `${expiredProducts} expired product(s) need review`,
      route: 'batches'
    });
  }
  if (nearExpiryProducts > 0) {
    candidates.push({
      id: 'products-near',
      tier: 2,
      icon: '📦',
      textAr: `${nearExpiryProducts} منتج قارب على الانتهاء`,
      textEn: `${nearExpiryProducts} product(s) approaching expiry`,
      route: 'batches'
    });
  }

  // --- Health certificates ---
  const siteCerts = input.siteName ? input.certificates.filter((c) => c.siteName === input.siteName) : input.certificates;
  let expiredCerts = 0;
  let nearCerts = 0;
  siteCerts.forEach((c) => {
    const { status } = computeCertificateStatus(c.expiryDate);
    if (status === 'expired') expiredCerts++;
    else if (status === 'near_expiry') nearCerts++;
  });
  if (expiredCerts > 0) {
    candidates.push({
      id: 'certs-expired',
      tier: 1,
      icon: '🩺',
      textAr: `${expiredCerts} شهادة صحية منتهية`,
      textEn: `${expiredCerts} expired health certificate(s)`,
      route: 'healthCertificates'
    });
  }
  if (nearCerts > 0) {
    candidates.push({
      id: 'certs-near',
      tier: 2,
      icon: '🩺',
      textAr: `${nearCerts} شهادة صحية قاربت على الانتهاء`,
      textEn: `${nearCerts} health certificate(s) nearing expiry`,
      route: 'healthCertificates'
    });
  }

  // --- Document reminders (not site-scoped — documents have no site field by design) ---
  let expiredDocs = 0;
  let nearDocs = 0;
  input.documents.forEach((d) => {
    const { status } = computeDocumentStatus(d.endDate);
    if (status === 'expired') expiredDocs++;
    else if (status === 'near_expiry') nearDocs++;
  });
  if (expiredDocs > 0) {
    candidates.push({
      id: 'documents-expired',
      tier: 1,
      icon: '🔔',
      textAr: `${expiredDocs} مستند منتهي يحتاج تحديثًا`,
      textEn: `${expiredDocs} expired document(s) need updating`,
      route: 'documentReminders'
    });
  }
  if (nearDocs > 0) {
    candidates.push({
      id: 'documents-near',
      tier: 2,
      icon: '🔔',
      textAr: `${nearDocs} مستند قارب على الانتهاء`,
      textEn: `${nearDocs} document(s) approaching expiry`,
      route: 'documentReminders'
    });
  }

  // --- Maintenance: the single oldest pending request (specific, not aggregated - mirrors how a manager actually thinks about it) ---
  const sitePendingRequests = (input.siteName ? input.maintenanceRequests.filter((r) => r.siteName === input.siteName) : input.maintenanceRequests).filter(
    (r) => r.status === 'pending'
  );
  if (sitePendingRequests.length > 0) {
    const oldest = [...sitePendingRequests].sort((a, b) => a.requestDate.localeCompare(b.requestDate))[0];
    const ageDays = Math.max(0, Math.round((todayMid.getTime() - new Date(oldest.requestDate).getTime()) / MS_PER_DAY));
    candidates.push({
      id: `maint-req-${oldest.id}`,
      tier: ageDays >= 7 ? 1 : 2,
      icon: '🔧',
      textAr:
        sitePendingRequests.length > 1
          ? `طلب صيانة معلق منذ ${ageDays} يوم (${oldest.siteName}) و${sitePendingRequests.length - 1} طلب آخر معلق`
          : `طلب صيانة معلق منذ ${ageDays} يوم (${oldest.siteName})`,
      textEn:
        sitePendingRequests.length > 1
          ? `Maintenance request pending ${ageDays} days (${oldest.siteName}), +${sitePendingRequests.length - 1} more pending`
          : `Maintenance request pending ${ageDays} days (${oldest.siteName})`,
      route: 'maintenance'
    });
  }

  // --- Non-conforming: the most-repeated product (recurring problem, surfaced as one item) ---
  const ncCounts = new Map<string, number>();
  input.nonConforming.forEach((r) => ncCounts.set(r.productName, (ncCounts.get(r.productName) ?? 0) + 1));
  const repeated = Array.from(ncCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])[0];
  if (repeated) {
    candidates.push({
      id: `nc-${repeated[0]}`,
      tier: 1,
      icon: '⚠️',
      textAr: `"${repeated[0]}" تكرر تسجيله كمنتج غير مطابق (${repeated[1]} مرات)`,
      textEn: `"${repeated[0]}" repeatedly logged as non-conforming (${repeated[1]} times)`,
      route: 'nonConforming'
    });
  }

  // --- Maintenance plan: this month's items not yet done ---
  const nowYear = today.getFullYear();
  const nowMonth = today.getMonth() + 1;
  const sitePlan = input.siteName ? input.maintenancePlan.filter((i) => i.siteName === input.siteName) : input.maintenancePlan;
  const pendingMaintPlan = sitePlan.filter((i) => i.year === nowYear && i.month === nowMonth && !i.done).length;
  if (pendingMaintPlan > 0) {
    candidates.push({
      id: 'maint-plan-pending',
      tier: 3,
      icon: '📋',
      textAr: `${pendingMaintPlan} بند من خطة الصيانة لهذا الشهر لم يُنفذ بعد`,
      textEn: `${pendingMaintPlan} maintenance plan item(s) not done yet this month`,
      route: 'maintenance'
    });
  }

  // --- Training plan: this month's items not yet done ---
  const siteTraining = input.siteName ? input.trainingPlan.filter((i) => i.siteName === input.siteName) : input.trainingPlan;
  const pendingTraining = siteTraining.filter((i) => i.year === nowYear && i.month === nowMonth && !i.done).length;
  if (pendingTraining > 0) {
    candidates.push({
      id: 'training-plan-pending',
      tier: 3,
      icon: '🎓',
      textAr: `${pendingTraining} بند من خطة التدريب لهذا الشهر لم يُنفذ بعد`,
      textEn: `${pendingTraining} training plan item(s) not done yet this month`,
      route: 'training'
    });
  }

  return candidates.sort((a, b) => a.tier - b.tier).slice(0, 5);
}

export interface WeeklyComparisonInput {
  hygieneViolations: HygieneViolation[];
  deepCleaningPlan: DeepCleaningPlanItem[];
  deepCleaningExecutions: DeepCleaningExecution[];
  siteName?: string;
  today?: Date;
}

export interface WeeklyMetric {
  labelAr: string;
  labelEn: string;
  current: number;
  previous: number;
  /** true = higher is good (e.g. completion %), false = lower is good (e.g. violation count) */
  higherIsBetter: boolean;
  unit?: '%' | '';
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Up to 2 week-over-week metrics. Returns [] when there isn't enough data in either window to compare. */
export function buildWeeklyComparison(input: WeeklyComparisonInput): WeeklyMetric[] {
  const today = input.today ?? new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startCurrent = new Date(todayMid.getTime() - 6 * MS_PER_DAY);
  const startPrevious = new Date(todayMid.getTime() - 13 * MS_PER_DAY);
  const endPrevious = new Date(todayMid.getTime() - 7 * MS_PER_DAY);

  const metrics: WeeklyMetric[] = [];

  // Personal hygiene violations, this week vs last week
  const violations = input.siteName ? input.hygieneViolations.filter((v) => v.siteName === input.siteName) : input.hygieneViolations;
  const currentViolations = violations.filter((v) => v.date >= isoDate(startCurrent) && v.date <= isoDate(todayMid)).length;
  const previousViolations = violations.filter((v) => v.date >= isoDate(startPrevious) && v.date <= isoDate(endPrevious)).length;
  if (currentViolations > 0 || previousViolations > 0) {
    metrics.push({
      labelAr: 'مخالفات النظافة الشخصية',
      labelEn: 'Personal Hygiene Violations',
      current: currentViolations,
      previous: previousViolations,
      higherIsBetter: false
    });
  }

  // Deep cleaning completion %, this week vs last week
  const plan = input.siteName ? input.deepCleaningPlan.filter((i) => i.siteName === input.siteName) : input.deepCleaningPlan;
  const exec = input.siteName ? input.deepCleaningExecutions.filter((e) => e.siteName === input.siteName) : input.deepCleaningExecutions;
  const completionPercentFor = (start: Date, end: Date): { percent: number; expected: number } => {
    let expected = 0;
    let fulfilled = 0;
    for (let d = new Date(start); isoDate(d) <= isoDate(end); d.setDate(d.getDate() + 1)) {
      const dateStr = isoDate(d);
      const weekday = d.getDay();
      const expectedToday = plan.filter((i) => i.daysOfWeek.includes(weekday));
      expected += expectedToday.length;
      expectedToday.forEach((item) => {
        if (exec.some((e) => e.date === dateStr && e.planItemId === item.id)) fulfilled++;
      });
    }
    return { percent: expected === 0 ? 0 : Math.round((fulfilled / expected) * 100), expected };
  };
  const current = completionPercentFor(startCurrent, todayMid);
  const previous = completionPercentFor(startPrevious, endPrevious);
  if (current.expected > 0 || previous.expected > 0) {
    metrics.push({
      labelAr: 'نسبة إنجاز النظافة العميقة',
      labelEn: 'Deep Cleaning Completion Rate',
      current: current.percent,
      previous: previous.percent,
      higherIsBetter: true,
      unit: '%'
    });
  }

  return metrics.slice(0, 2);
}
