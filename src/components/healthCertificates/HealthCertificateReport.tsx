import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Employee, HealthCertificate } from '../../types';
import { computeCertificateStatus, CERTIFICATE_STATUS_LABELS } from '../../engine/certificateEngine';
import CertificateStatusBadge from '../common/CertificateStatusBadge';
import type { ReportFormat } from '../../pages/HealthCertificates';

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export default function HealthCertificateReport({
  siteName,
  records,
  employeeById,
  format,
  onBack,
  onSaveToArchive
}: {
  siteName: string;
  records: HealthCertificate[];
  employeeById: Map<string, Employee>;
  format: ReportFormat;
  onBack: () => void;
  onSaveToArchive?: () => Promise<void> | void;
}) {
  const { t, lang, settings } = useApp();
  const [saved, setSaved] = useState(false);
  const today = new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US');
  const title = lang === 'ar' ? 'تقرير الشهادات الصحية' : 'Health Certificates Report';

  const handleSave = async () => {
    if (!onSaveToArchive) return;
    await onSaveToArchive();
    setSaved(true);
  };

  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {settings.companyLogo && <img src={settings.companyLogo} alt="logo" style={{ height: 50 }} />}
        <div>
          <div style={{ fontWeight: 800 }}>{settings.companyName || 'Company Name'}</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>
            {lang === 'ar' ? 'الموقع' : 'Site'}: {siteName}
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'end' }}>
        <div style={{ fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>{today}</div>
      </div>
    </div>
  );

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 50, flexWrap: 'wrap', gap: 16 }}>
      <div>
        <div>
          {lang === 'ar' ? 'طبيب الجودة' : 'Quality Doctor'}: {settings.doctorName || '—'}
        </div>
        <div>
          {lang === 'ar' ? 'كود الطبيب' : 'Doctor Code'}: {settings.doctorCode || '—'}
        </div>
        <div style={{ borderTop: '1px solid var(--outline)', width: 200, marginTop: 30, paddingTop: 6 }}>
          {lang === 'ar' ? 'التوقيع' : 'Signature'}
        </div>
      </div>
    </div>
  );

  const recordsWithImages = records.filter((r) => r.imageDataUrl);
  const skippedNoImage = records.length - recordsWithImages.length;
  const imagePages = chunk(recordsWithImages, 10);

  return (
    <div>
      <div className="toolbar no-print">
        <button className="btn btn-outline" onClick={onBack}>
          {lang === 'ar' ? '← رجوع' : '← Back'}
        </button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saved && (
            <span style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>
              ✅ {lang === 'ar' ? 'تم الحفظ في الأرشيف' : 'Saved to archive'}
            </span>
          )}
          {onSaveToArchive && (
            <button className="btn btn-outline" onClick={handleSave}>
              {lang === 'ar' ? 'حفظ في الأرشيف' : 'Save to Archive'}
            </button>
          )}
          <button className="btn btn-primary" onClick={() => window.print()}>
            🖨️ {lang === 'ar' ? 'طباعة' : 'Print'}
          </button>
        </div>
      </div>

      <div className="card">
        {header}

        {format === 'data' ? (
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
                  {records.map((r, i) => {
                    const emp = employeeById.get(r.employeeId);
                    const { remainingDays, status } = computeCertificateStatus(r.expiryDate);
                    return (
                      <tr key={r.id}>
                        <td>{i + 1}</td>
                        <td>{emp?.code ?? '—'}</td>
                        <td>{emp?.name ?? '—'}</td>
                        <td>{emp?.jobTitle ?? '—'}</td>
                        <td>{r.expiryDate}</td>
                        <td>{remainingDays}</td>
                        <td>
                          <CertificateStatusBadge status={status} />
                        </td>
                        <td>{r.notes ?? ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mobile-cards no-print">
              {records.map((r, i) => {
                const emp = employeeById.get(r.employeeId);
                const { remainingDays, status } = computeCertificateStatus(r.expiryDate);
                return (
                  <div className="record-card" key={r.id}>
                    <div className="record-card-header">
                      <div className="record-card-title">
                        {i + 1}. {emp?.name ?? '—'}
                      </div>
                      <CertificateStatusBadge status={status} />
                    </div>
                    <div className="record-card-row">
                      <span>{lang === 'ar' ? 'الكود' : 'Code'}</span>
                      <span>{emp?.code ?? '—'}</span>
                    </div>
                    <div className="record-card-row">
                      <span>{lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry'}</span>
                      <span>{r.expiryDate}</span>
                    </div>
                    <div className="record-card-row">
                      <span>{t('remainingDays')}</span>
                      <span>{remainingDays}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {skippedNoImage > 0 && (
              <div className="no-print" style={{ marginBottom: 12, fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
                ⚠️{' '}
                {lang === 'ar'
                  ? `تم استبعاد ${skippedNoImage} شهادة بدون صورة مرفوعة.`
                  : `${skippedNoImage} certificate(s) without an uploaded image were excluded.`}
              </div>
            )}
            {imagePages.length === 0 ? (
              <div className="empty-state">{t('noData')}</div>
            ) : (
              imagePages.map((page, pageIndex) => (
                <div
                  key={pageIndex}
                  className="cert-image-grid"
                  style={{ pageBreakAfter: pageIndex < imagePages.length - 1 ? 'always' : 'auto' }}
                >
                  {page.map((r) => {
                    const emp = employeeById.get(r.employeeId);
                    return (
                      <div className="cert-image-cell" key={r.id}>
                        <div className="cert-image-frame">
                          <img src={r.imageDataUrl} alt={emp?.code ?? ''} />
                        </div>
                        <div className="cert-image-caption">{emp?.code ?? '—'}</div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </>
        )}

        {footer}
      </div>
    </div>
  );
}
