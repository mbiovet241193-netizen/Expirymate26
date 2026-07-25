// Employee database screen for the Health Certificates module.
import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { EmployeeRepo } from '../../db/repositories';
import { generateId } from '../../db/db';
import type { Employee } from '../../types';
import Modal from '../common/Modal';
import { exportEmployeesToExcel, parseEmployeesExcelFile } from '../../utils/employeesExcel';

export default function EmployeesManager({ onBack }: { onBack: () => void }) {
  const { lang, t } = useApp();
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
                    <td>{e.code}</td>
                    <td>{e.name}</td>
                    <td>{e.jobTitle}</td>
                    <td>{e.mobilePhone ?? '—'}</td>
                    <td style={{ display: 'flex', gap: 8 }}>
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
                  <div className="record-card-title">{e.name}</div>
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
              <input type="date" value={healthCertExpiryDate} onChange={(e) => setHealthCertExpiryDate(e.target.value)} />
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
    </div>
  );
}
