import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { EmployeeRepo, HealthCertificateRepo, ReportRepo, ActivityLogRepo } from '../db/repositories';
import { generateId } from '../db/db';
import type { CertificateStatus, Employee, HealthCertificate } from '../types';
import { computeCertificateStatus, CERTIFICATE_STATUS_LABELS } from '../engine/certificateEngine';
import CertificateStatusBadge from '../components/common/CertificateStatusBadge';
import Modal from '../components/common/Modal';
import { useRouter } from '../router/Router';
import EmployeesManager from '../components/healthCertificates/EmployeesManager';
import HealthCertificateReport from '../components/healthCertificates/HealthCertificateReport';
import WhatsAppMessageDialog from '../components/healthCertificates/WhatsAppMessageDialog';
import Autocomplete from '../components/common/Autocomplete';
import StatCard from '../components/common/StatCard';

export type ReportScope = 'all' | 'valid' | 'near_expiry' | 'expired';
export type ReportFormat = 'data' | 'images';

export default function HealthCertificates() {
  const { t, lang, settings } = useApp();
  const { params } = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [certificates, setCertificates] = useState<HealthCertificate[]>([]);

  const [siteFilter, setSiteFilter] = useState(settings.siteNames[0] ?? '');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CertificateStatus | ''>((params.status as CertificateStatus) ?? '');

  const [showModal, setShowModal] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [employeePickerQuery, setEmployeePickerQuery] = useState('');

  const [showEmployeesManager, setShowEmployeesManager] = useState(false);
  const [autoEditEmployeeId, setAutoEditEmployeeId] = useState<string | undefined>(undefined);
  const [whatsappTarget, setWhatsappTarget] = useState<HealthCertificate | null>(null);

  const [showReportSetup, setShowReportSetup] = useState(false);
  const [reportScope, setReportScope] = useState<ReportScope>('all');
  const [reportFormat, setReportFormat] = useState<ReportFormat>('data');
  const [activeReport, setActiveReport] = useState(false);

  const load = async () => {
    setEmployees(await EmployeeRepo.all());
    setCertificates(await HealthCertificateRepo.all());
  };
  useEffect(() => {
    load();
  }, []);

  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const selectedEmployees = useMemo(
    () => selectedEmployeeIds.map((id) => employeeById.get(id)).filter((e): e is Employee => !!e),
    [selectedEmployeeIds, employeeById]
  );

  // Employees already on this site's roster are excluded from the picker -
  // an employee only needs to be added to a site once; all of their data
  // (expiry date, notes, certificate image) is always read live from their
  // Employee Management record afterwards, never re-entered here.
  const alreadyOnSite = useMemo(() => new Set(certificates.filter((c) => c.siteName === siteFilter).map((c) => c.employeeId)), [
    certificates,
    siteFilter
  ]);

  const employeePickerResults = useMemo(() => {
    const q = employeePickerQuery.trim().toLowerCase();
    const list = employees.filter((e) => {
      if (alreadyOnSite.has(e.id)) return false;
      if (!q) return true;
      return e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q);
    });
    return list.slice(0, 30);
  }, [employees, employeePickerQuery, alreadyOnSite]);

  const siteRecords = useMemo(() => {
    let list = certificates.filter((c) => c.siteName === siteFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((c) => {
        const emp = employeeById.get(c.employeeId);
        return (emp?.name ?? '').toLowerCase().includes(q) || (emp?.code ?? '').toLowerCase().includes(q);
      });
    }
    if (statusFilter) {
      list = list.filter((c) => {
        const emp = employeeById.get(c.employeeId);
        if (!emp?.healthCertExpiryDate) return false;
        return computeCertificateStatus(emp.healthCertExpiryDate).status === statusFilter;
      });
    }
    return list.sort((a, b) => {
      const dateA = employeeById.get(a.employeeId)?.healthCertExpiryDate ?? '';
      const dateB = employeeById.get(b.employeeId)?.healthCertExpiryDate ?? '';
      return dateA.localeCompare(dateB);
    });
  }, [certificates, siteFilter, searchQuery, statusFilter, employeeById]);

  const openAdd = () => {
    setSelectedEmployeeIds([]);
    setEmployeePickerQuery('');
    setShowModal(true);
  };

  const toggleEmployeeSelection = (id: string) => {
    setSelectedEmployeeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const save = async () => {
    if (selectedEmployees.length === 0 || !siteFilter) return;
    // Adds each selected employee to this site's roster. No certificate data
    // is entered here - expiry date, notes, and the certificate image are
    // always read live from the employee's own record in Employee Management.
    for (const emp of selectedEmployees) {
      const cert: HealthCertificate = {
        id: generateId(),
        siteName: siteFilter,
        employeeId: emp.id,
        expiryDate: emp.healthCertExpiryDate ?? '',
        createdAt: new Date().toISOString()
      };
      await HealthCertificateRepo.save(cert);
    }
    await ActivityLogRepo.log('certificateLogged', siteFilter);
    setShowModal(false);
    load();
  };

  const remove = async (c: HealthCertificate) => {
    if (!confirm(lang === 'ar' ? 'هل تريد إزالة هذا الموظف من قائمة هذا الموقع؟' : 'Remove this employee from this site\'s roster?')) return;
    await HealthCertificateRepo.remove(c.id);
    load();
  };

  const openInEmployeeManagement = (employeeId: string) => {
    setAutoEditEmployeeId(employeeId);
    setShowEmployeesManager(true);
  };

  if (showEmployeesManager) {
    return (
      <EmployeesManager
        autoEditEmployeeId={autoEditEmployeeId}
        onBack={() => {
          setShowEmployeesManager(false);
          setAutoEditEmployeeId(undefined);
          load();
        }}
      />
    );
  }

  if (activeReport) {
    // Employee Management is the single source of truth, so every record is
    // re-hydrated from the employee's live data before being scoped/reported.
    const liveRecords: HealthCertificate[] = siteRecords.map((c) => {
      const emp = employeeById.get(c.employeeId);
      return { ...c, expiryDate: emp?.healthCertExpiryDate ?? '', notes: emp?.notes, imageDataUrl: emp?.imageDataUrl };
    });
    const scopedRecords = liveRecords.filter((c) => {
      if (reportScope === 'all') return true;
      if (!c.expiryDate) return false;
      return computeCertificateStatus(c.expiryDate).status === reportScope;
    });
    const saveReport = async () => {
      const dateLabel = new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US');
      await ReportRepo.save({
        id: generateId(),
        type: 'health_certificates',
        title: lang === 'ar' ? `تقرير الشهادات الصحية - ${siteFilter} - ${dateLabel}` : `Health Certificates Report - ${siteFilter} - ${dateLabel}`,
        createdAt: new Date().toISOString(),
        payload: {
          siteName: siteFilter,
          scope: reportScope,
          rows: scopedRecords.map((r) => {
            const emp = employeeById.get(r.employeeId);
            const { remainingDays, status } = computeCertificateStatus(r.expiryDate);
            return {
              employeeCode: emp?.code ?? '—',
              employeeName: emp?.name ?? '—',
              jobTitle: emp?.jobTitle ?? '—',
              expiryDate: r.expiryDate,
              remainingDays,
              status,
              notes: r.notes ?? ''
            };
          })
        }
      });
    };
    return (
      <HealthCertificateReport
        siteName={siteFilter}
        records={scopedRecords}
        employeeById={employeeById}
        format={reportFormat}
        onBack={() => setActiveReport(false)}
        onSaveToArchive={reportFormat === 'data' ? saveReport : undefined}
      />
    );
  }

  return (
    <div>
      <div className="stat-grid" style={{ marginBottom: 14 }}>
        <StatCard
          label={lang === 'ar' ? 'إجمالي الموظفين' : 'Total Employees'}
          value={employees.length}
          color="#2e7d5b"
          icon="👥"
        />
      </div>
      <div className="toolbar">
        <div className="form-field" style={{ minWidth: 200, marginBottom: 0 }}>
          <label>{lang === 'ar' ? 'الموقع' : 'Site'}</label>
          <Autocomplete
            value={siteFilter}
            onChange={setSiteFilter}
            options={settings.siteNames.map((n) => ({ value: n, label: n }))}
            placeholder={lang === 'ar' ? 'لا توجد مواقع' : 'No sites'}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => setShowEmployeesManager(true)}>
            👤 {lang === 'ar' ? 'إدارة الموظفين' : 'Manage Employees'}
          </button>
          <button className="btn btn-outline" onClick={() => setShowReportSetup(true)} disabled={siteRecords.length === 0}>
            {t('generateReport')}
          </button>
          <button className="btn btn-primary" onClick={openAdd} disabled={!siteFilter}>
            + {lang === 'ar' ? 'إضافة موظفين' : 'Add Employees'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="form-grid">
          <div className="form-field">
            <label>{lang === 'ar' ? 'بحث' : 'Search'}</label>
            <input
              placeholder={lang === 'ar' ? 'ابحث بالاسم أو الكود...' : 'Search by name or code...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>{t('status')}</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as CertificateStatus | '')}>
              <option value="">{lang === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
              {(['valid', 'near_expiry', 'expired'] as CertificateStatus[]).map((s) => (
                <option key={s} value={s}>
                  {CERTIFICATE_STATUS_LABELS[s][lang]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!siteFilter ? (
        <div className="card">
          <div className="empty-state">
            {lang === 'ar' ? 'يرجى إضافة موقع واحد على الأقل من الإعدادات أولًا.' : 'Please add at least one site in Settings first.'}
          </div>
        </div>
      ) : siteRecords.length === 0 ? (
        <div className="card">
          <div className="empty-state">{t('noData')}</div>
        </div>
      ) : (
        <>
          <div className="card desktop-only-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{lang === 'ar' ? 'كود الموظف' : 'Employee Code'}</th>
                  <th>{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th>{lang === 'ar' ? 'المسمى الوظيفي' : 'Job Title'}</th>
                  <th>{lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}</th>
                  <th>{t('remainingDays')}</th>
                  <th>{t('status')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {siteRecords.map((c) => {
                  const emp = employeeById.get(c.employeeId);
                  const liveExpiryDate = emp?.healthCertExpiryDate;
                  const canContact = !!emp?.mobilePhone;
                  return (
                    <tr key={c.id}>
                      <td>{emp?.code ?? '—'}</td>
                      <td>{emp?.name ?? '—'}</td>
                      <td>{emp?.jobTitle ?? '—'}</td>
                      {liveExpiryDate ? (
                        <>
                          <td>{liveExpiryDate}</td>
                          <td>{computeCertificateStatus(liveExpiryDate).remainingDays}</td>
                          <td>
                            <CertificateStatusBadge status={computeCertificateStatus(liveExpiryDate).status} />
                          </td>
                        </>
                      ) : (
                        <td colSpan={3} style={{ color: 'var(--on-surface-variant)', fontSize: '0.82rem' }}>
                          {lang === 'ar' ? 'لا يوجد تاريخ انتهاء مسجل - أضِفه من إدارة الموظفين' : 'No expiry date on file - add it in Employee Management'}
                        </td>
                      )}
                      <td style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="icon-btn"
                          style={{ width: 30, height: 30, fontSize: '0.85rem' }}
                          disabled={!canContact}
                          onClick={() => setWhatsappTarget(c)}
                          title={
                            canContact
                              ? lang === 'ar'
                                ? 'إرسال رسالة واتساب'
                                : 'Send WhatsApp message'
                              : lang === 'ar'
                              ? 'لا يوجد رقم موبايل مسجل لهذا الموظف'
                              : 'No mobile number on file for this employee'
                          }
                        >
                          🟢
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => openInEmployeeManagement(c.employeeId)}
                          title={lang === 'ar' ? 'كل البيانات تُعدَّل من إدارة الموظفين' : 'All data is edited in Employee Management'}
                        >
                          {lang === 'ar' ? 'بيانات الموظف' : 'Employee Data'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(c)}>
                          {lang === 'ar' ? 'إزالة' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mobile-cards">
            {siteRecords.map((c) => {
              const emp = employeeById.get(c.employeeId);
              const liveExpiryDate = emp?.healthCertExpiryDate;
              const canContact = !!emp?.mobilePhone;
              return (
                <div className="record-card" key={c.id}>
                  <div className="record-card-header">
                    <div className="record-card-title">{emp?.name ?? '—'}</div>
                    {liveExpiryDate && <CertificateStatusBadge status={computeCertificateStatus(liveExpiryDate).status} />}
                  </div>
                  <div className="record-card-row">
                    <span>{lang === 'ar' ? 'الكود' : 'Code'}</span>
                    <span>{emp?.code ?? '—'}</span>
                  </div>
                  <div className="record-card-row">
                    <span>{lang === 'ar' ? 'الوظيفة' : 'Job Title'}</span>
                    <span>{emp?.jobTitle ?? '—'}</span>
                  </div>
                  {liveExpiryDate ? (
                    <>
                      <div className="record-card-row">
                        <span>{lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry'}</span>
                        <span>{liveExpiryDate}</span>
                      </div>
                      <div className="record-card-row">
                        <span>{t('remainingDays')}</span>
                        <span>{computeCertificateStatus(liveExpiryDate).remainingDays}</span>
                      </div>
                    </>
                  ) : (
                    <div className="record-card-row">
                      <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.82rem' }}>
                        {lang === 'ar' ? 'لا يوجد تاريخ انتهاء مسجل - أضِفه من إدارة الموظفين' : 'No expiry date on file - add it in Employee Management'}
                      </span>
                    </div>
                  )}
                  <div className="record-card-actions">
                    <button
                      className="icon-btn"
                      style={{ width: 30, height: 30, fontSize: '0.85rem' }}
                      disabled={!canContact}
                      onClick={() => setWhatsappTarget(c)}
                      title={
                        canContact
                          ? lang === 'ar'
                            ? 'إرسال رسالة واتساب'
                            : 'Send WhatsApp message'
                          : lang === 'ar'
                          ? 'لا يوجد رقم موبايل مسجل لهذا الموظف'
                          : 'No mobile number on file for this employee'
                      }
                    >
                      🟢
                    </button>
                    <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => openInEmployeeManagement(c.employeeId)}>
                      {lang === 'ar' ? 'بيانات الموظف' : 'Employee Data'}
                    </button>
                    <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => remove(c)}>
                      {lang === 'ar' ? 'إزالة' : 'Remove'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showModal && (
        <Modal title={lang === 'ar' ? 'إضافة موظفين لهذا الموقع' : 'Add Employees to This Site'} onClose={() => setShowModal(false)}>
          <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)', marginBottom: 10 }}>
            {lang === 'ar'
              ? 'اختر الموظفين لإدراجهم في قائمة هذا الموقع. كل بياناتهم (تاريخ الانتهاء، الملاحظات، صورة الشهادة) تُقرأ تلقائيًا من "إدارة الموظفين" ولا تُدخل هنا.'
              : 'Select employees to include on this site\'s roster. All their data (expiry date, notes, certificate image) is read automatically from Employee Management and is not entered here.'}
          </div>
          <div className="form-field">
            <label>{lang === 'ar' ? 'الموظفون (يمكن اختيار أكثر من موظف)' : 'Employees (multiple selection allowed)'}</label>
            <Autocomplete
              freeText
              value={employeePickerQuery}
              onChange={setEmployeePickerQuery}
              options={employeePickerResults.map((e) => ({ value: e.code, label: e.code, sublabel: e.name }))}
              placeholder={lang === 'ar' ? 'ابحث بالكود أو الاسم' : 'Search by code or name'}
            />
            <div
              style={{
                maxHeight: 160,
                overflowY: 'auto',
                border: '1px solid var(--outline-variant)',
                borderRadius: 8,
                marginTop: 6
              }}
            >
              {employeePickerResults.length === 0 ? (
                <div style={{ padding: 10, fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
                  {lang === 'ar' ? 'لا يوجد موظفون مطابقون (أو تمت إضافتهم بالفعل لهذا الموقع)' : 'No matching employees (or already added to this site)'}
                </div>
              ) : (
                employeePickerResults.map((e) => (
                  <label
                    key={e.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--outline-variant)'
                    }}
                  >
                    <input type="checkbox" checked={selectedEmployeeIds.includes(e.id)} onChange={() => toggleEmployeeSelection(e.id)} />
                    <span>
                      {e.name} <span style={{ color: 'var(--on-surface-variant)' }}>({e.code})</span>
                    </span>
                  </label>
                ))
              )}
            </div>

            {selectedEmployees.length > 0 && (
              <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>
                  {lang === 'ar' ? `الموظفون المحددون (${selectedEmployees.length})` : `Selected Employees (${selectedEmployees.length})`}
                </div>
                {selectedEmployees.map((e) => (
                  <div
                    key={e.id}
                    className="card"
                    style={{ padding: 8, fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
                  >
                    <div>
                      <div>
                        <strong>{e.name}</strong> ({e.code})
                      </div>
                      <div style={{ color: 'var(--on-surface-variant)' }}>
                        {lang === 'ar' ? 'الوظيفة' : 'Job'}: {e.jobTitle || '—'} · {lang === 'ar' ? 'موبايل' : 'Mobile'}:{' '}
                        {e.mobilePhone || '—'} · {lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry'}: {e.healthCertExpiryDate || '—'}
                      </div>
                    </div>
                    <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => toggleEmployeeSelection(e.id)}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setShowModal(false)}>
              {t('cancel')}
            </button>
            <button className="btn btn-primary" onClick={save} disabled={selectedEmployees.length === 0}>
              {t('save')}
            </button>
          </div>
        </Modal>
      )}

      {showReportSetup && (
        <Modal title={lang === 'ar' ? 'خيارات التقرير' : 'Report Options'} onClose={() => setShowReportSetup(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--on-surface-variant)', display: 'block', marginBottom: 8 }}>
                {lang === 'ar' ? 'النطاق' : 'Scope'}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(
                  [
                    ['all', lang === 'ar' ? 'كل الشهادات' : 'All Certificates'],
                    ['valid', lang === 'ar' ? 'الشهادات السارية' : 'Valid Certificates'],
                    ['near_expiry', lang === 'ar' ? 'خلال 30 يومًا' : 'Expiring Within 30 Days'],
                    ['expired', lang === 'ar' ? 'الشهادات المنتهية' : 'Expired Certificates']
                  ] as [ReportScope, string][]
                ).map(([value, label]) => (
                  <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="radio" name="reportScope" checked={reportScope === value} onChange={() => setReportScope(value)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--on-surface-variant)', display: 'block', marginBottom: 8 }}>
                {lang === 'ar' ? 'نوع التقرير' : 'Report Format'}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="radio" name="reportFormat" checked={reportFormat === 'data'} onChange={() => setReportFormat('data')} />
                  {lang === 'ar' ? 'بيانات فقط (جدول)' : 'Data Only (Table)'}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="radio" name="reportFormat" checked={reportFormat === 'images'} onChange={() => setReportFormat('images')} />
                  {lang === 'ar' ? 'صور الشهادات فقط (10 لكل صفحة)' : 'Certificate Images Only (10 per page)'}
                </label>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setShowReportSetup(false)}>
              {t('cancel')}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setActiveReport(true);
                setShowReportSetup(false);
              }}
            >
              {lang === 'ar' ? 'توليد التقرير' : 'Generate Report'}
            </button>
          </div>
        </Modal>
      )}

      {whatsappTarget && (() => {
        const emp = employeeById.get(whatsappTarget.employeeId);
        return emp ? (
          <WhatsAppMessageDialog
            employee={emp}
            companyName={settings.companyName || (lang === 'ar' ? 'الشركة' : 'The Company')}
            lang={lang}
            certificateImageDataUrl={emp.imageDataUrl}
            certificateExpiryDate={emp.healthCertExpiryDate}
            onClose={() => setWhatsappTarget(null)}
          />
        ) : null;
      })()}
    </div>
  );
}
