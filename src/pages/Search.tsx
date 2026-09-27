import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter, type Route } from '../router/Router';
import {
  BatchRepo,
  CategoryRepo,
  ProductRepo,
  EmployeeRepo,
  HealthCertificateRepo,
  NonConformingRepo,
  ReceivingRepo,
  MaintenancePlanRepo,
  MaintenanceVisitRepo,
  MaintenanceRequestRepo,
  ShiftNoteRepo,
  PestControlRepo,
  TrainingPlanRepo,
  TrainingRecordRepo,
  HygieneViolationRepo,
  DeepCleaningPlanRepo,
  DeepCleaningExecutionRepo,
  DocumentReminderRepo
} from '../db/repositories';
import type { Batch, Category, Product, ProductStatus } from '../types';
import { computeBatchStatus } from '../engine/shelfLifeEngine';
import DateInput from '../components/common/DateInput';
import StatusBadge from '../components/common/StatusBadge';
import Autocomplete from '../components/common/Autocomplete';

interface GeneralResult {
  id: string;
  moduleLabel: string;
  icon: string;
  title: string;
  subtitle?: string;
  route: Route;
}

export default function Search() {
  const { t, lang } = useApp();
  const { navigate } = useRouter();

  // --- General search (across the whole app) ---
  const [generalQuery, setGeneralQuery] = useState('');
  const [everything, setEverything] = useState<GeneralResult[] | null>(null);

  useEffect(() => {
    (async () => {
      const [
        products,
        categories,
        employees,
        certificates,
        nonConforming,
        receiving,
        maintPlan,
        maintVisits,
        maintRequests,
        shiftNotes,
        pestVisits,
        trainingPlan,
        trainingRecords,
        hygiene,
        deepPlan,
        deepExec,
        documents
      ] = await Promise.all([
        ProductRepo.all(),
        CategoryRepo.all(),
        EmployeeRepo.all(),
        HealthCertificateRepo.all(),
        NonConformingRepo.all(),
        ReceivingRepo.all(),
        MaintenancePlanRepo.all(),
        MaintenanceVisitRepo.all(),
        MaintenanceRequestRepo.all(),
        ShiftNoteRepo.all(),
        PestControlRepo.all(),
        TrainingPlanRepo.all(),
        TrainingRecordRepo.all(),
        HygieneViolationRepo.all(),
        DeepCleaningPlanRepo.all(),
        DeepCleaningExecutionRepo.all(),
        DocumentReminderRepo.all()
      ]);

      const employeeById = new Map(employees.map((e) => [e.id, e]));
      const results: GeneralResult[] = [];

      products.forEach((p) =>
        results.push({ id: p.id, moduleLabel: lang === 'ar' ? 'المنتجات' : 'Products', icon: '📦', title: p.name, route: 'products' })
      );
      categories.forEach((c) =>
        results.push({
          id: c.id,
          moduleLabel: lang === 'ar' ? 'الفئات' : 'Categories',
          icon: '🗂️',
          title: lang === 'ar' ? c.nameAr || c.name : c.name,
          route: 'categories'
        })
      );
      employees.forEach((e) =>
        results.push({
          id: e.id,
          moduleLabel: lang === 'ar' ? 'الموظفون' : 'Employees',
          icon: '🧑‍🤝‍🧑',
          title: e.name,
          subtitle: e.code,
          route: 'healthCertificates'
        })
      );
      certificates.forEach((c) => {
        const emp = employeeById.get(c.employeeId);
        results.push({
          id: c.id,
          moduleLabel: lang === 'ar' ? 'الشهادات الصحية' : 'Health Certificates',
          icon: '🩺',
          title: emp?.name ?? '—',
          subtitle: c.siteName,
          route: 'healthCertificates'
        });
      });
      nonConforming.forEach((r) =>
        results.push({
          id: r.id,
          moduleLabel: lang === 'ar' ? 'منتجات غير مطابقة' : 'Non-Conforming',
          icon: '⚠️',
          title: r.productName,
          subtitle: r.reason,
          route: 'nonConforming'
        })
      );
      receiving.forEach((r) =>
        results.push({
          id: r.id,
          moduleLabel: lang === 'ar' ? 'سجل الاستلام' : 'Receiving',
          icon: '🚚',
          title: r.siteName,
          subtitle: r.supplierName,
          route: 'receiving'
        })
      );
      maintPlan.forEach((i) =>
        results.push({
          id: i.id,
          moduleLabel: lang === 'ar' ? 'خطة الصيانة' : 'Maintenance Plan',
          icon: '🔧',
          title: i.elementName,
          subtitle: i.siteName,
          route: 'maintenance'
        })
      );
      maintVisits.forEach((v) =>
        results.push({
          id: v.id,
          moduleLabel: lang === 'ar' ? 'زيارات الصيانة' : 'Maintenance Visits',
          icon: '🔧',
          title: v.technicianName,
          subtitle: `${v.siteName} — ${v.companyName ?? ''}`,
          route: 'maintenance'
        })
      );
      maintRequests.forEach((r) =>
        results.push({
          id: r.id,
          moduleLabel: lang === 'ar' ? 'طلبات الصيانة' : 'Maintenance Requests',
          icon: '🔧',
          title: r.description,
          subtitle: r.siteName,
          route: 'maintenance'
        })
      );
      shiftNotes.forEach((n) =>
        results.push({
          id: n.id,
          moduleLabel: lang === 'ar' ? 'ملاحظات الشفت' : 'Shift Notes',
          icon: '📝',
          title: n.text,
          subtitle: n.siteName,
          route: 'shiftNotes'
        })
      );
      pestVisits.forEach((v) =>
        results.push({
          id: v.id,
          moduleLabel: lang === 'ar' ? 'المكافحة' : 'Pest Control',
          icon: '🐜',
          title: v.companyName,
          subtitle: v.siteName,
          route: 'pestControl'
        })
      );
      trainingPlan.forEach((i) =>
        results.push({
          id: i.id,
          moduleLabel: lang === 'ar' ? 'خطة التدريب' : 'Training Plan',
          icon: '🎓',
          title: i.topic,
          subtitle: i.targetAudience,
          route: 'training'
        })
      );
      trainingRecords.forEach((r) =>
        results.push({
          id: r.id,
          moduleLabel: lang === 'ar' ? 'سجلات التدريب' : 'Training Records',
          icon: '🎓',
          title: r.programName,
          subtitle: r.siteName,
          route: 'training'
        })
      );
      hygiene.forEach((v) => {
        const emp = employeeById.get(v.employeeId);
        results.push({
          id: v.id,
          moduleLabel: lang === 'ar' ? 'النظافة الشخصية' : 'Personal Hygiene',
          icon: '🧼',
          title: v.violation,
          subtitle: emp?.name,
          route: 'personalHygiene'
        });
      });
      deepPlan.forEach((i) =>
        results.push({
          id: i.id,
          moduleLabel: lang === 'ar' ? 'خطة النظافة العميقة' : 'Deep Cleaning Plan',
          icon: '🧽',
          title: i.elementName,
          subtitle: i.siteName,
          route: 'deepCleaning'
        })
      );
      deepExec.forEach((e) =>
        results.push({
          id: e.id,
          moduleLabel: lang === 'ar' ? 'تنفيذ النظافة العميقة' : 'Deep Cleaning Execution',
          icon: '🧽',
          title: e.elementName,
          subtitle: e.siteName,
          route: 'deepCleaning'
        })
      );
      documents.forEach((d) =>
        results.push({
          id: d.id,
          moduleLabel: lang === 'ar' ? 'منبه المستندات' : 'Document Reminder',
          icon: '🔔',
          title: d.documentName,
          subtitle: d.belongsTo,
          route: 'documentReminders'
        })
      );

      setEverything(results);
    })();
  }, [lang]);

  const generalResults = useMemo(() => {
    const q = generalQuery.trim().toLowerCase();
    if (!q || !everything) return [];
    return everything.filter((r) => r.title.toLowerCase().includes(q) || (r.subtitle && r.subtitle.toLowerCase().includes(q)));
  }, [generalQuery, everything]);

  const groupedGeneralResults = useMemo(() => {
    const groups = new Map<string, GeneralResult[]>();
    generalResults.forEach((r) => {
      if (!groups.has(r.moduleLabel)) groups.set(r.moduleLabel, []);
      groups.get(r.moduleLabel)!.push(r);
    });
    return Array.from(groups.entries());
  }, [generalResults]);

  // --- Advanced product search (kept as-is: category/status/expiry-date filters) ---
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | ''>('');
  const [beforeDate, setBeforeDate] = useState('');

  useEffect(() => {
    (async () => {
      setProducts(await ProductRepo.all());
      setCategories(await CategoryRepo.all());
      setBatches(await BatchRepo.all());
    })();
  }, []);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const catName = (id: string) => {
    const c = categories.find((c) => c.id === id);
    if (!c) return '—';
    return lang === 'ar' ? c.nameAr || c.name : c.name;
  };

  const results = useMemo(() => {
    return batches
      .map((b) => {
        const product = productMap.get(b.productId);
        const computed = computeBatchStatus(b.productionDate, b.expiryDate, b.halfLifeDate, b.shelfLifeValue, b.shelfLifeUnit);
        return { batch: b, product, ...computed };
      })
      .filter((r) => {
        if (!r.product) return false;
        if (query && !r.product.name.toLowerCase().includes(query.toLowerCase())) return false;
        if (categoryFilter && r.product.categoryId !== categoryFilter) return false;
        if (statusFilter && r.status !== statusFilter) return false;
        if (beforeDate && r.batch.expiryDate > beforeDate) return false;
        return true;
      })
      .sort((a, b) => a.batch.expiryDate.localeCompare(b.batch.expiryDate));
  }, [batches, productMap, query, categoryFilter, statusFilter, beforeDate]);

  return (
    <div>
      {/* General search across the whole app */}
      <div className="card" style={{ marginBottom: 18 }}>
        <h2 className="section-title">{lang === 'ar' ? 'بحث عام' : 'General Search'}</h2>
        <input
          value={generalQuery}
          onChange={(e) => setGeneralQuery(e.target.value)}
          placeholder={lang === 'ar' ? 'ابحث في كل أقسام التطبيق...' : 'Search across the whole app...'}
        />
      </div>

      {generalQuery.trim() && (
        <div style={{ marginBottom: 24 }}>
          {groupedGeneralResults.length === 0 ? (
            <div className="card">
              <div className="empty-state">{t('noData')}</div>
            </div>
          ) : (
            groupedGeneralResults.map(([moduleLabel, items]) => (
              <div key={moduleLabel} className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 8, color: 'var(--on-surface-variant)' }}>{moduleLabel}</div>
                {items.map((r) => (
                  <div
                    key={r.id}
                    className="record-card"
                    style={{ marginBottom: 8, cursor: 'pointer' }}
                    onClick={() => navigate(r.route)}
                  >
                    <div className="record-card-header">
                      <div className="record-card-title">
                        {r.icon} {r.title}
                      </div>
                    </div>
                    {r.subtitle && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>{r.subtitle}</div>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* Advanced product search (unchanged functionality) */}
      <h2 className="section-title">{lang === 'ar' ? 'بحث متقدم في المنتجات' : 'Advanced Product Search'}</h2>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="form-grid">
          <div className="form-field">
            <label>{lang === 'ar' ? 'اسم المنتج' : 'Product Name'}</label>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={lang === 'ar' ? 'ابحث...' : 'Search...'} />
          </div>
          <div className="form-field">
            <label>{t('category')}</label>
            <Autocomplete
              value={categoryFilter}
              onChange={setCategoryFilter}
              allowEmptyOption={{ value: '', label: lang === 'ar' ? 'الكل' : 'All' }}
              options={categories.map((c) => ({ value: c.id, label: catName(c.id) }))}
              placeholder={lang === 'ar' ? 'الكل' : 'All'}
            />
          </div>
          <div className="form-field">
            <label>{t('status')}</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ProductStatus | '')}>
              <option value="">{lang === 'ar' ? 'الكل' : 'All'}</option>
              <option value="before_half">{t('beforeHalf')}</option>
              <option value="after_half">{t('afterHalf')}</option>
              <option value="near_expiry">{t('within30Days')}</option>
              <option value="expiring_soon">{t('expiringSoon')}</option>
              <option value="expired">{t('expiredProducts')}</option>
            </select>
          </div>
          <div className="form-field">
            <label>{lang === 'ar' ? 'الانتهاء قبل تاريخ' : 'Expiry Before'}</label>
            <DateInput value={beforeDate} onChange={setBeforeDate} />
          </div>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="card">
          <div className="empty-state">{t('noData')}</div>
        </div>
      ) : (
        <>
          <div className="card desktop-only-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('name')}</th>
                  <th>{t('category')}</th>
                  <th>{t('productionDate')}</th>
                  <th>{t('expiryDate')}</th>
                  <th>{t('remainingDays')}</th>
                  <th>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {results.map(({ batch, product, remainingDays, status }) => (
                  <tr key={batch.id}>
                    <td>{product?.name}</td>
                    <td>{catName(product?.categoryId ?? '')}</td>
                    <td>{batch.productionDate}</td>
                    <td>{batch.expiryDate}</td>
                    <td>{remainingDays}</td>
                    <td>
                      <StatusBadge status={status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-cards">
            {results.map(({ batch, product, remainingDays, status }) => (
              <div className="record-card" key={batch.id}>
                <div className="record-card-header">
                  <div className="record-card-title">{product?.name}</div>
                  <StatusBadge status={status} />
                </div>
                <div className="record-card-row">
                  <span>{t('category')}</span>
                  <span>{catName(product?.categoryId ?? '')}</span>
                </div>
                <div className="record-card-row">
                  <span>{t('expiryDate')}</span>
                  <span>{batch.expiryDate}</span>
                </div>
                <div className="record-card-row">
                  <span>{t('remainingDays')}</span>
                  <span>{remainingDays}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
