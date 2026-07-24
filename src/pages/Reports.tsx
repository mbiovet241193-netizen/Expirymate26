import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { BatchRepo, CategoryRepo, ProductRepo, ReportRepo, ReceivingRepo } from '../db/repositories';
import { generateId } from '../db/db';
import type { Batch, Category, Product, ReceivingSession, ReportType } from '../types';
import { computeBatchStatus, isShortShelfLife } from '../engine/shelfLifeEngine';
import StatusBadge from '../components/common/StatusBadge';
import { exportToCsv } from '../utils/export';
import Modal from '../components/common/Modal';
import Autocomplete from '../components/common/Autocomplete';
import { useRouter } from '../router/Router';

const REPORT_TYPES: { type: ReportType; ar: string; en: string; icon: string }[] = [
  { type: 'full', ar: 'تقرير شامل', en: 'Full Report', icon: '📋' },
  { type: 'expired', ar: 'منتجات منتهية', en: 'Expired Products', icon: '🔴' },
  { type: 'near_expiry', ar: 'قريبة من الانتهاء', en: 'Near Expiry', icon: '🔵' },
  { type: 'expiring_soon', ar: 'تنتهي قريباً', en: 'Expiring Soon', icon: '⏰' },
  { type: 'within_shelf_life', ar: 'ضمن مدة الصلاحية', en: 'Within Shelf Life', icon: '🟢' },
  { type: 'after_half', ar: 'تجاوز نصف مدة الصلاحية', en: 'Passed Half Shelf Life', icon: '🟡' },
  { type: 'by_category', ar: 'حسب الفئة', en: 'By Category', icon: '🗂️' },
  { type: 'monthly_receiving', ar: 'تقرير الاستلام الشهري', en: 'Monthly Receiving Report', icon: '🚚' },
  { type: 'health_certificates', ar: 'تقرير الشهادات الصحية', en: 'Health Certificates Report', icon: '🩺' }
];

export default function Reports() {
  const { t, lang, settings } = useApp();
  const { navigate } = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [receivingSessions, setReceivingSessions] = useState<ReceivingSession[]>([]);
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');

  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [pendingType, setPendingType] = useState<ReportType | null>(null);
  const [setupSite, setSetupSite] = useState('');
  const [setupDoctor, setSetupDoctor] = useState('');
  const [setupDate, setSetupDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    (async () => {
      setProducts(await ProductRepo.all());
      setCategories(await CategoryRepo.all());
      setBatches(await BatchRepo.all());
      setReceivingSessions(await ReceivingRepo.all());
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
    shortRule: isShortShelfLife(b.shelfLifeValue, b.shelfLifeUnit),
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

  const filteredForReport = (type: ReportType) => {
    let list = computedBatches.filter((r) => r.product);
    if (type === 'expired') list = list.filter((r) => r.status === 'expired');
    if (type === 'near_expiry') list = list.filter((r) => r.status === 'near_expiry');
    if (type === 'expiring_soon') list = list.filter((r) => r.status === 'near_expiry' && r.shortRule);
    if (type === 'within_shelf_life') list = list.filter((r) => r.status === 'within_shelf_life');
    if (type === 'after_half') list = list.filter((r) => r.status === 'after_half');
    if (type === 'by_category' && categoryFilter) list = list.filter((r) => r.product!.categoryId === categoryFilter);
    return list.sort((a, b) => a.batch.expiryDate.localeCompare(b.batch.expiryDate));
  };

  const reportTitle = (type: ReportType) => {
    const meta = REPORT_TYPES.find((r) => r.type === type)!;
    const dateLabel = setupDate ? new Date(setupDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US');
    return `${lang === 'ar' ? meta.ar : meta.en} - ${dateLabel}`;
  };

  const openReportSetup = (type: ReportType) => {
    setPendingType(type);
    setSetupSite(settings.siteNames[0] ?? '');
    setSetupDoctor(settings.doctorName ?? '');
    setSetupDate(new Date().toISOString().slice(0, 10));
    setShowSetupDialog(true);
  };

  const confirmReportSetup = () => {
    if (!pendingType) return;
    setActiveReport(pendingType);
    setShowSetupDialog(false);
  };

  const saveAndExport = async (type: ReportType) => {
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
                          <StatusBadge status={row.status} shortRule={isShortShelfLife(row.shelfLifeValue, row.shelfLifeUnit)} />
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
                      <StatusBadge status={row.status} shortRule={isShortShelfLife(row.shelfLifeValue, row.shelfLifeUnit)} />
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
                      <StatusBadge status={r.status} shortRule={r.shortRule} />
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
                  <StatusBadge status={r.status} shortRule={r.shortRule} />
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
      {REPORT_TYPES.find((r) => r.type === 'by_category') && (
        <div className="card" style={{ maxWidth: 320, marginTop: 10 }}>
          <div className="form-field">
            <label>{lang === 'ar' ? 'فلترة "حسب الفئة" على' : '"By Category" filters to'}</label>
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
              <label>{lang === 'ar' ? 'تاريخ التقرير' : 'Report Date'}</label>
              <input type="date" value={setupDate} onChange={(e) => setSetupDate(e.target.value)} />
            </div>
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
