import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { BatchRepo, CategoryRepo, ProductRepo, ReportRepo, ReceivingRepo, NonConformingRepo, EmployeeRepo, HealthCertificateRepo, MaintenancePlanRepo, MaintenanceVisitRepo, MaintenanceRequestRepo, ShiftNoteRepo, PestControlRepo, TrainingPlanRepo, TrainingRecordRepo, HygieneViolationRepo, DeepCleaningPlanRepo, DeepCleaningExecutionRepo } from '../db/repositories';
import { generateId } from '../db/db';
import type {
  Batch,
  Category,
  Employee,
  HealthCertificate,
  NonConformingRecord,
  Product,
  ReceivingSession,
  ReportType,
  MaintenancePlanItem,
  MaintenanceVisit,
  MaintenanceRequest,
  ShiftNote,
  PestControlVisit,
  TrainingPlanItem,
  TrainingRecord,
  HygieneViolation,
  DeepCleaningPlanItem,
  DeepCleaningExecution
} from '../types';
import DateInput from '../components/common/DateInput';
import { computeBatchStatus } from '../engine/shelfLifeEngine';
import { computeCertificateStatus } from '../engine/certificateEngine';
import { computeDashboardStats, type DashboardStats } from '../engine/dashboardStats';
import StatusBadge from '../components/common/StatusBadge';
import CertificateStatusBadge from '../components/common/CertificateStatusBadge';
import { exportToCsv, exportSectionsToCsv } from '../utils/export';
import Modal from '../components/common/Modal';
import Autocomplete from '../components/common/Autocomplete';
import { useRouter } from '../router/Router';

const REPORT_TYPES: { type: ReportType; ar: string; en: string; icon: string }[] = [
  { type: 'full', ar: 'التقرير الشامل الشهري', en: 'Monthly Comprehensive Report', icon: '📋' },
  { type: 'expiry_followup', ar: 'متابعة الصلاحية (فئة معينة أو الكل)', en: 'Expiry Follow-up (By Category or All)', icon: '📅' },
  { type: 'monthly_receiving', ar: 'تقرير الاستلام الشهري', en: 'Monthly Receiving Report', icon: '🚚' },
  { type: 'health_certificates', ar: 'تقرير الشهادات الصحية', en: 'Health Certificates Report', icon: '🩺' },
  { type: 'maintenance', ar: 'تقرير الصيانة الشامل', en: 'Comprehensive Maintenance Report', icon: '🔧' },
  { type: 'hygiene_violations', ar: 'تقرير مخالفات النظافة الشخصية', en: 'Personal Hygiene Violations Report', icon: '🧼' }
];

export default function Reports() {
  const { t, lang, settings } = useApp();
  const { navigate } = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [receivingSessions, setReceivingSessions] = useState<ReceivingSession[]>([]);
  const [nonConformingRecords, setNonConformingRecords] = useState<NonConformingRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [certificates, setCertificates] = useState<HealthCertificate[]>([]);
  const [maintenancePlanItems, setMaintenancePlanItems] = useState<MaintenancePlanItem[]>([]);
  const [maintenanceVisits, setMaintenanceVisits] = useState<MaintenanceVisit[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [shiftNotes, setShiftNotes] = useState<ShiftNote[]>([]);
  const [pestControlVisits, setPestControlVisits] = useState<PestControlVisit[]>([]);
  const [trainingPlanItems, setTrainingPlanItems] = useState<TrainingPlanItem[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);
  const [hygieneViolations, setHygieneViolations] = useState<HygieneViolation[]>([]);
  const [deepCleaningPlanItems, setDeepCleaningPlanItems] = useState<DeepCleaningPlanItem[]>([]);
  const [deepCleaningExecutions, setDeepCleaningExecutions] = useState<DeepCleaningExecution[]>([]);
  const [execStats, setExecStats] = useState<DashboardStats | null>(null);
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');

  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [pendingType, setPendingType] = useState<ReportType | null>(null);
  const [setupSite, setSetupSite] = useState('');
  const [setupDoctor, setSetupDoctor] = useState('');
  const [setupDate, setSetupDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [setupEndDate, setSetupEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    (async () => {
      setProducts(await ProductRepo.all());
      setCategories(await CategoryRepo.all());
      setBatches(await BatchRepo.all());
      setReceivingSessions(await ReceivingRepo.all());
      setNonConformingRecords(await NonConformingRepo.all());
      setEmployees(await EmployeeRepo.all());
      setCertificates(await HealthCertificateRepo.all());
      setMaintenancePlanItems(await MaintenancePlanRepo.all());
      setMaintenanceVisits(await MaintenanceVisitRepo.all());
      setMaintenanceRequests(await MaintenanceRequestRepo.all());
      setShiftNotes(await ShiftNoteRepo.all());
      setPestControlVisits(await PestControlRepo.all());
      setTrainingPlanItems(await TrainingPlanRepo.all());
      setTrainingRecords(await TrainingRecordRepo.all());
      setHygieneViolations(await HygieneViolationRepo.all());
      setDeepCleaningPlanItems(await DeepCleaningPlanRepo.all());
      setDeepCleaningExecutions(await DeepCleaningExecutionRepo.all());
      setExecStats(await computeDashboardStats());
    })();
  }, []);

  const catName = (id: string) => {
    const c = categories.find((c) => c.id === id);
    if (!c) return '—';
    return lang === 'ar' ? c.nameAr || c.name : c.name;
  };
  const productMap = new Map(products.map((p) => [p.id, p]));

  const computedBatches = batches.map((b) => ({
    batch: b,
    product: productMap.get(b.productId),
    ...computeBatchStatus(b.productionDate, b.expiryDate, b.halfLifeDate, b.shelfLifeValue, b.shelfLifeUnit)
  }));

  const monthlyReceivingRows = (dateStr: string) => {
    const ref = new Date(dateStr);
    const targetYear = ref.getFullYear();
    const targetMonth = ref.getMonth();
    const out: { session: ReceivingSession; row: ReceivingSession['rows'][number] }[] = [];
    for (const s of receivingSessions) {
      const d = new Date(s.receivingDate);
      if (d.getFullYear() === targetYear && d.getMonth() === targetMonth) {
        for (const row of s.rows) out.push({ session: s, row });
      }
    }
    return out.sort((a, b) => a.session.receivingDate.localeCompare(b.session.receivingDate));
  };

  const monthLabel = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });

  /** Section 2: current-month receiving counts grouped by category — counts only, no row-by-row table. */
  const receivingCategorySummary = (dateStr: string) => {
    const rows = monthlyReceivingRows(dateStr);
    const counts = new Map<string, number>();
    rows.forEach(({ row }) => counts.set(row.categoryId, (counts.get(row.categoryId) ?? 0) + 1));
    return Array.from(counts.entries())
      .map(([categoryId, count]) => ({ categoryId, name: catName(categoryId), count }))
      .sort((a, b) => b.count - a.count);
  };

  /** Section 3: health certificates that are expired or near expiry only (all-time, not month-limited). */
  const certificatesNeedingAttention = () => {
    const employeeMap = new Map(employees.map((e) => [e.id, e]));
    return certificates
      .map((c) => {
        const employee = employeeMap.get(c.employeeId);
        const liveExpiryDate = employee?.healthCertExpiryDate;
        return { cert: c, employee, liveExpiryDate, ...(liveExpiryDate ? computeCertificateStatus(liveExpiryDate) : { remainingDays: 0, status: 'valid' as const }) };
      })
      .filter((r) => r.employee && r.liveExpiryDate && r.status !== 'valid')
      .sort((a, b) => a.remainingDays - b.remainingDays);
  };

  /** Section 4: non-conforming records logged within the report's month only. */
  const nonConformingForMonth = (dateStr: string) => {
    const ref = new Date(dateStr);
    return nonConformingRecords
      .filter((r) => {
        const d = new Date(r.date);
        return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  /** Section 1: turns the shared dashboard stats into report-friendly rows — every indicator always shows a result. */
  const executiveSummaryIndicators = (s: DashboardStats) => {
    const ok = lang === 'ar' ? '✅ لا توجد حالات' : '✅ OK — No cases found';
    const alertRow = (label: string, count: number) => ({ label, display: count > 0 ? String(count) : ok, count });
    const infoRow = (label: string, value: number) => ({ label, display: String(value), count: value });
    return [
      infoRow(lang === 'ar' ? 'إجمالي المنتجات' : 'Total Products', s.totalProducts),
      infoRow(lang === 'ar' ? 'إجمالي الدفعات' : 'Total Batches', s.totalBatches),
      alertRow(lang === 'ar' ? 'منتجات منتهية الصلاحية' : 'Expired Products', s.expired),
      alertRow(lang === 'ar' ? 'منتجات خلال 30 يومًا' : 'Products Expiring Within 30 Days', s.within30),
      alertRow(lang === 'ar' ? 'منتجات ستنتهي قريباً (قصيرة الصلاحية)' : 'Products Expiring Soon (Short Shelf-Life)', s.expiringSoon),
      alertRow(lang === 'ar' ? 'منتجات بعد نصف الصلاحية' : 'Products After Half Shelf-Life', s.afterHalf),
      infoRow(lang === 'ar' ? 'منتجات قبل نصف الصلاحية' : 'Products Before Half Shelf-Life', s.beforeHalf),
      alertRow(lang === 'ar' ? 'منتجات غير مطابقة' : 'Non-Conforming Products', s.nonConforming),
      alertRow(lang === 'ar' ? 'شهادات صحية منتهية' : 'Expired Health Certificates', s.expiredCerts),
      alertRow(lang === 'ar' ? 'شهادات صحية خلال 30 يومًا' : 'Health Certificates Expiring Within 30 Days', s.expiringCerts),
      infoRow(lang === 'ar' ? 'سجلات استلام اليوم' : "Today's Receiving Records", s.receivingToday)
    ];
  };

  const filteredForReport = (type: ReportType) => {
    const list = computedBatches.filter((r) => r.product);
    return list.sort((a, b) => a.batch.expiryDate.localeCompare(b.batch.expiryDate));
  };

  /**
   * Expiry Follow-up report grouping: Category -> Product -> Batches.
   * - Each product's own batches are sorted nearest-expiry-first.
   * - Products within a category are ordered by their own nearest expiry date.
   * - Categories are ordered the same way, by the nearest expiry date found in them.
   */
  const expiryFollowupGroups = () => {
    const rows = computedBatches.filter((r) => r.product && (!categoryFilter || r.product!.categoryId === categoryFilter));

    const byProduct = new Map<string, typeof rows>();
    rows.forEach((r) => {
      const key = r.product!.id;
      if (!byProduct.has(key)) byProduct.set(key, []);
      byProduct.get(key)!.push(r);
    });

    const productGroups = Array.from(byProduct.values()).map((group) => {
      const sorted = [...group].sort((a, b) => a.batch.expiryDate.localeCompare(b.batch.expiryDate));
      return { product: sorted[0].product!, nearestExpiry: sorted[0].batch.expiryDate, batches: sorted };
    });

    const byCategory = new Map<string, typeof productGroups>();
    productGroups.forEach((pg) => {
      const key = pg.product.categoryId;
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push(pg);
    });

    const categoryGroups = Array.from(byCategory.entries()).map(([categoryId, products]) => {
      const sortedProducts = [...products].sort((a, b) => a.nearestExpiry.localeCompare(b.nearestExpiry));
      return { categoryId, categoryName: catName(categoryId), nearestExpiry: sortedProducts[0].nearestExpiry, products: sortedProducts };
    });

    return categoryGroups.sort((a, b) => a.nearestExpiry.localeCompare(b.nearestExpiry));
  };

  /**
   * All new operational sections (maintenance visits, pest control, shift notes,
   * personal hygiene, deep cleaning, training) for setupSite over the
   * [setupDate, setupEndDate] period, used by the comprehensive report.
   */
  const operationalReportData = () => {
    const from = setupDate;
    const to = setupEndDate >= setupDate ? setupEndDate : setupDate;
    const inRange = (d: string) => d >= from && d <= to;

    // Maintenance: visits within the period, and requests that are currently pending (a live status).
    const visits = maintenanceVisits.filter((v) => v.siteName === setupSite && inRange(v.visitDate)).sort((a, b) => a.visitDate.localeCompare(b.visitDate));
    const pendingRequests = maintenanceRequests.filter((r) => r.siteName === setupSite && r.status === 'pending');

    // Pest control: visits within the period.
    const pestVisits = pestControlVisits.filter((v) => v.siteName === setupSite && inRange(v.visitDate)).sort((a, b) => a.visitDate.localeCompare(b.visitDate));

    // Shift notes within the period.
    const shiftNotesInRange = shiftNotes.filter((n) => n.siteName === setupSite && inRange(n.date)).sort((a, b) => a.date.localeCompare(b.date));

    // Personal hygiene: violations within the period, split by status.
    const violations = hygieneViolations.filter((v) => v.siteName === setupSite && inRange(v.date));
    const warningCount = violations.filter((v) => v.status === 'warning').length;
    const deductionCount = violations.filter((v) => v.status === 'deduction').length;

    // Deep cleaning: expected vs. fulfilled scheduled slots across every day of the period.
    const sitePlanItems = deepCleaningPlanItems.filter((i) => i.siteName === setupSite);
    let expectedSlots = 0;
    let fulfilledSlots = 0;
    for (let d = new Date(from); d.toISOString().slice(0, 10) <= to; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const weekday = d.getDay();
      const expectedToday = sitePlanItems.filter((i) => i.daysOfWeek.includes(weekday));
      expectedSlots += expectedToday.length;
      for (const item of expectedToday) {
        if (deepCleaningExecutions.some((e) => e.siteName === setupSite && e.date === dateStr && e.planItemId === item.id)) fulfilledSlots++;
      }
    }
    const deepCleaningCompletionPercent = expectedSlots === 0 ? 0 : Math.round((fulfilledSlots / expectedSlots) * 100);

    // Training: plan items whose month overlaps the period, plus all delivered records within the period.
    const fromMonthStart = new Date(new Date(from).getFullYear(), new Date(from).getMonth(), 1);
    const toMonthStart = new Date(new Date(to).getFullYear(), new Date(to).getMonth(), 1);
    const trainingPlanInRange = trainingPlanItems.filter((i) => {
      if (i.siteName !== setupSite) return false;
      const itemMonthStart = new Date(i.year, i.month - 1, 1);
      return itemMonthStart >= fromMonthStart && itemMonthStart <= toMonthStart;
    });
    const trainingPlanDone = trainingPlanInRange.filter((i) => i.done);
    const trainingPlanPending = trainingPlanInRange.filter((i) => !i.done);
    const recordsInRange = trainingRecords.filter((r) => r.siteName === setupSite && inRange(r.date));
    const unplannedRecords = recordsInRange.filter((r) => !r.planItemId);
    const totalTrainees = recordsInRange.reduce((sum, r) => sum + (r.traineeCount || 0), 0);

    return {
      from,
      to,
      visits,
      pendingRequests,
      pestVisits,
      shiftNotesInRange,
      violations,
      warningCount,
      deductionCount,
      deepCleaningItemCount: sitePlanItems.length,
      deepCleaningCompletionPercent,
      trainingPlanDone,
      trainingPlanPending,
      unplannedRecords,
      totalTrainees
    };
  };

  /** Comprehensive maintenance report for setupSite, scoped to the month/year of setupDate. */
  const maintenanceReportData = () => {
    const ref = new Date(setupDate);
    const year = ref.getFullYear();
    const month = ref.getMonth() + 1;

    const visits = maintenanceVisits
      .filter((v) => v.siteName === setupSite && new Date(v.visitDate).getFullYear() === year && new Date(v.visitDate).getMonth() + 1 === month)
      .sort((a, b) => a.visitDate.localeCompare(b.visitDate));

    const monthPlanItems = maintenancePlanItems.filter((i) => i.siteName === setupSite && i.year === year && i.month === month);
    const planDone = monthPlanItems.filter((i) => i.done);
    const planPending = monthPlanItems.filter((i) => !i.done);

    const siteRequests = maintenanceRequests.filter((r) => r.siteName === setupSite);
    const requestsClosedThisMonth = siteRequests.filter(
      (r) => r.status === 'done' && r.closedDate && new Date(r.closedDate).getFullYear() === year && new Date(r.closedDate).getMonth() + 1 === month
    );
    const requestsStillPending = siteRequests.filter((r) => r.status === 'pending');

    return { year, month, visits, planDone, planPending, requestsClosedThisMonth, requestsStillPending };
  };

  const reportTitle = (type: ReportType) => {
    const meta = REPORT_TYPES.find((r) => r.type === type)!;
    if (type === 'full') {
      return lang === 'ar' ? `التقرير الشامل الشهري – ${monthLabel(setupDate)}` : `Monthly Comprehensive Report – ${monthLabel(setupDate)}`;
    }
    const dateLabel = setupDate ? new Date(setupDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US');
    return `${lang === 'ar' ? meta.ar : meta.en} - ${dateLabel}`;
  };

  const openReportSetup = (type: ReportType) => {
    setPendingType(type);
    setSetupSite(settings.siteNames[0] ?? '');
    setSetupDoctor(settings.doctorName ?? '');
    setSetupDate(new Date().toISOString().slice(0, 10));
    setSetupEndDate(new Date().toISOString().slice(0, 10));
    setShowSetupDialog(true);
  };

  const confirmReportSetup = () => {
    if (!pendingType) return;
    setActiveReport(pendingType);
    setShowSetupDialog(false);
  };

  const saveAndExport = async (type: ReportType) => {
    if (type === 'full') {
      const execRows = execStats
        ? executiveSummaryIndicators(execStats).map((i) => ({
            [lang === 'ar' ? 'المؤشر' : 'Indicator']: i.label,
            [lang === 'ar' ? 'النتيجة' : 'Result']: i.display
          }))
        : [];
      const receivingRows = receivingCategorySummary(setupDate).map((r) => ({
        [lang === 'ar' ? 'الفئة' : 'Category']: r.name,
        [lang === 'ar' ? 'عدد الأصناف المستلمة' : 'Items Received']: r.count
      }));
      const certRows = certificatesNeedingAttention().map((r) => ({
        [lang === 'ar' ? 'الموظف' : 'Employee']: r.employee!.name,
        [lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date']: r.liveExpiryDate,
        [lang === 'ar' ? 'الحالة' : 'Status']: r.status
      }));
      const ncRows = nonConformingForMonth(setupDate).map((r) => ({
        [lang === 'ar' ? 'المنتج' : 'Product']: r.productName,
        [lang === 'ar' ? 'التاريخ' : 'Date']: r.date,
        [lang === 'ar' ? 'السبب' : 'Reason']: r.reason,
        [lang === 'ar' ? 'القرار' : 'Decision']: r.decision
      }));
      const ops = operationalReportData();
      const maintenanceVisitRows = ops.visits.map((v) => ({
        [lang === 'ar' ? 'التاريخ' : 'Date']: v.visitDate,
        [lang === 'ar' ? 'الفني' : 'Technician']: v.technicianName,
        [lang === 'ar' ? 'المشرف' : 'Supervisor']: v.supervisorName
      }));
      const maintenanceRequestRows = ops.pendingRequests.map((r) => ({
        [lang === 'ar' ? 'الوصف' : 'Description']: r.description,
        [lang === 'ar' ? 'الحالة' : 'Status']: lang === 'ar' ? 'معلق' : 'Pending'
      }));
      const pestControlRows = ops.pestVisits.map((v) => ({
        [lang === 'ar' ? 'التاريخ' : 'Date']: v.visitDate,
        [lang === 'ar' ? 'الشركة' : 'Company']: v.companyName,
        [lang === 'ar' ? 'القائم بالمكافحة' : 'Performed By']: v.performedByName
      }));
      const shiftNoteRows = ops.shiftNotesInRange.map((n) => ({
        [lang === 'ar' ? 'التاريخ' : 'Date']: n.date,
        [lang === 'ar' ? 'الملاحظة' : 'Note']: n.text
      }));
      const hygieneRows = [
        { [lang === 'ar' ? 'البيان' : 'Item']: lang === 'ar' ? 'إجمالي المخالفات' : 'Total Violations', [lang === 'ar' ? 'العدد' : 'Count']: ops.violations.length },
        { [lang === 'ar' ? 'البيان' : 'Item']: lang === 'ar' ? 'خصم' : 'Deductions', [lang === 'ar' ? 'العدد' : 'Count']: ops.deductionCount },
        { [lang === 'ar' ? 'البيان' : 'Item']: lang === 'ar' ? 'إنذار' : 'Warnings', [lang === 'ar' ? 'العدد' : 'Count']: ops.warningCount }
      ];
      const deepCleaningRows = [
        { [lang === 'ar' ? 'البيان' : 'Item']: lang === 'ar' ? 'عدد البنود' : 'Number of Elements', [lang === 'ar' ? 'القيمة' : 'Value']: ops.deepCleaningItemCount },
        { [lang === 'ar' ? 'البيان' : 'Item']: lang === 'ar' ? 'نسبة الإنجاز' : 'Completion Rate', [lang === 'ar' ? 'القيمة' : 'Value']: `${ops.deepCleaningCompletionPercent}%` }
      ];
      const trainingRows = [
        ...ops.trainingPlanDone.map((i) => ({ [lang === 'ar' ? 'البند' : 'Element']: i.topic, [lang === 'ar' ? 'الحالة' : 'Status']: lang === 'ar' ? 'تم' : 'Done' })),
        ...ops.trainingPlanPending.map((i) => ({ [lang === 'ar' ? 'البند' : 'Element']: i.topic, [lang === 'ar' ? 'الحالة' : 'Status']: lang === 'ar' ? 'لم يتم' : 'Not Done' })),
        ...ops.unplannedRecords.map((r) => ({ [lang === 'ar' ? 'البند' : 'Element']: `${r.programName} (${lang === 'ar' ? 'غير مخطط' : 'unplanned'})`, [lang === 'ar' ? 'الحالة' : 'Status']: `${r.date} — ${r.traineeCount} ${lang === 'ar' ? 'متدرب' : 'trainees'}` }))
      ];

      await ReportRepo.save({
        id: generateId(),
        type,
        title: reportTitle(type),
        createdAt: new Date().toISOString(),
        payload: {
          executiveSummary: execRows,
          receiving: receivingRows,
          healthCertificates: certRows,
          nonConforming: ncRows,
          maintenanceVisits: maintenanceVisitRows,
          maintenanceRequests: maintenanceRequestRows,
          pestControl: pestControlRows,
          shiftNotes: shiftNoteRows,
          personalHygiene: hygieneRows,
          deepCleaning: deepCleaningRows,
          training: trainingRows
        }
      });

      exportSectionsToCsv(`report-${type}`, [
        { title: lang === 'ar' ? 'الملخص التنفيذي' : 'Executive Summary', rows: execRows },
        { title: lang === 'ar' ? `ملخص الاستلام الشهري – ${monthLabel(setupDate)}` : `Monthly Receiving Summary – ${monthLabel(setupDate)}`, rows: receivingRows },
        { title: lang === 'ar' ? 'الشهادات الصحية' : 'Health Certificates', rows: certRows },
        { title: lang === 'ar' ? `منتجات غير مطابقة – ${monthLabel(setupDate)}` : `Non-Conforming Products – ${monthLabel(setupDate)}`, rows: ncRows },
        { title: lang === 'ar' ? 'زيارات الصيانة خلال الفترة' : 'Maintenance Visits During the Period', rows: maintenanceVisitRows },
        { title: lang === 'ar' ? 'صيانات معلقة حاليًا' : 'Currently Pending Maintenance', rows: maintenanceRequestRows },
        { title: lang === 'ar' ? 'المكافحة خلال الفترة' : 'Pest Control During the Period', rows: pestControlRows },
        { title: lang === 'ar' ? 'ملاحظات الشفت' : 'Shift Notes', rows: shiftNoteRows },
        { title: lang === 'ar' ? 'النظافة الشخصية' : 'Personal Hygiene', rows: hygieneRows },
        { title: lang === 'ar' ? 'النظافة العميقة' : 'Deep Cleaning', rows: deepCleaningRows },
        { title: lang === 'ar' ? 'التدريب' : 'Training', rows: trainingRows }
      ]);
      return;
    }

    if (type === 'monthly_receiving') {
      const rows = monthlyReceivingRows(setupDate);
      await ReportRepo.save({
        id: generateId(),
        type,
        title: reportTitle(type),
        createdAt: new Date().toISOString(),
        payload: rows.map(({ session, row }) => ({
          Site: session.siteName,
          Supplier: session.supplierName,
          VehicleTemp: session.vehicleTemp,
          Product: row.productName,
          ProductionDate: row.productionDate,
          ExpiryDate: row.expiryDate,
          Status: row.status,
          ProductTemp: row.productTemp,
          Notes: row.notes
        }))
      });
      exportToCsv(
        `report-${type}`,
        rows.map(({ session, row }) => ({
          Site: session.siteName,
          Supplier: session.supplierName,
          VehicleTemp: session.vehicleTemp,
          Product: row.productName,
          ProductionDate: row.productionDate,
          ExpiryDate: row.expiryDate,
          Status: row.status,
          ProductTemp: row.productTemp,
          Notes: row.notes
        }))
      );
      return;
    }

    if (type === 'expiry_followup') {
      const groups = expiryFollowupGroups();
      const rows: Record<string, string | number>[] = [];
      groups.forEach((cat) => {
        cat.products.forEach((pg) => {
          pg.batches.forEach((r) => {
            rows.push({
              [lang === 'ar' ? 'الفئة' : 'Category']: cat.categoryName,
              [lang === 'ar' ? 'الصنف' : 'Product']: pg.product.name,
              [lang === 'ar' ? 'تاريخ الإنتاج' : 'Production Date']: r.batch.productionDate,
              [lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date']: r.batch.expiryDate,
              [lang === 'ar' ? 'الأيام المتبقية' : 'Remaining Days']: r.remainingDays,
              [lang === 'ar' ? 'الحالة' : 'Status']: r.status
            });
          });
        });
      });
      await ReportRepo.save({ id: generateId(), type, title: reportTitle(type), createdAt: new Date().toISOString(), payload: rows });
      exportToCsv(`report-${type}`, rows);
      return;
    }

    if (type === 'maintenance') {
      const data = maintenanceReportData();
      const rows: Record<string, string | number>[] = [];
      data.visits.forEach((v) =>
        rows.push({
          [lang === 'ar' ? 'القسم' : 'Section']: lang === 'ar' ? 'زيارة' : 'Visit',
          [lang === 'ar' ? 'التفاصيل' : 'Details']: `${v.visitDate} - ${v.technicianName} / ${v.supervisorName}`
        })
      );
      data.planDone.forEach((i) =>
        rows.push({ [lang === 'ar' ? 'القسم' : 'Section']: lang === 'ar' ? 'خطة - تم' : 'Plan - Done', [lang === 'ar' ? 'التفاصيل' : 'Details']: i.elementName })
      );
      data.planPending.forEach((i) =>
        rows.push({ [lang === 'ar' ? 'القسم' : 'Section']: lang === 'ar' ? 'خطة - لم يتم' : 'Plan - Pending', [lang === 'ar' ? 'التفاصيل' : 'Details']: i.elementName })
      );
      data.requestsClosedThisMonth.forEach((r) =>
        rows.push({
          [lang === 'ar' ? 'القسم' : 'Section']: lang === 'ar' ? 'طلب - تم' : 'Request - Done',
          [lang === 'ar' ? 'التفاصيل' : 'Details']: `${r.description} (${r.closedDate})`
        })
      );
      data.requestsStillPending.forEach((r) =>
        rows.push({
          [lang === 'ar' ? 'القسم' : 'Section']: lang === 'ar' ? 'طلب - معلق' : 'Request - Pending',
          [lang === 'ar' ? 'التفاصيل' : 'Details']: r.description
        })
      );
      await ReportRepo.save({ id: generateId(), type, title: reportTitle(type), createdAt: new Date().toISOString(), payload: rows });
      exportToCsv(`report-${type}`, rows);
      return;
    }

    if (type === 'hygiene_violations') {
      const from = setupDate;
      const to = setupEndDate >= setupDate ? setupEndDate : setupDate;
      const employeeById = new Map(employees.map((e) => [e.id, e]));
      const rows = hygieneViolations
        .filter((v) => v.siteName === setupSite && v.date >= from && v.date <= to)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((v) => {
          const emp = employeeById.get(v.employeeId);
          return {
            [lang === 'ar' ? 'التاريخ' : 'Date']: v.date,
            [lang === 'ar' ? 'اسم الموظف' : 'Employee Name']: emp?.name ?? '—',
            [lang === 'ar' ? 'كود الموظف' : 'Employee Code']: emp?.code ?? '—',
            [lang === 'ar' ? 'المخالفة' : 'Violation']: v.violation,
            [lang === 'ar' ? 'الإجراء التصحيحي/الوقائي' : 'Corrective/Preventive Action']: v.correctiveAction,
            [lang === 'ar' ? 'الحالة' : 'Status']: v.status === 'deduction' ? (lang === 'ar' ? 'خصم' : 'Deduction') : lang === 'ar' ? 'إنذار' : 'Warning',
            [lang === 'ar' ? 'المشرف المباشر' : 'Direct Supervisor']: v.directSupervisorName,
            [lang === 'ar' ? 'القائم بالتفتيش' : 'Inspector']: v.inspectorName
          };
        });
      await ReportRepo.save({ id: generateId(), type, title: reportTitle(type), createdAt: new Date().toISOString(), payload: rows });
      exportToCsv(`report-${type}`, rows);
      return;
    }

    const list = filteredForReport(type);
    await ReportRepo.save({
      id: generateId(),
      type,
      title: reportTitle(type),
      createdAt: new Date().toISOString(),
      payload: list.map((r) => ({
        Product: r.product!.name,
        Category: catName(r.product!.categoryId),
        ProductionDate: r.batch.productionDate,
        ExpiryDate: r.batch.expiryDate,
        RemainingDays: r.remainingDays,
        Consumption: `${r.consumptionPercent.toFixed(0)}%`,
        Status: r.status
      }))
    });
    exportToCsv(
      `report-${type}`,
      list.map((r) => ({
        Product: r.product!.name,
        Category: catName(r.product!.categoryId),
        ProductionDate: r.batch.productionDate,
        ExpiryDate: r.batch.expiryDate,
        RemainingDays: r.remainingDays,
        Consumption: `${r.consumptionPercent.toFixed(0)}%`,
        Status: r.status
      }))
    );
  };

  if (activeReport === 'full') {
    const execRows = execStats ? executiveSummaryIndicators(execStats) : [];
    const receivingRows = receivingCategorySummary(setupDate);
    const certRows = certificatesNeedingAttention();
    const ncRows = nonConformingForMonth(setupDate);
    const ops = operationalReportData();

    return (
      <div>
        <div className="toolbar no-print">
          <button className="btn btn-outline" onClick={() => setActiveReport(null)}>
            {lang === 'ar' ? 'رجوع' : 'Back'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => saveAndExport(activeReport)}>
              {t('exportExcel')}
            </button>
            <button className="btn btn-primary" onClick={() => window.print()}>
              🖨️ {t('print')}
            </button>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {settings.companyLogo && <img src={settings.companyLogo} alt="logo" style={{ height: 50 }} />}
              <div>
                <div style={{ fontWeight: 800 }}>{settings.companyName || 'Company Name'}</div>
                {setupSite && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>
                    {lang === 'ar' ? 'الموقع' : 'Site'}: {setupSite}
                  </div>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'end' }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{reportTitle(activeReport)}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>
                {new Date().toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
              </div>
            </div>
          </div>

          {/* Section 1 — Executive Summary */}
          <h3 className="report-section-title">{lang === 'ar' ? '١. الملخص التنفيذي' : '1. Executive Summary'}</h3>
          <div className="desktop-only-table">
            <table className="data-table">
              <tbody>
                {execRows.map((row) => (
                  <tr key={row.label}>
                    <td style={{ fontWeight: 700 }}>{row.label}</td>
                    <td style={{ color: row.count > 0 ? 'var(--danger)' : 'var(--primary)', fontWeight: 700 }}>{row.display}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mobile-cards no-print">
            {execRows.map((row) => (
              <div className="record-card-row" key={row.label}>
                <span>{row.label}</span>
                <span style={{ color: row.count > 0 ? 'var(--danger)' : 'var(--primary)', fontWeight: 700 }}>{row.display}</span>
              </div>
            ))}
          </div>

          {/* Section 2 — Monthly Receiving Summary */}
          <h3 className="report-section-title" style={{ marginTop: 26 }}>
            {lang === 'ar' ? `٢. ملخص الاستلام الشهري – ${monthLabel(setupDate)}` : `2. Monthly Receiving Summary – ${monthLabel(setupDate)}`}
          </h3>
          {receivingRows.length === 0 ? (
            <div className="empty-state">{t('noData')}</div>
          ) : (
            <ul style={{ margin: 0, paddingInlineStart: 20 }}>
              {receivingRows.map((r) => (
                <li key={r.categoryId} style={{ padding: '4px 0' }}>
                  {r.name}: {lang === 'ar' ? `تم استلام (${r.count}) صنف` : `received (${r.count}) items`}
                </li>
              ))}
            </ul>
          )}

          {/* Section 3 — Health Certificates */}
          <h3 className="report-section-title" style={{ marginTop: 26 }}>
            {lang === 'ar' ? '٣. الشهادات الصحية' : '3. Health Certificates'}
          </h3>
          {certRows.length === 0 ? (
            <div className="empty-state">{lang === 'ar' ? '✅ لا توجد شهادات منتهية أو قاربت على الانتهاء' : '✅ No expired or expiring certificates'}</div>
          ) : (
            <>
              <div className="desktop-only-table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{lang === 'ar' ? 'الموظف' : 'Employee'}</th>
                      <th>{lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}</th>
                      <th>{t('status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certRows.map((r, i) => (
                      <tr key={r.cert.id}>
                        <td>{i + 1}</td>
                        <td>{r.employee!.name}</td>
                        <td>{r.liveExpiryDate}</td>
                        <td>
                          <CertificateStatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mobile-cards no-print">
                {certRows.map((r, i) => (
                  <div className="record-card" key={r.cert.id}>
                    <div className="record-card-header">
                      <div className="record-card-title">
                        {i + 1}. {r.employee!.name}
                      </div>
                      <CertificateStatusBadge status={r.status} />
                    </div>
                    <div className="record-card-row">
                      <span>{lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}</span>
                      <span>{r.liveExpiryDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Section 4 — Non-Conforming Products */}
          <h3 className="report-section-title" style={{ marginTop: 26 }}>
            {lang === 'ar' ? `٤. منتجات غير مطابقة – ${monthLabel(setupDate)}` : `4. Non-Conforming Products – ${monthLabel(setupDate)}`}
          </h3>
          {ncRows.length === 0 ? (
            <div className="empty-state">{lang === 'ar' ? '✅ لا توجد حالات هذا الشهر' : '✅ No cases this month'}</div>
          ) : (
            <>
              <div className="desktop-only-table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('name')}</th>
                      <th>{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                      <th>{lang === 'ar' ? 'السبب' : 'Reason'}</th>
                      <th>{lang === 'ar' ? 'القرار' : 'Decision'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ncRows.map((r, i) => (
                      <tr key={r.id}>
                        <td>{i + 1}</td>
                        <td>{r.productName}</td>
                        <td>{r.date}</td>
                        <td>{r.reason}</td>
                        <td>{r.decision}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mobile-cards no-print">
                {ncRows.map((r, i) => (
                  <div className="record-card" key={r.id}>
                    <div className="record-card-header">
                      <div className="record-card-title">
                        {i + 1}. {r.productName}
                      </div>
                    </div>
                    <div className="record-card-row">
                      <span>{lang === 'ar' ? 'التاريخ' : 'Date'}</span>
                      <span>{r.date}</span>
                    </div>
                    <div className="record-card-row">
                      <span>{lang === 'ar' ? 'السبب' : 'Reason'}</span>
                      <span>{r.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Sections 5-10: new operational sections, only shown when a site is selected since they're all tracked per site */}
          {setupSite && (
            <>
              <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)', margin: '20px 0 4px' }}>
                {lang === 'ar' ? `الفترة: ${ops.from} إلى ${ops.to}` : `Period: ${ops.from} to ${ops.to}`}
              </div>

              {/* Section 5 — Maintenance */}
              <h3 className="report-section-title" style={{ marginTop: 10 }}>
                {lang === 'ar' ? '٥. الصيانة' : '5. Maintenance'}
              </h3>
              <div style={{ fontSize: '0.85rem', marginBottom: 8 }}>
                {lang === 'ar' ? `عدد زيارات الصيانة خلال الفترة: ${ops.visits.length}` : `Maintenance visits during the period: ${ops.visits.length}`}
              </div>
              {ops.visits.length > 0 && (
                <div className="desktop-only-table" style={{ marginBottom: 14 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                        <th>{lang === 'ar' ? 'الفني' : 'Technician'}</th>
                        <th>{lang === 'ar' ? 'المشرف' : 'Supervisor'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ops.visits.map((v) => (
                        <tr key={v.id}>
                          <td>{v.visitDate}</td>
                          <td>{v.technicianName}</td>
                          <td>{v.supervisorName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>
                {lang === 'ar' ? 'صيانات معلقة حاليًا' : 'Currently Pending Maintenance'} ({ops.pendingRequests.length})
              </div>
              {ops.pendingRequests.length === 0 ? (
                <div className="empty-state">{lang === 'ar' ? 'لا يوجد' : 'None'}</div>
              ) : (
                <ul style={{ margin: 0, paddingInlineStart: 20, fontSize: '0.85rem' }}>
                  {ops.pendingRequests.map((r) => (
                    <li key={r.id}>{r.description}</li>
                  ))}
                </ul>
              )}

              {/* Section 6 — Pest Control */}
              <h3 className="report-section-title" style={{ marginTop: 26 }}>
                {lang === 'ar' ? '٦. المكافحة' : '6. Pest Control'}
              </h3>
              <div style={{ fontSize: '0.85rem', marginBottom: 8 }}>
                {lang === 'ar' ? `عدد زيارات المكافحة خلال الفترة: ${ops.pestVisits.length}` : `Pest control visits during the period: ${ops.pestVisits.length}`}
              </div>
              {ops.pestVisits.length === 0 ? (
                <div className="empty-state">{lang === 'ar' ? 'لا يوجد' : 'None'}</div>
              ) : (
                <ul style={{ margin: 0, paddingInlineStart: 20, fontSize: '0.85rem' }}>
                  {ops.pestVisits.map((v) => (
                    <li key={v.id}>
                      {v.visitDate} — {v.companyName}
                    </li>
                  ))}
                </ul>
              )}

              {/* Section 7 — Shift Notes */}
              <h3 className="report-section-title" style={{ marginTop: 26 }}>
                {lang === 'ar' ? '٧. ملاحظات الشفت' : '7. Shift Notes'}
              </h3>
              {ops.shiftNotesInRange.length === 0 ? (
                <div className="empty-state">{lang === 'ar' ? 'لا يوجد' : 'None'}</div>
              ) : (
                <ul style={{ margin: 0, paddingInlineStart: 20, fontSize: '0.85rem' }}>
                  {ops.shiftNotesInRange.map((n) => (
                    <li key={n.id}>
                      {n.date} — {n.text}
                    </li>
                  ))}
                </ul>
              )}

              {/* Section 8 — Personal Hygiene */}
              <h3 className="report-section-title" style={{ marginTop: 26 }}>
                {lang === 'ar' ? '٨. النظافة الشخصية' : '8. Personal Hygiene'}
              </h3>
              <div style={{ fontSize: '0.85rem' }}>
                {lang === 'ar'
                  ? `عدد المخالفات: ${ops.violations.length} (خصم: ${ops.deductionCount} — إنذار: ${ops.warningCount})`
                  : `Violations: ${ops.violations.length} (Deductions: ${ops.deductionCount} — Warnings: ${ops.warningCount})`}
              </div>

              {/* Section 9 — Deep Cleaning */}
              <h3 className="report-section-title" style={{ marginTop: 26 }}>
                {lang === 'ar' ? '٩. النظافة العميقة' : '9. Deep Cleaning'}
              </h3>
              <div style={{ fontSize: '0.85rem' }}>
                {lang === 'ar'
                  ? `عدد البنود: ${ops.deepCleaningItemCount} — نسبة الإنجاز خلال الفترة: ${ops.deepCleaningCompletionPercent}%`
                  : `Number of elements: ${ops.deepCleaningItemCount} — Completion rate during the period: ${ops.deepCleaningCompletionPercent}%`}
              </div>

              {/* Section 10 — Training */}
              <h3 className="report-section-title" style={{ marginTop: 26 }}>
                {lang === 'ar' ? '١٠. التدريب' : '10. Training'}
              </h3>
              <div style={{ fontSize: '0.85rem', marginBottom: 8 }}>
                {lang === 'ar'
                  ? `تنفيذ الخطة: تم ${ops.trainingPlanDone.length} — لم يتم ${ops.trainingPlanPending.length} — عدد المتدربين إجمالًا خلال الفترة: ${ops.totalTrainees}`
                  : `Plan execution: Done ${ops.trainingPlanDone.length} — Not Done ${ops.trainingPlanPending.length} — Total trainees during the period: ${ops.totalTrainees}`}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>
                {lang === 'ar' ? 'تدريبات غير مخططة تم تنفيذها' : 'Unplanned Trainings Delivered'} ({ops.unplannedRecords.length})
              </div>
              {ops.unplannedRecords.length === 0 ? (
                <div className="empty-state">{lang === 'ar' ? 'لا يوجد' : 'None'}</div>
              ) : (
                <ul style={{ margin: 0, paddingInlineStart: 20, fontSize: '0.85rem' }}>
                  {ops.unplannedRecords.map((r) => (
                    <li key={r.id}>
                      {r.date} — {r.programName} ({lang === 'ar' ? 'عدد المتدربين' : 'trainees'}: {r.traineeCount}, {lang === 'ar' ? 'القائم بالتدريب' : 'trainer'}: {r.trainerName})
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 50, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div>{t('doctorName')}: {setupDoctor || settings.doctorName || '—'}</div>
              <div>{t('doctorCode')}: {settings.doctorCode || '—'}</div>
              <div style={{ borderTop: '1px solid var(--outline)', width: 200, marginTop: 30, paddingTop: 6 }}>
                {lang === 'ar' ? 'التوقيع' : 'Signature'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeReport === 'monthly_receiving') {
    const rows = monthlyReceivingRows(setupDate);
    return (
      <div>
        <div className="toolbar no-print">
          <button className="btn btn-outline" onClick={() => setActiveReport(null)}>
            {lang === 'ar' ? 'رجوع' : 'Back'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => saveAndExport(activeReport)}>
              {t('exportExcel')}
            </button>
            <button className="btn btn-primary" onClick={() => window.print()}>
              🖨️ {t('print')}
            </button>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {settings.companyLogo && <img src={settings.companyLogo} alt="logo" style={{ height: 50 }} />}
              <div>
                <div style={{ fontWeight: 800 }}>{settings.companyName || 'Company Name'}</div>
                {setupSite && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>
                    {lang === 'ar' ? 'الموقع' : 'Site'}: {setupSite}
                  </div>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'end' }}>
              <div style={{ fontWeight: 800 }}>{reportTitle(activeReport)}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>
                {new Date().toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
              </div>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="empty-state">{t('noData')}</div>
          ) : (
            <>
              <div className="desktop-only-table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{lang === 'ar' ? 'الموقع' : 'Site'}</th>
                      <th>{t('supplier')}</th>
                      <th>{t('name')}</th>
                      <th>{t('productionDate')}</th>
                      <th>{t('expiryDate')}</th>
                      <th>{t('status')}</th>
                      <th>{lang === 'ar' ? 'حرارة السيارة' : 'Vehicle Temp'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ session, row }, i) => (
                      <tr key={row.id}>
                        <td>{i + 1}</td>
                        <td>{session.siteName}</td>
                        <td>{session.supplierName}</td>
                        <td>{row.productName}</td>
                        <td>{row.productionDate}</td>
                        <td>{row.expiryDate}</td>
                        <td>
                          <StatusBadge status={row.status} />
                        </td>
                        <td>{session.vehicleTemp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mobile-cards no-print">
                {rows.map(({ session, row }, i) => (
                  <div className="record-card" key={row.id}>
                    <div className="record-card-header">
                      <div className="record-card-title">
                        {i + 1}. {row.productName}
                      </div>
                      <StatusBadge status={row.status} />
                    </div>
                    <div className="record-card-row">
                      <span>{lang === 'ar' ? 'الموقع' : 'Site'}</span>
                      <span>{session.siteName}</span>
                    </div>
                    <div className="record-card-row">
                      <span>{t('expiryDate')}</span>
                      <span>{row.expiryDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 50, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div>{t('doctorName')}: {setupDoctor || settings.doctorName || '—'}</div>
              <div>{t('doctorCode')}: {settings.doctorCode || '—'}</div>
              <div style={{ borderTop: '1px solid var(--outline)', width: 200, marginTop: 30, paddingTop: 6 }}>
                {lang === 'ar' ? 'التوقيع' : 'Signature'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeReport === 'expiry_followup') {
    const groups = expiryFollowupGroups();
    return (
      <div>
        <div className="toolbar no-print">
          <button className="btn btn-outline" onClick={() => setActiveReport(null)}>
            {lang === 'ar' ? 'رجوع' : 'Back'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => saveAndExport(activeReport)}>
              {t('exportExcel')}
            </button>
            <button className="btn btn-primary" onClick={() => window.print()}>
              🖨️ {t('print')}
            </button>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {settings.companyLogo && <img src={settings.companyLogo} alt="logo" style={{ height: 50 }} />}
              <div>
                <div style={{ fontWeight: 800 }}>{settings.companyName || 'Company Name'}</div>
                {setupSite && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>
                    {lang === 'ar' ? 'الموقع' : 'Site'}: {setupSite}
                  </div>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'end' }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{reportTitle(activeReport)}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>
                {new Date().toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
              </div>
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="empty-state">{t('noData')}</div>
          ) : (
            groups.map((cat, ci) => (
              <div key={cat.categoryId} style={{ marginBottom: 26, pageBreakInside: 'avoid' }}>
                <h3 className="report-section-title">
                  {ci + 1}. {cat.categoryName}
                </h3>
                {cat.products.map((pg) => (
                  <div key={pg.product.id} style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', margin: '10px 0 6px' }}>{pg.product.name}</div>
                    <div className="desktop-only-table">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>{t('productionDate')}</th>
                            <th>{t('expiryDate')}</th>
                            <th>{t('remainingDays')}</th>
                            <th>{t('status')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pg.batches.map((r) => (
                            <tr key={r.batch.id}>
                              <td>{r.batch.productionDate}</td>
                              <td>{r.batch.expiryDate}</td>
                              <td>{r.remainingDays}</td>
                              <td>
                                <StatusBadge status={r.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 50, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div>{t('doctorName')}: {setupDoctor || settings.doctorName || '—'}</div>
              <div>{t('doctorCode')}: {settings.doctorCode || '—'}</div>
              <div style={{ borderTop: '1px solid var(--outline)', width: 200, marginTop: 30, paddingTop: 6 }}>
                {lang === 'ar' ? 'التوقيع' : 'Signature'}
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>{lang === 'ar' ? 'صفحة 1' : 'Page 1'}</div>
          </div>
        </div>
      </div>
    );
  }

  if (activeReport === 'maintenance') {
    const data = maintenanceReportData();
    const monthLabelStr = new Date(setupDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
    return (
      <div>
        <div className="toolbar no-print">
          <button className="btn btn-outline" onClick={() => setActiveReport(null)}>
            {lang === 'ar' ? 'رجوع' : 'Back'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => saveAndExport(activeReport)}>
              {t('exportExcel')}
            </button>
            <button className="btn btn-primary" onClick={() => window.print()}>
              🖨️ {t('print')}
            </button>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {settings.companyLogo && <img src={settings.companyLogo} alt="logo" style={{ height: 50 }} />}
              <div>
                <div style={{ fontWeight: 800 }}>{settings.companyName || 'Company Name'}</div>
                {setupSite && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>
                    {lang === 'ar' ? 'الموقع' : 'Site'}: {setupSite}
                  </div>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'end' }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{reportTitle(activeReport)}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>{monthLabelStr}</div>
            </div>
          </div>

          <h3 className="report-section-title">{lang === 'ar' ? '١. زيارات الصيانة هذا الشهر' : '1. Visits This Month'}</h3>
          <div style={{ fontSize: '0.85rem', marginBottom: 8 }}>
            {lang === 'ar' ? `عدد الزيارات: ${data.visits.length}` : `Number of visits: ${data.visits.length}`}
          </div>
          <div className="desktop-only-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th>{lang === 'ar' ? 'الفني' : 'Technician'}</th>
                  <th>{lang === 'ar' ? 'المشرف' : 'Supervisor'}</th>
                </tr>
              </thead>
              <tbody>
                {data.visits.length === 0 ? (
                  <tr>
                    <td colSpan={3}>{lang === 'ar' ? 'لا توجد زيارات' : 'No visits'}</td>
                  </tr>
                ) : (
                  data.visits.map((v) => (
                    <tr key={v.id}>
                      <td>{v.visitDate}</td>
                      <td>{v.technicianName}</td>
                      <td>{v.supervisorName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h3 className="report-section-title">{lang === 'ar' ? '٢. خطة الصيانة الوقائية — ما تم' : '2. Preventive Plan — Completed'}</h3>
          <div className="desktop-only-table">
            <table className="data-table">
              <tbody>
                {data.planDone.length === 0 ? (
                  <tr>
                    <td>{lang === 'ar' ? 'لا يوجد' : 'None'}</td>
                  </tr>
                ) : (
                  data.planDone.map((i) => (
                    <tr key={i.id}>
                      <td>{i.elementName}</td>
                      <td>{i.doneDate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h3 className="report-section-title">{lang === 'ar' ? '٣. خطة الصيانة الوقائية — لم يتم' : '3. Preventive Plan — Not Done'}</h3>
          <div className="desktop-only-table">
            <table className="data-table">
              <tbody>
                {data.planPending.length === 0 ? (
                  <tr>
                    <td>{lang === 'ar' ? 'لا يوجد' : 'None'}</td>
                  </tr>
                ) : (
                  data.planPending.map((i) => (
                    <tr key={i.id}>
                      <td>{i.elementName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h3 className="report-section-title">{lang === 'ar' ? '٤. طلبات الصيانة المغلقة هذا الشهر' : '4. Requests Closed This Month'}</h3>
          <div className="desktop-only-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{lang === 'ar' ? 'الوصف' : 'Description'}</th>
                  <th>{lang === 'ar' ? 'تاريخ الإنهاء' : 'Closed Date'}</th>
                  <th>{lang === 'ar' ? 'من أغلق الطلب' : 'Closed By'}</th>
                </tr>
              </thead>
              <tbody>
                {data.requestsClosedThisMonth.length === 0 ? (
                  <tr>
                    <td colSpan={3}>{lang === 'ar' ? 'لا يوجد' : 'None'}</td>
                  </tr>
                ) : (
                  data.requestsClosedThisMonth.map((r) => (
                    <tr key={r.id}>
                      <td>{r.description}</td>
                      <td>{r.closedDate}</td>
                      <td>{r.closedByName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h3 className="report-section-title">{lang === 'ar' ? '٥. طلبات الصيانة المعلقة حاليًا' : '5. Currently Pending Requests'}</h3>
          <div className="desktop-only-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{lang === 'ar' ? 'الوصف' : 'Description'}</th>
                  <th>{lang === 'ar' ? 'تاريخ الطلب' : 'Request Date'}</th>
                  <th>{lang === 'ar' ? 'مقدم الطلب' : 'Requester'}</th>
                </tr>
              </thead>
              <tbody>
                {data.requestsStillPending.length === 0 ? (
                  <tr>
                    <td colSpan={3}>{lang === 'ar' ? 'لا يوجد' : 'None'}</td>
                  </tr>
                ) : (
                  data.requestsStillPending.map((r) => (
                    <tr key={r.id}>
                      <td>{r.description}</td>
                      <td>{r.requestDate}</td>
                      <td>{r.requesterName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 50, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div>{t('doctorName')}: {setupDoctor || settings.doctorName || '—'}</div>
              <div>{t('doctorCode')}: {settings.doctorCode || '—'}</div>
              <div style={{ borderTop: '1px solid var(--outline)', width: 200, marginTop: 30, paddingTop: 6 }}>
                {lang === 'ar' ? 'التوقيع' : 'Signature'}
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>{lang === 'ar' ? 'صفحة 1' : 'Page 1'}</div>
          </div>
        </div>
      </div>
    );
  }

  if (activeReport === 'hygiene_violations') {
    const from = setupDate;
    const to = setupEndDate >= setupDate ? setupEndDate : setupDate;
    const employeeById = new Map(employees.map((e) => [e.id, e]));
    const rows = hygieneViolations
      .filter((v) => v.siteName === setupSite && v.date >= from && v.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date));
    const warningCount = rows.filter((v) => v.status === 'warning').length;
    const deductionCount = rows.filter((v) => v.status === 'deduction').length;

    return (
      <div>
        <div className="toolbar no-print">
          <button className="btn btn-outline" onClick={() => setActiveReport(null)}>
            {lang === 'ar' ? 'رجوع' : 'Back'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => saveAndExport(activeReport)}>
              {t('exportExcel')}
            </button>
            <button className="btn btn-primary" onClick={() => window.print()}>
              🖨️ {t('print')}
            </button>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {settings.companyLogo && <img src={settings.companyLogo} alt="logo" style={{ height: 50 }} />}
              <div>
                <div style={{ fontWeight: 800 }}>{settings.companyName || 'Company Name'}</div>
                {setupSite && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>
                    {lang === 'ar' ? 'الموقع' : 'Site'}: {setupSite}
                  </div>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'end' }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{reportTitle(activeReport)}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>
                {lang === 'ar' ? `الفترة: ${from} إلى ${to}` : `Period: ${from} to ${to}`}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', marginBottom: 12 }}>
            {lang === 'ar'
              ? `إجمالي المخالفات: ${rows.length} (خصم: ${deductionCount} — إنذار: ${warningCount})`
              : `Total violations: ${rows.length} (Deductions: ${deductionCount} — Warnings: ${warningCount})`}
          </div>

          <div className="desktop-only-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th>{lang === 'ar' ? 'اسم الموظف' : 'Employee'}</th>
                  <th>{lang === 'ar' ? 'الكود' : 'Code'}</th>
                  <th>{lang === 'ar' ? 'المخالفة' : 'Violation'}</th>
                  <th>{lang === 'ar' ? 'الإجراء' : 'Action'}</th>
                  <th>{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th>{lang === 'ar' ? 'المشرف المباشر' : 'Direct Supervisor'}</th>
                  <th>{lang === 'ar' ? 'القائم بالتفتيش' : 'Inspector'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8}>{t('noData')}</td>
                  </tr>
                ) : (
                  rows.map((v) => {
                    const emp = employeeById.get(v.employeeId);
                    return (
                      <tr key={v.id}>
                        <td>{v.date}</td>
                        <td>{emp?.name ?? '—'}</td>
                        <td>{emp?.code ?? '—'}</td>
                        <td>{v.violation}</td>
                        <td>{v.correctiveAction}</td>
                        <td>{v.status === 'deduction' ? (lang === 'ar' ? 'خصم' : 'Deduction') : lang === 'ar' ? 'إنذار' : 'Warning'}</td>
                        <td>{v.directSupervisorName}</td>
                        <td>{v.inspectorName}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 50, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div>{t('doctorName')}: {setupDoctor || settings.doctorName || '—'}</div>
              <div>{t('doctorCode')}: {settings.doctorCode || '—'}</div>
              <div style={{ borderTop: '1px solid var(--outline)', width: 200, marginTop: 30, paddingTop: 6 }}>
                {lang === 'ar' ? 'التوقيع' : 'Signature'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeReport) {
    const list = filteredForReport(activeReport);
    return (
      <div>
        <div className="toolbar no-print">
          <button className="btn btn-outline" onClick={() => setActiveReport(null)}>
            {lang === 'ar' ? 'رجوع' : 'Back'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => saveAndExport(activeReport)}>
              {t('exportExcel')}
            </button>
            <button className="btn btn-primary" onClick={() => window.print()}>
              🖨️ {t('print')}
            </button>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {settings.companyLogo && <img src={settings.companyLogo} alt="logo" style={{ height: 50 }} />}
              <div>
                <div style={{ fontWeight: 800 }}>{settings.companyName || 'Company Name'}</div>
                {setupSite && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>
                    {lang === 'ar' ? 'الموقع' : 'Site'}: {setupSite}
                  </div>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'end' }}>
              <div style={{ fontWeight: 800 }}>{reportTitle(activeReport)}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>
                {new Date().toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
              </div>
            </div>
          </div>

          <div className="desktop-only-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('name')}</th>
                  <th>{t('category')}</th>
                  <th>{t('productionDate')}</th>
                  <th>{t('expiryDate')}</th>
                  <th>{t('remainingDays')}</th>
                  <th>{t('consumption')}</th>
                  <th>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r, i) => (
                  <tr key={r.batch.id}>
                    <td>{i + 1}</td>
                    <td>{r.product!.name}</td>
                    <td>{catName(r.product!.categoryId)}</td>
                    <td>{r.batch.productionDate}</td>
                    <td>{r.batch.expiryDate}</td>
                    <td>{r.remainingDays}</td>
                    <td>{r.consumptionPercent.toFixed(0)}%</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-cards no-print">
            {list.map((r, i) => (
              <div className="record-card" key={r.batch.id}>
                <div className="record-card-header">
                  <div className="record-card-title">
                    {i + 1}. {r.product!.name}
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="record-card-row">
                  <span>{t('category')}</span>
                  <span>{catName(r.product!.categoryId)}</span>
                </div>
                <div className="record-card-row">
                  <span>{t('expiryDate')}</span>
                  <span>{r.batch.expiryDate}</span>
                </div>
                <div className="record-card-row">
                  <span>{t('remainingDays')}</span>
                  <span>
                    {r.remainingDays} · {r.consumptionPercent.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 50, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div>{t('doctorName')}: {setupDoctor || settings.doctorName || '—'}</div>
              <div>{t('doctorCode')}: {settings.doctorCode || '—'}</div>
              <div style={{ borderTop: '1px solid var(--outline)', width: 200, marginTop: 30, paddingTop: 6 }}>
                {lang === 'ar' ? 'التوقيع' : 'Signature'}
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>{lang === 'ar' ? 'صفحة 1' : 'Page 1'}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="quick-nav-grid">
        {REPORT_TYPES.map((r) => (
          <div
            key={r.type}
            className="quick-nav-card"
            onClick={() => (r.type === 'health_certificates' ? navigate('healthCertificates') : openReportSetup(r.type))}
          >
            <div className="quick-nav-icon">{r.icon}</div>
            {lang === 'ar' ? r.ar : r.en}
          </div>
        ))}
      </div>
      {REPORT_TYPES.find((r) => r.type === 'expiry_followup') && (
        <div className="card" style={{ maxWidth: 320, marginTop: 10 }}>
          <div className="form-field">
            <label>{lang === 'ar' ? 'فلترة "متابعة الصلاحية" على' : '"Expiry Follow-up" filters to'}</label>
            <Autocomplete
              value={categoryFilter}
              onChange={setCategoryFilter}
              allowEmptyOption={{ value: '', label: lang === 'ar' ? 'كل الفئات' : 'All Categories' }}
              options={categories.map((c) => ({ value: c.id, label: catName(c.id) }))}
              placeholder={lang === 'ar' ? 'كل الفئات' : 'All Categories'}
            />
          </div>
        </div>
      )}

      {showSetupDialog && (
        <Modal title={lang === 'ar' ? 'بيانات التقرير' : 'Report Details'} onClose={() => setShowSetupDialog(false)}>
          <div className="form-grid">
            <div className="form-field">
              <label>{lang === 'ar' ? 'الموقع' : 'Site'}</label>
              <Autocomplete
                value={setupSite}
                onChange={setSetupSite}
                allowEmptyOption={{ value: '', label: lang === 'ar' ? '— اختر —' : '— Select —' }}
                options={settings.siteNames.map((n) => ({ value: n, label: n }))}
                placeholder={lang === 'ar' ? '— اختر —' : '— Select —'}
              />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'طبيب الجودة' : 'Quality Doctor'}</label>
              <input value={setupDoctor} onChange={(e) => setSetupDoctor(e.target.value)} />
            </div>
            <div className="form-field">
              <label>{pendingType === 'full' || pendingType === 'hygiene_violations' ? (lang === 'ar' ? 'من تاريخ' : 'From Date') : lang === 'ar' ? 'تاريخ التقرير' : 'Report Date'}</label>
              <DateInput value={setupDate} onChange={setSetupDate} />
            </div>
            {(pendingType === 'full' || pendingType === 'hygiene_violations') && (
              <div className="form-field">
                <label>{lang === 'ar' ? 'إلى تاريخ' : 'To Date'}</label>
                <DateInput value={setupEndDate} onChange={setSetupEndDate} />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setShowSetupDialog(false)}>
              {t('cancel')}
            </button>
            <button className="btn btn-primary" onClick={confirmReportSetup}>
              {lang === 'ar' ? 'توليد التقرير' : 'Generate Report'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
