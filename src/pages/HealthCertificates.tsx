import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { EmployeeRepo, HealthCertificateRepo, ReportRepo } from '../db/repositories';
import { generateId } from '../db/db';
import type { CertificateStatus, Employee, HealthCertificate } from '../types';
import { computeCertificateStatus, CERTIFICATE_STATUS_LABELS } from '../engine/certificateEngine';
import CertificateStatusBadge from '../components/common/CertificateStatusBadge';
import Modal from '../components/common/Modal';
import { useRouter } from '../router/Router';
import EmployeesManager from '../components/healthCertificates/EmployeesManager';
import HealthCertificateReport from '../components/healthCertificates/HealthCertificateReport';
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
  const [editing, setEditing] = useState<HealthCertificate | null>(null);
  const [employeeCodeInput, setEmployeeCodeInput] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [showEmployeesManager, setShowEmployeesManager] = useState(false);

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
  const employeeByCode = useMemo(() => new Map(employees.map((e) => [e.code.trim().toLowerCase(), e])), [employees]);

  const matchedEmployee = employeeByCode.get(employeeCodeInput.trim().toLowerCase());

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
      list = list.filter((c) => computeCertificateStatus(c.expiryDate).status === statusFilter);
    }
    return list.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  }, [certificates, siteFilter, searchQuery, statusFilter, employeeById]);

  const openAdd = () => {
    setEditing(null);
    setEmployeeCodeInput('');
    setExpiryDate('');
    setNotes('');
    setImageDataUrl(undefined);
    setShowModal(true);
  };

  const openEdit = (c: HealthCertificate) => {
    setEditing(c);
    const emp = employeeById.get(c.employeeId);
    setEmployeeCodeInput(emp?.code ?? '');
    setExpiryDate(c.expiryDate);
    setNotes(c.notes ?? '');
    setImageDataUrl(c.imageDataUrl);
    setShowModal(true);
  };

  const onImageSelected = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!matchedEmployee || !expiryDate || !siteFilter) return;
    const cert: HealthCertificate = editing
      ? { ...editing, employeeId: matchedEmployee.id, siteName: siteFilter, expiryDate, notes, imageDataUrl }
      : {
          id: generateId(),
          siteName: siteFilter,
          employeeId: matchedEmployee.id,
          expiryDate,
          notes,
          imageDataUrl,
          createdAt: new Date().toISOString()
        };
    await HealthCertificateRepo.save(cert);
    setShowModal(false);
    load();
  };

  const remove = async (c: HealthCertificate) => {
    if (!confirm(lang === 'ar' ? 'هل تريد حذف هذه الشهادة؟' : 'Delete this certificate?')) return;
    await HealthCertificateRepo.remove(c.id);
    load();
  };

  if (showEmployeesManager) {
    return (
      <EmployeesManager
        onBack={() => {
          setShowEmployeesManager(false);
          load();
        }}
      />
    );
  }

  if (activeReport) {
    const scopedRecords = siteRecords.filter((c) => {
      if (reportScope === 'all') return true;
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
            + {lang === 'ar' ? 'إضافة شهادة' : 'Add Certificate'}
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
                  const { remainingDays, status } = computeCertificateStatus(c.expiryDate);
                  return (
                    <tr key={c.id}>
                      <td>{emp?.code ?? '—'}</td>
                      <td>{emp?.name ?? '—'}</td>
                      <td>{emp?.jobTitle ?? '—'}</td>
                      <td>{c.expiryDate}</td>
                      <td>{remainingDays}</td>
                      <td>
                        <CertificateStatusBadge status={status} />
                      </td>
                      <td style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>
                          {t('edit')}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(c)}>
                          {t('delete')}
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
              const { remainingDays, status } = computeCertificateStatus(c.expiryDate);
              return (
                <div className="record-card" key={c.id}>
                  <div className="record-card-header">
                    <div className="record-card-title">{emp?.name ?? '—'}</div>
                    <CertificateStatusBadge status={status} />
                  </div>
                  <div className="record-card-row">
                    <span>{lang === 'ar' ? 'الكود' : 'Code'}</span>
                    <span>{emp?.code ?? '—'}</span>
                  </div>
                  <div className="record-card-row">
                    <span>{lang === 'ar' ? 'الوظيفة' : 'Job Title'}</span>
                    <span>{emp?.jobTitle ?? '—'}</span>
                  </div>
                  <div className="record-card-row">
                    <span>{lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry'}</span>
                    <span>{c.expiryDate}</span>
                  </div>
                  <div className="record-card-row">
                    <span>{t('remainingDays')}</span>
                    <span>{remainingDays}</span>
                  </div>
                  <div className="record-card-actions">
                    <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => openEdit(c)}>
                      {t('edit')}
                    </button>
                    <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => remove(c)}>
                      {t('delete')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showModal && (
        <Modal title={editing ? t('edit') : lang === 'ar' ? 'إضافة شهادة' : 'Add Certificate'} onClose={() => setShowModal(false)}>
          <div className="form-grid">
            <div className="form-field">
              <label>{lang === 'ar' ? 'كود الموظف' : 'Employee Code'}</label>
              <Autocomplete
                freeText
                value={employeeCodeInput}
                onChange={setEmployeeCodeInput}
                options={employees.map((e) => ({ value: e.code, label: e.code, sublabel: e.name }))}
                placeholder={lang === 'ar' ? 'اكتب كود أو اسم الموظف' : 'Type employee code or name'}
              />
              {!matchedEmployee && employeeCodeInput.trim() && (
                <div style={{ fontSize: '0.78rem', color: 'var(--danger)' }}>
                  {lang === 'ar' ? 'كود غير موجود - أضِفه أولًا من "إدارة الموظفين".' : 'Code not found - add it first via "Manage Employees".'}
                </div>
              )}
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'اسم الموظف' : 'Employee Name'}</label>
              <input value={matchedEmployee?.name ?? ''} disabled />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'المسمى الوظيفي' : 'Job Title'}</label>
              <input value={matchedEmployee?.jobTitle ?? ''} disabled />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'تاريخ انتهاء الشهادة' : 'Certificate Expiry Date'}</label>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>{lang === 'ar' ? 'ملاحظات (اختياري)' : 'Notes (optional)'}</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>{lang === 'ar' ? 'صورة الشهادة (اختياري)' : 'Certificate Image (optional)'}</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {imageDataUrl && <img src={imageDataUrl} alt="certificate" style={{ height: 60, borderRadius: 8 }} />}
                <button className="btn btn-outline btn-sm" onClick={() => imageInputRef.current?.click()}>
                  {lang === 'ar' ? 'رفع صورة' : 'Upload'}
                </button>
                {imageDataUrl && (
                  <button className="btn btn-outline btn-sm" onClick={() => setImageDataUrl(undefined)}>
                    {lang === 'ar' ? 'إزالة' : 'Remove'}
                  </button>
                )}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => onImageSelected(e.target.files?.[0])}
                />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setShowModal(false)}>
              {t('cancel')}
            </button>
            <button className="btn btn-primary" onClick={save} disabled={!matchedEmployee || !expiryDate}>
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
    </div>
  );
}
