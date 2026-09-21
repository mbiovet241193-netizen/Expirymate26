import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { HygieneViolationRepo, EmployeeRepo, ActivityLogRepo } from '../db/repositories';
import { generateId } from '../db/db';
import type { Employee, HygieneViolation } from '../types';
import Autocomplete from '../components/common/Autocomplete';
import DateInput from '../components/common/DateInput';
import Modal from '../components/common/Modal';

export default function PersonalHygiene() {
  const { lang, settings } = useApp();
  const [siteFilter, setSiteFilter] = useState(settings.siteNames[0] ?? '');
  const [violations, setViolations] = useState<HygieneViolation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<HygieneViolation | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [employeeId, setEmployeeId] = useState('');
  const [violation, setViolation] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [status, setStatus] = useState<'warning' | 'deduction'>('warning');
  const [directSupervisorName, setDirectSupervisorName] = useState('');
  const [inspectorName, setInspectorName] = useState('');

  const load = async () => {
    setViolations(await HygieneViolationRepo.all());
    setEmployees(await EmployeeRepo.all());
  };
  useEffect(() => {
    load();
  }, []);

  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const siteViolations = useMemo(
    () => violations.filter((v) => v.siteName === siteFilter).sort((a, b) => b.date.localeCompare(a.date)),
    [violations, siteFilter]
  );

  const openAdd = () => {
    setEditing(null);
    setDate(new Date().toISOString().slice(0, 10));
    setEmployeeId('');
    setViolation('');
    setCorrectiveAction('');
    setStatus('warning');
    setDirectSupervisorName('');
    setInspectorName('');
    setShowModal(true);
  };

  const openEdit = (v: HygieneViolation) => {
    setEditing(v);
    setDate(v.date);
    setEmployeeId(v.employeeId);
    setViolation(v.violation);
    setCorrectiveAction(v.correctiveAction);
    setStatus(v.status);
    setDirectSupervisorName(v.directSupervisorName);
    setInspectorName(v.inspectorName);
    setShowModal(true);
  };

  const save = async () => {
    if (!employeeId || !violation.trim() || !correctiveAction.trim() || !directSupervisorName.trim() || !inspectorName.trim()) return;
    const rec: HygieneViolation = editing
      ? { ...editing, date, employeeId, violation: violation.trim(), correctiveAction: correctiveAction.trim(), status, directSupervisorName: directSupervisorName.trim(), inspectorName: inspectorName.trim() }
      : {
          id: generateId(),
          siteName: siteFilter,
          date,
          employeeId,
          violation: violation.trim(),
          correctiveAction: correctiveAction.trim(),
          status,
          directSupervisorName: directSupervisorName.trim(),
          inspectorName: inspectorName.trim(),
          createdAt: new Date().toISOString()
        };
    await HygieneViolationRepo.save(rec);
    if (!editing) await ActivityLogRepo.log('hygieneViolationLogged', siteFilter);
    setShowModal(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'حذف هذا السجل؟' : 'Delete this record?')) return;
    await HygieneViolationRepo.remove(id);
    load();
  };

  return (
    <div>
      <div className="toolbar no-print">
        <div className="form-field" style={{ maxWidth: 260 }}>
          <Autocomplete
            value={siteFilter}
            onChange={setSiteFilter}
            options={settings.siteNames.map((n) => ({ value: n, label: n }))}
            placeholder={lang === 'ar' ? '— اختر الموقع —' : '— Select Site —'}
          />
        </div>
        <button className="btn btn-primary" onClick={openAdd} disabled={!siteFilter}>
          + {lang === 'ar' ? 'تسجيل مخالفة' : 'Log Violation'}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 6 }}>
        <div style={{ fontWeight: 800 }}>
          {lang === 'ar' ? 'النظافة الشخصية' : 'Personal Hygiene'} {siteFilter && `— ${siteFilter}`}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', marginTop: 4 }}>
          {lang === 'ar'
            ? 'لإصدار تقرير PDF لفترة محددة، استخدم "تقرير مخالفات النظافة الشخصية" من شاشة التقارير.'
            : 'To generate a PDF report for a date range, use "Personal Hygiene Violations Report" from the Reports screen.'}
        </div>
      </div>

      {!siteFilter ? (
        <div style={{ marginTop: 14, fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
          {lang === 'ar' ? 'اختر موقعًا أولًا للمتابعة.' : 'Select a site first to continue.'}
        </div>
      ) : siteViolations.length === 0 ? (
        <div className="empty-state">{lang === 'ar' ? 'لا توجد مخالفات مسجلة' : 'No violations logged yet'}</div>
      ) : (
        siteViolations.map((v) => {
          const emp = employeeById.get(v.employeeId);
          return (
            <div key={v.id} className="record-card" style={{ marginBottom: 10 }}>
              <div className="record-card-header">
                <div className="record-card-title">
                  {emp?.name ?? '—'} ({emp?.code ?? '—'})
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className="badge" style={{ background: v.status === 'deduction' ? 'var(--danger)' : 'var(--warning)' }}>
                    {v.status === 'deduction' ? (lang === 'ar' ? 'خصم' : 'Deduction') : lang === 'ar' ? 'إنذار' : 'Warning'}
                  </span>
                  <button className="icon-btn" onClick={() => openEdit(v)} title={lang === 'ar' ? 'تعديل' : 'Edit'}>
                    ✏️
                  </button>
                  <button className="icon-btn" onClick={() => remove(v.id)} title={lang === 'ar' ? 'حذف' : 'Delete'}>
                    🗑️
                  </button>
                </div>
              </div>
              <div className="record-card-row">
                <span>{lang === 'ar' ? 'التاريخ' : 'Date'}</span>
                <span>{v.date}</span>
              </div>
              <div className="record-card-row">
                <span>{lang === 'ar' ? 'المخالفة' : 'Violation'}</span>
                <span>{v.violation}</span>
              </div>
              <div className="record-card-row">
                <span>{lang === 'ar' ? 'الإجراء التصحيحي/الوقائي' : 'Corrective/Preventive Action'}</span>
                <span>{v.correctiveAction}</span>
              </div>
              <div className="record-card-row">
                <span>{lang === 'ar' ? 'المشرف المباشر' : 'Direct Supervisor'}</span>
                <span>{v.directSupervisorName}</span>
              </div>
              <div className="record-card-row">
                <span>{lang === 'ar' ? 'القائم بالتفتيش' : 'Inspector'}</span>
                <span>{v.inspectorName}</span>
              </div>
            </div>
          );
        })
      )}

      {showModal && (
        <Modal title={editing ? (lang === 'ar' ? 'تعديل مخالفة' : 'Edit Violation') : lang === 'ar' ? 'تسجيل مخالفة' : 'Log Violation'} onClose={() => setShowModal(false)}>
          <div className="form-grid">
            <div className="form-field">
              <label>{lang === 'ar' ? 'التاريخ' : 'Date'}</label>
              <DateInput value={date} onChange={setDate} />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'الموظف' : 'Employee'}</label>
              <Autocomplete
                value={employeeId}
                onChange={setEmployeeId}
                options={employees.map((e) => ({ value: e.id, label: e.name, sublabel: e.code }))}
                placeholder={lang === 'ar' ? 'ابحث بالاسم أو الكود' : 'Search by name or code'}
              />
            </div>
          </div>
          <div className="form-field" style={{ marginTop: 10 }}>
            <label>{lang === 'ar' ? 'المخالفة' : 'Violation'}</label>
            <textarea rows={2} value={violation} onChange={(e) => setViolation(e.target.value)} />
          </div>
          <div className="form-field" style={{ marginTop: 10 }}>
            <label>{lang === 'ar' ? 'الإجراء التصحيحي/الوقائي' : 'Corrective/Preventive Action'}</label>
            <textarea rows={2} value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} />
          </div>
          <div className="form-grid" style={{ marginTop: 10 }}>
            <div className="form-field">
              <label>{lang === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as 'warning' | 'deduction')}>
                <option value="warning">{lang === 'ar' ? 'إنذار' : 'Warning'}</option>
                <option value="deduction">{lang === 'ar' ? 'خصم' : 'Deduction'}</option>
              </select>
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'المشرف المباشر للموظف' : "Employee's Direct Supervisor"}</label>
              <input value={directSupervisorName} onChange={(e) => setDirectSupervisorName(e.target.value)} />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'القائم بالتفتيش' : 'Inspector'}</label>
              <input value={inspectorName} onChange={(e) => setInspectorName(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setShowModal(false)}>
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button className="btn btn-primary" onClick={save}>
              {lang === 'ar' ? 'حفظ' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
