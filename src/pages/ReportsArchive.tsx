import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ReportRepo } from '../db/repositories';
import type { ReceivingSession, SavedReport } from '../types';
import { exportToCsv } from '../utils/export';
import StatusBadge from '../components/common/StatusBadge';

import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ReportRepo } from '../db/repositories';
import type { ReceivingSession, SavedReport } from '../types';
import { exportToCsv } from '../utils/export';
import StatusBadge from '../components/common/StatusBadge';

const COLUMN_LABELS: Record<string, { ar: string; en: string }> = {
  Product: { ar: 'المنتج', en: 'Product' },
  Category: { ar: 'الفئة', en: 'Category' },
  ProductionDate: { ar: 'تاريخ الإنتاج', en: 'Production Date' },
  ExpiryDate: { ar: 'تاريخ الانتهاء', en: 'Expiry Date' },
  RemainingDays: { ar: 'الأيام المتبقية', en: 'Remaining Days' },
  Consumption: { ar: 'نسبة الاستهلاك', en: 'Consumption' },
  Status: { ar: 'الحالة', en: 'Status' },
  Site: { ar: 'الموقع', en: 'Site' },
  Supplier: { ar: 'المورد', en: 'Supplier' },
  VehicleTemp: { ar: 'حرارة السيارة', en: 'Vehicle Temp' },
  ProductTemp: { ar: 'حرارة المنتج', en: 'Product Temp' },
  Notes: { ar: 'ملاحظات', en: 'Notes' },
  Date: { ar: 'التاريخ', en: 'Date' },
  Reason: { ar: 'السبب', en: 'Reason' },
  Decision: { ar: 'القرار', en: 'Decision' }
};

interface NonConformingReportPayload {
  site: string;
  doctorName: string;
  doctorCode: string;
  reportDate: string;
  records: { productName: string; category: string; date: string; reason: string; decision: string; notes?: string }[];
}

interface HealthCertificateReportPayload {
  siteName: string;
  scope: string;
  rows: {
    employeeCode: string;
    employeeName: string;
    jobTitle: string;
    expiryDate: string;
    remainingDays: number;
    status: string;
    notes?: string;
  }[];
}

export default function ReportsArchive() {
  const { t, lang, settings } = useApp();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [viewing, setViewing] = useState<SavedReport | null>(null);

  const load = async () => {
    await ReportRepo.pruneOldReports();
    const all = await ReportRepo.all();
    setReports(all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };
  useEffect(() => {
    load();
  }, []);

  const remove = async (r: SavedReport) => {
    if (!confirm(lang === 'ar' ? 'حذف هذا التقرير من الأرشيف؟' : 'Remove this report from the archive?')) return;
    await ReportRepo.remove(r.id);
    load();
  };

  const reExport = (r: SavedReport) => {
    if (r.type === 'receiving') {
      const session = r.payload as ReceivingSession;
      exportToCsv(
        `report-${r.type}-${r.id}`,
        session.rows.map((row) => ({
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
    if (r.type === 'non_conforming' && !Array.isArray(r.payload)) {
      const p = r.payload as NonConformingReportPayload;
      exportToCsv(
        `report-${r.type}-${r.id}`,
        p.records.map((row) => ({
          Product: row.productName,
          Category: row.category,
          Date: row.date,
          Reason: row.reason,
          Decision: row.decision,
          Notes: row.notes
        }))
      );
      return;
    }
    if (r.type === 'health_certificates') {
      const p = r.payload as HealthCertificateReportPayload;
      exportToCsv(
        `report-${r.type}-${r.id}`,
        p.rows.map((row) => ({
          EmployeeCode: row.employeeCode,
          EmployeeName: row.employeeName,
          JobTitle: row.jobTitle,
          ExpiryDate: row.expiryDate,
          RemainingDays: row.remainingDays,
          Status: row.status,
          Notes: row.notes
        }))
      );
      return;
    }
    const payload = Array.isArray(r.payload) ? (r.payload as Record<string, unknown>[]) : [{ data: JSON.stringify(r.payload) }];
    exportToCsv(`report-${r.type}-${r.id}`, payload);
  };

  if (viewing) {
    if (viewing.type === 'non_conforming' && !Array.isArray(viewing.payload)) {
      const p = viewing.payload as NonConformingReportPayload;
      return (
        <div>
          <div className="toolbar no-print">
            <button className="btn btn-outline" onClick={() => setViewing(null)}>
              {lang === 'ar' ? 'رجوع' : 'Back'}
            </button>
            <button className="btn btn-primary" onClick={() => window.print()}>
              🖨️ {t('print')}
            </button>
          </div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {settings.companyLogo && <img src={settings.companyLogo} alt="logo" style={{ height: 56 }} />}
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{settings.companyName || 'Company Name'}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>{p.site}</div>
                </div>
              </div>
              <div style={{ textAlign: 'end' }}>
                <div style={{ fontWeight: 800 }}>{lang === 'ar' ? 'تقرير المنتجات غير المطابقة' : 'Non-Conforming Products Report'}</div>
                <div style={{ fontSize: '0.85rem' }}>{p.reportDate}</div>
              </div>
            </div>
            <div className="form-grid" style={{ marginBottom: 18 }}>
              <div className="form-field">
                <label>{lang === 'ar' ? 'طبيب الجودة' : 'Quality Doctor'}</label>
                <div style={{ fontWeight: 700 }}>{p.doctorName || '—'}</div>
              </div>
              <div className="form-field">
                <label>{t('doctorCode')}</label>
                <div style={{ fontWeight: 700 }}>{p.doctorCode || '—'}</div>
              </div>
            </div>
            {p.records.length === 0 ? (
              <div className="empty-state">{t('noData')}</div>
            ) : (
              <>
                <div className="desktop-only-table">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{t('name')}</th>
                        <th>{t('category')}</th>
                        <th>{lang === 'ar' ? 'القرار' : 'Decision'}</th>
                        <th>{lang === 'ar' ? 'السبب' : 'Reason'}</th>
                        <th>{lang === 'ar' ? 'ملاحظات' : 'Notes'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.records.map((row, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{row.productName}</td>
                          <td>{row.category}</td>
                          <td>{row.decision}</td>
                          <td>{row.reason}</td>
                          <td>{row.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mobile-cards">
                  {p.records.map((row, i) => (
                    <div className="record-card" key={i}>
                      <div className="record-card-header">
                        <div className="record-card-title">
                          {i + 1}. {row.productName}
                        </div>
                      </div>
                      <div className="record-card-row">
                        <span>{t('category')}</span>
                        <span>{row.category}</span>
                      </div>
                      <div className="record-card-row">
                        <span>{lang === 'ar' ? 'القرار' : 'Decision'}</span>
                        <span>{row.decision}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    if (viewing.type === 'health_certificates') {
      const p = viewing.payload as HealthCertificateReportPayload;
      return (
        <div>
          <div className="toolbar no-print">
            <button className="btn btn-outline" onClick={() => setViewing(null)}>
              {lang === 'ar' ? 'رجوع' : 'Back'}
            </button>
            <button className="btn btn-primary" onClick={() => window.print()}>
              🖨️ {t('print')}
            </button>
          </div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {settings.companyLogo && <img src={settings.companyLogo} alt="logo" style={{ height: 56 }} />}
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{settings.companyName || 'Company Name'}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>{p.siteName}</div>
                </div>
              </div>
              <div style={{ textAlign: 'end' }}>
                <div style={{ fontWeight: 800 }}>{lang === 'ar' ? 'تقرير الشهادات الصحية' : 'Health Certificates Report'}</div>
              </div>
            </div>
            {p.rows.length === 0 ? (
              <div className="empty-state">{t('noData')}</div>
            ) : (
              <>
                <div className="desktop-only-table">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{lang === 'ar' ? 'كود الموظف' : 'Employee Code'}</th>
                        <th>{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                        <th>{lang === 'ar' ? 'المسمى الوظيفي' : 'Job Title'}</th>
                        <th>{lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}</th>
                        <th>{t('remainingDays')}</th>
                        <th>{t('status')}</th>
                        <th>{lang === 'ar' ? 'ملاحظات' : 'Notes'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.rows.map((row, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{row.employeeCode}</td>
                          <td>{row.employeeName}</td>
                          <td>{row.jobTitle}</td>
                          <td>{row.expiryDate}</td>
                          <td>{row.remainingDays}</td>
                          <td>{row.status}</td>
                          <td>{row.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mobile-cards">
                  {p.rows.map((row, i) => (
                    <div className="record-card" key={i}>
                      <div className="record-card-header">
                        <div className="record-card-title">
                          {i + 1}. {row.employeeName}
                        </div>
                      </div>
                      <div className="record-card-row">
                        <span>{lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry'}</span>
                        <span>{row.expiryDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    if (viewing.type === 'receiving') {
      const session = viewing.payload as ReceivingSession;
      return (
        <div>
          <div className="toolbar no-print">
            <button className="btn btn-outline" onClick={() => setViewing(null)}>
              {lang === 'ar' ? 'رجوع' : 'Back'}
            </button>
            <button className="btn btn-primary" onClick={() => window.print()}>
              🖨️ {t('print')}
            </button>
          </div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {settings.companyLogo && <img src={settings.companyLogo} alt="logo" style={{ height: 56 }} />}
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{settings.companyName || 'Company Name'}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>{session.siteName}</div>
                </div>
              </div>
              <div style={{ textAlign: 'end' }}>
                <div style={{ fontWeight: 800 }}>{lang === 'ar' ? 'تقرير استلام' : 'Receiving Report'}</div>
                <div style={{ fontSize: '0.85rem' }}>
                  {session.receivingDate} — {session.receivingTime}
                </div>
              </div>
            </div>

            <div className="form-grid" style={{ marginBottom: 18 }}>
              <div className="form-field">
                <label>{t('supplier')}</label>
                <div style={{ fontWeight: 700 }}>{session.supplierName || '—'}</div>
              </div>
              <div className="form-field">
                <label>{t('doctorName')}</label>
                <div style={{ fontWeight: 700 }}>{session.doctorName || '—'}</div>
              </div>
              <div className="form-field">
                <label>{t('doctorCode')}</label>
                <div style={{ fontWeight: 700 }}>{session.doctorCode || '—'}</div>
              </div>
              <div className="form-field">
                <label>{lang === 'ar' ? 'حرارة السيارة' : 'Vehicle Temperature'}</label>
                <div style={{ fontWeight: 700 }}>{session.vehicleTemp || '—'}</div>
              </div>
            </div>

            {session.rows.length === 0 ? (
              <div className="empty-state">{t('noData')}</div>
            ) : (
              <>
                <div className="desktop-only-table">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{t('name')}</th>
                        <th>{t('productionDate')}</th>
                        <th>{t('expiryDate')}</th>
                        <th>{t('status')}</th>
                        <th>{lang === 'ar' ? 'حرارة المنتج' : 'Product Temp'}</th>
                        <th>{lang === 'ar' ? 'ملاحظات' : 'Notes'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {session.rows.map((r, i) => (
                        <tr key={r.id}>
                          <td>{i + 1}</td>
                          <td>{r.productName}</td>
                          <td>{r.productionDate}</td>
                          <td>{r.expiryDate}</td>
                          <td>
                            <StatusBadge status={r.status} />
                          </td>
                          <td>{r.productTemp}</td>
                          <td>{r.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mobile-cards">
                  {session.rows.map((r, i) => (
                    <div className="record-card" key={r.id}>
                      <div className="record-card-header">
                        <div className="record-card-title">
                          {i + 1}. {r.productName}
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                      <div className="record-card-row">
                        <span>{t('productionDate')}</span>
                        <span>{r.productionDate}</span>
                      </div>
                      <div className="record-card-row">
                        <span>{t('expiryDate')}</span>
                        <span>{r.expiryDate}</span>
                      </div>
                      {r.productTemp && (
                        <div className="record-card-row">
                          <span>{lang === 'ar' ? 'حرارة المنتج' : 'Product Temp'}</span>
                          <span>{r.productTemp}</span>
                        </div>
                      )}
                      {r.notes && (
                        <div className="record-card-row">
                          <span>{lang === 'ar' ? 'ملاحظات' : 'Notes'}</span>
                          <span>{r.notes}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    const payload = Array.isArray(viewing.payload) ? (viewing.payload as Record<string, unknown>[]) : [];
    const columns = payload.length ? Object.keys(payload[0]) : [];
    return (
      <div>
        <div className="toolbar no-print">
          <button className="btn btn-outline" onClick={() => setViewing(null)}>
            {lang === 'ar' ? 'رجوع' : 'Back'}
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            🖨️ {t('print')}
          </button>
        </div>
        <h2 className="section-title">{viewing.title}</h2>
        {payload.length === 0 ? (
          <div className="card">
            <div className="empty-state">{t('noData')}</div>
          </div>
        ) : (
          <>
            <div className="card desktop-only-table">
              <table className="data-table">
                <thead>
                  <tr>
                    {columns.map((c) => (
                      <th key={c}>{COLUMN_LABELS[c]?.[lang] ?? c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payload.map((row, i) => (
                    <tr key={i}>
                      {columns.map((c) => (
                        <td key={c}>{String((row as any)[c] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-cards">
              {payload.map((row, i) => (
                <div className="record-card" key={i}>
                  {columns.map((c) => (
                    <div className="record-card-row" key={c}>
                      <span>{COLUMN_LABELS[c]?.[lang] ?? c}</span>
                      <span>{String((row as any)[c] ?? '')}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <p style={{ color: 'var(--on-surface-variant)', marginBottom: 16 }}>
        {lang === 'ar'
          ? 'يتم الاحتفاظ بالتقارير لآخر 3 أشهر فقط، ويتم حذف الأقدم تلقائيًا.'
          : 'Reports are kept for the last 3 months only; older reports are removed automatically.'}
      </p>
      {reports.length === 0 ? (
        <div className="card">
          <div className="empty-state">{t('noData')}</div>
        </div>
      ) : (
        <>
          <div className="card desktop-only-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{lang === 'ar' ? 'العنوان' : 'Title'}</th>
                  <th>{lang === 'ar' ? 'النوع' : 'Type'}</th>
                  <th>{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td>{r.title}</td>
                    <td>{r.type}</td>
                    <td>{new Date(r.createdAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</td>
                    <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => setViewing(r)}>
                        {lang === 'ar' ? 'فتح' : 'Open'}
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => reExport(r)}>
                        {lang === 'ar' ? 'إعادة تصدير' : 'Re-export'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(r)}>
                        {t('delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-cards">
            {reports.map((r) => (
              <div className="record-card" key={r.id}>
                <div className="record-card-header">
                  <div className="record-card-title">{r.title}</div>
                </div>
                <div className="record-card-row">
                  <span>{lang === 'ar' ? 'النوع' : 'Type'}</span>
                  <span>{r.type}</span>
                </div>
                <div className="record-card-row">
                  <span>{lang === 'ar' ? 'التاريخ' : 'Date'}</span>
                  <span>{new Date(r.createdAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                </div>
                <div className="record-card-actions">
                  <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => setViewing(r)}>
                    {lang === 'ar' ? 'فتح' : 'Open'}
                  </button>
                  <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => reExport(r)}>
                    {lang === 'ar' ? 'إعادة تصدير' : 'Re-export'}
                  </button>
                  <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => remove(r)}>
                    {t('delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
