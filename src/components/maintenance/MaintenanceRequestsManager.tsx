import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MaintenanceRequestRepo, ActivityLogRepo } from '../../db/repositories';
import { generateId } from '../../db/db';
import type { MaintenanceRequest } from '../../types';
import Modal from '../common/Modal';
import DateInput from '../common/DateInput';

export default function MaintenanceRequestsManager({ siteName, onBack }: { siteName: string; onBack: () => void }) {
  const { lang } = useApp();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [requestDate, setRequestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [requesterName, setRequesterName] = useState('');
  const [description, setDescription] = useState('');

  const [closingTarget, setClosingTarget] = useState<MaintenanceRequest | null>(null);
  const [closedDate, setClosedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [closedByName, setClosedByName] = useState('');

  const load = async () => setRequests(await MaintenanceRequestRepo.all());
  useEffect(() => {
    load();
  }, []);

  const siteRequests = useMemo(
    () =>
      requests
        .filter((r) => r.siteName === siteName)
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
          return b.requestDate.localeCompare(a.requestDate);
        }),
    [requests, siteName]
  );

  const openAdd = () => {
    setRequestDate(new Date().toISOString().slice(0, 10));
    setRequesterName('');
    setDescription('');
    setShowAdd(true);
  };

  const addRequest = async () => {
    if (!requesterName.trim() || !description.trim()) return;
    await MaintenanceRequestRepo.save({
      id: generateId(),
      siteName,
      requestDate,
      requesterName: requesterName.trim(),
      description: description.trim(),
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    await ActivityLogRepo.log('maintenanceRequestLogged', `${siteName} — ${description.trim()}`);
    setShowAdd(false);
    load();
  };

  const openClose = (r: MaintenanceRequest) => {
    setClosedDate(new Date().toISOString().slice(0, 10));
    setClosedByName('');
    setClosingTarget(r);
  };

  const confirmClose = async () => {
    if (!closingTarget || !closedByName.trim()) return;
    await MaintenanceRequestRepo.save({
      ...closingTarget,
      status: 'done',
      closedDate,
      closedByName: closedByName.trim()
    });
    setClosingTarget(null);
    load();
  };

  const removeRequest = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'حذف هذا الطلب؟' : 'Delete this request?')) return;
    await MaintenanceRequestRepo.remove(id);
    load();
  };

  return (
    <div>
      <div className="toolbar no-print">
        <button className="btn btn-outline" onClick={onBack}>
          {lang === 'ar' ? 'رجوع' : 'Back'}
        </button>
        <button className="btn btn-primary" onClick={openAdd}>
          + {lang === 'ar' ? 'طلب صيانة جديد' : 'New Maintenance Request'}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 6 }}>
        <div style={{ fontWeight: 800 }}>
          {lang === 'ar' ? 'طلبات الصيانة (العلاجية)' : 'Maintenance Requests (Corrective)'} — {siteName}
        </div>
      </div>

      {siteRequests.length === 0 ? (
        <div className="empty-state">{lang === 'ar' ? 'لا توجد طلبات مسجلة' : 'No requests logged yet'}</div>
      ) : (
        siteRequests.map((r) => (
          <div key={r.id} className="record-card" style={{ marginBottom: 10 }}>
            <div className="record-card-header">
              <div className="record-card-title">{r.description}</div>
              <span
                className="badge"
                style={{ background: r.status === 'done' ? 'var(--primary)' : 'var(--warning)' }}
              >
                {r.status === 'done' ? (lang === 'ar' ? 'تم' : 'Done') : lang === 'ar' ? 'معلق' : 'Pending'}
              </span>
            </div>
            <div className="record-card-row">
              <span>{lang === 'ar' ? 'تاريخ الطلب' : 'Request Date'}</span>
              <span>{r.requestDate}</span>
            </div>
            <div className="record-card-row">
              <span>{lang === 'ar' ? 'مقدم الطلب' : 'Requester'}</span>
              <span>{r.requesterName}</span>
            </div>
            {r.status === 'done' && (
              <>
                <div className="record-card-row">
                  <span>{lang === 'ar' ? 'تاريخ الإنهاء' : 'Closed Date'}</span>
                  <span>{r.closedDate}</span>
                </div>
                <div className="record-card-row">
                  <span>{lang === 'ar' ? 'من أغلق الطلب' : 'Closed By'}</span>
                  <span>{r.closedByName}</span>
                </div>
              </>
            )}
            <div className="record-card-actions">
              {r.status === 'pending' && (
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => openClose(r)}>
                  {lang === 'ar' ? 'إغلاق الطلب' : 'Close Request'}
                </button>
              )}
              <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => removeRequest(r.id)}>
                {lang === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        ))
      )}

      {showAdd && (
        <Modal title={lang === 'ar' ? 'طلب صيانة جديد' : 'New Maintenance Request'} onClose={() => setShowAdd(false)}>
          <div className="form-grid">
            <div className="form-field">
              <label>{lang === 'ar' ? 'تاريخ الطلب' : 'Request Date'}</label>
              <DateInput value={requestDate} onChange={setRequestDate} />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'مقدم الطلب' : 'Requester Name'}</label>
              <input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} />
            </div>
          </div>
          <div className="form-field" style={{ marginTop: 10 }}>
            <label>{lang === 'ar' ? 'وصف العطل / الطلب' : 'Issue / Request Description'}</label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setShowAdd(false)}>
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button className="btn btn-primary" onClick={addRequest}>
              {lang === 'ar' ? 'إضافة' : 'Add'}
            </button>
          </div>
        </Modal>
      )}

      {closingTarget && (
        <Modal title={lang === 'ar' ? 'إغلاق طلب الصيانة' : 'Close Maintenance Request'} onClose={() => setClosingTarget(null)}>
          <div className="form-grid">
            <div className="form-field">
              <label>{lang === 'ar' ? 'تاريخ الإنهاء' : 'Closed Date'}</label>
              <DateInput value={closedDate} onChange={setClosedDate} />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'من أغلق الطلب' : 'Closed By'}</label>
              <input value={closedByName} onChange={(e) => setClosedByName(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setClosingTarget(null)}>
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button className="btn btn-primary" onClick={confirmClose}>
              {lang === 'ar' ? 'تأكيد الإغلاق' : 'Confirm Close'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
