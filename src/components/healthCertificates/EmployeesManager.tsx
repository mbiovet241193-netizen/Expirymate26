// Employee database screen for the Health Certificates module.
import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { EmployeeRepo, HealthCertificateRepo, ReportRepo } from '../../db/repositories';
import { generateId } from '../../db/db';
import type { Employee, HealthCertificate } from '../../types';
import { computeCertificateStatus } from '../../engine/certificateEngine';
import Modal from '../common/Modal';
import DateInput from '../common/DateInput';
import HealthCertificateReport from './HealthCertificateReport';
import WhatsAppMessageDialog from './WhatsAppMessageDialog';
import BulkWhatsAppDialog from './BulkWhatsAppDialog';
import type { ReportFormat } from '../../pages/HealthCertificates';
import { exportEmployeesToExcel, parseEmployeesExcelFile } from '../../utils/employeesExcel';

export default function EmployeesManager({ onBack }: { onBack: () => void }) {
  const { lang, t, settings } = useApp();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [healthCertExpiryDate, setHealthCertExpiryDate] = useState('');
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [importSummary, setImportSummary] = useState<{ created: number; updated: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [whatsappTarget, setWhatsappTarget] = useState<Employee | null>(null);
  const [showBulkWhatsApp, setShowBulkWhatsApp] = useState(false);
  const [showReportSetup, setShowReportSetup] = useState(false);
  const [reportFormat, setReportFormat] = useState<ReportFormat>('data');
  const [activeReport, setActiveReport] = useState<{ records: HealthCertificate[]; skipped: number } | null>(null);

  const load = async () => {
    setEmployees(await EmployeeRepo.all());
  };
  useEffect(() => {
    load();
  }, []);

  const visible = searchQuery.trim()
    ? employees.filter(
        (e) =>
          e.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
          e.code.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : employees;

  const selectedEmployees = employees.filter((e) => selectedIds.has(e.id));
  const allVisibleSelected = visible.length > 0 && visible.every((e) => selectedIds.has(e.id));

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visible.forEach((e) => next.delete(e.id));
      } else {
        visible.forEach((e) => next.add(e.id));
      }
      return next;
    });
  };

  /**
   * Builds the report record set for the currently selected employees.
   * For each selected employee, the most recent matching HealthCertificate
   * record (with its image, if any) is used when available; otherwise a
   * lightweight record is built from the employee's own health-certificate
   * expiry date field. Employees with neither are skipped and counted.
   */
  const buildReportRecords = async (): Promise<{ records: HealthCertificate[]; skipped: number }> => {
    const allCertificates = await HealthCertificateRepo.all();
    const bySelectedEmployee = new Map<string, HealthCertificate[]>();
    allCertificates.forEach((c) => {
      if (!selectedIds.has(c.employeeId)) return;
      const list = bySelectedEmployee.get(c.employeeId) ?? [];
      list.push(c);
      bySelectedEmployee.set(c.employeeId, list);
    });

    const records: HealthCertificate[] = [];
    let skipped = 0;
    for (const emp of selectedEmployees) {
      const empCerts = bySelectedEmployee.get(emp.id);
      if (empCerts && empCerts.length > 0) {
        const latest = [...empCerts].sort((a, b) => b.expiryDate.localeCompare(a.expiryDate))[0];
        records.push(latest);
      } else if (emp.healthCertExpiryDate) {
        records.push({
          id: `emp-${emp.id}`,
          siteName: '',
          employeeId: emp.id,
          expiryDate: emp.healthCertExpiryDate,
          createdAt: emp.updatedAt
        });
      } else {
        skipped++;
      }
    }
    return { records, skipped };
  };

  const generateReport = async () => {
    const result = await buildReportRecords();
    setActiveReport(result);
    setShowReportSetup(false);
  };

  const employeeById = new Map(employees.map((e) => [e.id, e]));

  const saveReportToArchive = async (records: HealthCertificate[]) => {
    const dateLabel = new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US');
    await ReportRepo.save({
      id: generateId(),
      type: 'health_certificates',
      title:
        lang === 'ar'
          ? `تقرير الشهادات الصحية - موظفون محددون - ${dateLabel}`
          : `Health Certificates Report - Selected Employees - ${dateLabel}`,
      createdAt: new Date().toISOString(),
      payload: {
        scope: 'selected_employees',
        rows: records.map((r) => {
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

  const openAdd = () => {
    setEditing(null);
    setCode('');
    setName('');
    setJobTitle('');
    setHealthCertExpiryDate('');
    setInsuranceNumber('');
    setMobilePhone('');
    setShowModal(true);
  };

  const openEdit = (e: Employee) => {
    setEditing(e);
    setCode(e.code);
    setName(e.name);
    setJobTitle(e.jobTitle);
    setHealthCertExpiryDate(e.healthCertExpiryDate ?? '');
    setInsuranceNumber(e.insuranceNumber ?? '');
    setMobilePhone(e.mobilePhone ?? '');
    setShowModal(true);
  };

  const save = async () => {
    if (!code.trim() || !name.trim()) return;
    const now = new Date().toISOString();
    const common = {
      code: code.trim(),
      name: name.trim(),
      jobTitle: jobTitle.trim(),
      healthCertExpiryDate: healthCertExpiryDate || undefined,
      insuranceNumber: insuranceNumber.trim() || undefined,
      mobilePhone: mobilePhone.trim() || undefined
    };
    const emp: Employee = editing
      ? { ...editing, ...common, updatedAt: now }
      : { id: generateId(), ...common, createdAt: now, updatedAt: now };
    await EmployeeRepo.save(emp);
    setShowModal(false);
    load();
  };

  const remove = async (e: Employee) => {
    if (!confirm(lang === 'ar' ? 'هل تريد حذف هذا الموظف؟' : 'Delete this employee?')) return;
    await EmployeeRepo.remove(e.id);
    load();
  };

  const doImport = async (file: File) => {
    const rows = await parseEmployeesExcelFile(file);
    const byCodeLower = new Map(employees.map((e) => [e.code.trim().toLowerCase(), e]));
    const now = new Date().toISOString();
    let created = 0;
    let updated = 0;

    for (const row of rows) {
      const key = row.code.trim().toLowerCase();
      const existing = byCodeLower.get(key);
      const common = {
        name: row.name,
        jobTitle: row.jobTitle,
        healthCertExpiryDate: row.healthCertExpiryDate,
        insuranceNumber: row.insuranceNumber,
        mobilePhone: row.mobilePhone
      };
      if (existing) {
        const updatedEmp: Employee = { ...existing, ...common, updatedAt: now };
        await EmployeeRepo.save(updatedEmp);
        byCodeLower.set(key, updatedEmp);
        updated++;
      } else {
        const newEmp: Employee = { id: generateId(), code: row.code, ...common, createdAt: now, updatedAt: now };
        await EmployeeRepo.save(newEmp);
        byCodeLower.set(key, newEmp);
        created++;
      }
    }
    setImportSummary({ created, updated });
    load();
  };

  if (activeReport) {
    return (
      <div>
        {activeReport.skipped > 0 && (
          <div className="card" style={{ marginBottom: 14, background: 'var(--surface-container-high)', fontSize: '0.85rem' }}>
            {lang === 'ar'
              ? `تنبيه: تم استبعاد ${activeReport.skipped} موظف من التقرير لعدم وجود تاريخ انتهاء شهادة صحية مسجل لهم.`
              : `Note: ${activeReport.skipped} employee(s) were excluded from the report because they have no health certificate expiry date on file.`}
          </div>
        )}
        <HealthCertificateReport
          siteName={lang === 'ar' ? 'موظفون محددون' : 'Selected Employees'}
          records={activeReport.records}
          employeeById={employeeById}
          format={reportFormat}
          onBack={() => setActiveReport(null)}
          onSaveToArchive={reportFormat === 'data' ? () => saveReportToArchive(activeReport.records) : undefined}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <button className="btn btn-outline" onClick={onBack}>
          {lang === 'ar' ? '← رجوع' : '← Back'}
        </button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => exportEmployeesToExcel(employees)} disabled={employees.length === 0}>
            {t('exportExcel')}
          </button>
          <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()}>
            {t('importExcel')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) doImport(f);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
          <button className="btn btn-primary" onClick={openAdd}>
            + {lang === 'ar' ? 'إضافة موظف' : 'Add Employee'}
          </button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="card" style={{ marginBottom: 14, background: 'var(--surface-container-high)' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', fontSize: '0.9rem' }}>
            <strong>
              {lang === 'ar' ? `تم تحديد ${selectedIds.size} موظف` : `${selectedIds.size} employee(s) selected`}
            </strong>
            <button className="btn btn-outline btn-sm" onClick={() => setShowReportSetup(true)}>
              📄 {lang === 'ar' ? 'توليد تقرير' : 'Generate Report'}
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setShowBulkWhatsApp(true)}>
              🟢 {lang === 'ar' ? 'إرسال واتساب للمحددين' : 'Send WhatsApp to Selected'}
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setSelectedIds(new Set())}>
              {lang === 'ar' ? 'إلغاء التحديد' : 'Clear Selection'}
            </button>
          </div>
        </div>
      )}

      {importSummary && (
        <div className="card" style={{ marginBottom: 14, background: 'var(--surface-container-high)' }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', fontSize: '0.9rem' }}>
            <strong>{t('importSummary')}:</strong>
            <span>✅ {importSummary.created} {t('importEmployeeCreated')}</span>
            <span>🔄 {importSummary.updated} {t('importEmployeeUpdated')}</span>
            <button className="btn btn-outline btn-sm" onClick={() => setImportSummary(null)}>
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="form-field">
          <label>{lang === 'ar' ? 'بحث' : 'Search'}</label>
          <input
            placeholder={lang === 'ar' ? 'ابحث بالاسم أو الكود...' : 'Search by name or code...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <div className="empty-state">{t('noData')}</div>
        </div>
      ) : (
        <>
          <div className="card desktop-only-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label={lang === 'ar' ? 'تحديد الكل' : 'Select all'} />
                  </th>
                  <th>{lang === 'ar' ? 'الكود' : 'Code'}</th>
                  <th>{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th>{lang === 'ar' ? 'المسمى الوظيفي' : 'Job Title'}</th>
                  <th>{lang === 'ar' ? 'رقم الموبايل' : 'Mobile Phone'}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleOne(e.id)} />
                    </td>
                    <td>{e.code}</td>
                    <td>{e.name}</td>
                    <td>{e.jobTitle}</td>
                    <td>{e.mobilePhone ?? '—'}</td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-outline btn-sm"
                        disabled={!e.mobilePhone}
                        title={!e.mobilePhone ? (lang === 'ar' ? 'لا يوجد رقم موبايل' : 'No mobile number') : undefined}
                        onClick={() => setWhatsappTarget(e)}
                      >
                        🟢 {lang === 'ar' ? 'واتساب' : 'WhatsApp'}
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(e)}>
                        {t('edit')}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(e)}>
                        {t('delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-cards">
            {visible.map((e) => (
              <div className="record-card" key={e.id}>
                <div className="record-card-header">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleOne(e.id)} />
                    <div className="record-card-title">{e.name}</div>
                  </label>
                </div>
                <div className="record-card-row">
                  <span>{lang === 'ar' ? 'الكود' : 'Code'}</span>
                  <span>{e.code}</span>
                </div>
                <div className="record-card-row">
                  <span>{lang === 'ar' ? 'الوظيفة' : 'Job Title'}</span>
                  <span>{e.jobTitle}</span>
                </div>
                {e.mobilePhone && (
                  <div className="record-card-row">
                    <span>{lang === 'ar' ? 'الموبايل' : 'Mobile'}</span>
                    <span>{e.mobilePhone}</span>
                  </div>
                )}
                <div className="record-card-actions">
                  <button className="btn btn-outline btn-sm" disabled={!e.mobilePhone} style={{ flex: 1 }} onClick={() => setWhatsappTarget(e)}>
                    🟢 {lang === 'ar' ? 'واتساب' : 'WhatsApp'}
                  </button>
                  <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => openEdit(e)}>
                    {t('edit')}
                  </button>
                  <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => remove(e)}>
                    {t('delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <Modal title={editing ? t('edit') : lang === 'ar' ? 'إضافة موظف' : 'Add Employee'} onClose={() => setShowModal(false)}>
          <div className="form-grid">
            <div className="form-field">
              <label>{lang === 'ar' ? 'الكود' : 'Code'}</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'الاسم' : 'Name'}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>{lang === 'ar' ? 'المسمى الوظيفي' : 'Job Title'}</label>
              <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'تاريخ انتهاء الشهادة الصحية' : 'Health Certificate Expiry Date'}</label>
              <DateInput value={healthCertExpiryDate} onChange={setHealthCertExpiryDate} />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'رقم التأمين الطبي' : 'Medical Insurance Number'}</label>
              <input value={insuranceNumber} onChange={(e) => setInsuranceNumber(e.target.value)} />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'رقم الموبايل' : 'Mobile Phone'}</label>
              <input value={mobilePhone} onChange={(e) => setMobilePhone(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setShowModal(false)}>
              {t('cancel')}
            </button>
            <button className="btn btn-primary" onClick={save} disabled={!code.trim() || !name.trim()}>
              {t('save')}
            </button>
          </div>
        </Modal>
      )}
      {showReportSetup && (
        <Modal title={lang === 'ar' ? 'خيارات التقرير' : 'Report Options'} onClose={() => setShowReportSetup(false)}>
          <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)', marginBottom: 14 }}>
            {lang === 'ar'
              ? `سيتم إنشاء التقرير لـ ${selectedIds.size} موظف محدد.`
              : `The report will be generated for ${selectedIds.size} selected employee(s).`}
          </div>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--on-surface-variant)', display: 'block', marginBottom: 8 }}>
              {lang === 'ar' ? 'نوع التقرير' : 'Report Format'}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="radio" name="empReportFormat" checked={reportFormat === 'data'} onChange={() => setReportFormat('data')} />
                {lang === 'ar' ? 'بيانات فقط (جدول)' : 'Data Only (Table)'}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="radio" name="empReportFormat" checked={reportFormat === 'images'} onChange={() => setReportFormat('images')} />
                {lang === 'ar' ? 'صور الشهادات فقط (10 لكل صفحة)' : 'Certificate Images Only (10 per page)'}
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setShowReportSetup(false)}>
              {t('cancel')}
            </button>
            <button className="btn btn-primary" onClick={generateReport}>
              {lang === 'ar' ? 'عرض التقرير' : 'View Report'}
            </button>
          </div>
        </Modal>
      )}

      {whatsappTarget && (
        <WhatsAppMessageDialog
          employee={whatsappTarget}
          companyName={settings.companyName || ''}
          lang={lang}
          onClose={() => setWhatsappTarget(null)}
        />
      )}

      {showBulkWhatsApp && (
        <BulkWhatsAppDialog
          employees={selectedEmployees}
          companyName={settings.companyName || ''}
          lang={lang}
          onClose={() => setShowBulkWhatsApp(false)}
        />
      )}
    </div>
  );
}
