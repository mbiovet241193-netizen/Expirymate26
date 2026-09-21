import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MaintenancePlanRepo, MaintenanceVisitRepo, MaintenanceRequestRepo, ActivityLogRepo } from '../../db/repositories';
import { generateId } from '../../db/db';
import type { MaintenancePlanItem, MaintenanceRequest, MaintenanceVisit } from '../../types';
import Modal from '../common/Modal';
import DateInput from '../common/DateInput';
import Autocomplete from '../common/Autocomplete';

export default function MaintenanceVisitsManager({ siteName, onBack }: { siteName: string; onBack: () => void }) {
  const { lang, settings } = useApp();
  const [visits, setVisits] = useState<MaintenanceVisit[]>([]);
  const [planItems, setPlanItems] = useState<MaintenancePlanItem[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [companyName, setCompanyName] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [supervisorName, setSupervisorName] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());

  const load = async () => {
    setVisits(await MaintenanceVisitRepo.all());
    setPlanItems(await MaintenancePlanRepo.all());
    setRequests(await MaintenanceRequestRepo.all());
  };
  useEffect(() => {
    load();
  }, []);

  const siteVisits = useMemo(
    () => visits.filter((v) => v.siteName === siteName).sort((a, b) => b.visitDate.localeCompare(a.visitDate)),
    [visits, siteName]
  );

  const visitYear = new Date(visitDate).getFullYear();
  const visitMonth = new Date(visitDate).getMonth() + 1;

  const pendingItemsThisMonth = useMemo(
    () => planItems.filter((i) => i.siteName === siteName && !i.done && i.year === visitYear && i.month === visitMonth),
    [planItems, siteName, visitYear, visitMonth]
  );
  const pendingRequests = useMemo(
    () => requests.filter((r) => r.siteName === siteName && r.status === 'pending'),
    [requests, siteName]
  );

  const toggleSet = (set: Set<string>, id: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const openAdd = () => {
    setVisitDate(new Date().toISOString().slice(0, 10));
    setCompanyName(settings.supplierList[0] ?? '');
    setTechnicianName('');
    setSupervisorName('');
    setNotes('');
    setSelectedItemIds(new Set());
    setSelectedRequestIds(new Set());
    setShowAdd(true);
  };

  const saveVisit = async () => {
    if (!technicianName.trim() || !supervisorName.trim()) return;
    const visitId = generateId();
    await MaintenanceVisitRepo.save({
      id: visitId,
      siteName,
      visitDate,
      companyName: companyName.trim() || undefined,
      technicianName: technicianName.trim(),
      supervisorName: supervisorName.trim(),
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString()
    });
    for (const item of pendingItemsThisMonth) {
      if (!selectedItemIds.has(item.id)) continue;
      await MaintenancePlanRepo.save({ ...item, done: true, doneDate: visitDate, visitId });
    }
    for (const req of pendingRequests) {
      if (!selectedRequestIds.has(req.id)) continue;
      await MaintenanceRequestRepo.save({ ...req, status: 'done', closedDate: visitDate, closedByName: technicianName.trim(), visitId });
    }
    await ActivityLogRepo.log('maintenanceVisitLogged', siteName);
    setShowAdd(false);
    load();
  };

  const removeVisit = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'حذف هذه الزيارة؟' : 'Delete this visit?')) return;
    await MaintenanceVisitRepo.remove(id);
    load();
  };

  const completedCountForVisit = (visitId: string) =>
    planItems.filter((i) => i.visitId === visitId).length + requests.filter((r) => r.visitId === visitId).length;

  return (
    <div>
      <div className="toolbar no-print">
        <button className="btn btn-outline" onClick={onBack}>
          {lang === 'ar' ? 'رجوع' : 'Back'}
        </button>
        <button className="btn btn-primary" onClick={openAdd}>
          + {lang === 'ar' ? 'تسجيل زيارة' : 'Log Visit'}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 6 }}>
        <div style={{ fontWeight: 800 }}>
          {lang === 'ar' ? 'زيارات الصيانة' : 'Maintenance Visits'} — {siteName}
        </div>
      </div>

      {siteVisits.length === 0 ? (
        <div className="empty-state">{lang === 'ar' ? 'لا توجد زيارات مسجلة' : 'No visits logged yet'}</div>
      ) : (
        siteVisits.map((v) => (
          <div key={v.id} className="record-card" style={{ marginBottom: 10 }}>
            <div className="record-card-header">
              <div className="record-card-title">{v.visitDate}</div>
              <button className="icon-btn" onClick={() => removeVisit(v.id)} title={lang === 'ar' ? 'حذف' : 'Delete'}>
                🗑️
              </button>
            </div>
            <div className="record-card-row">
              <span>{lang === 'ar' ? 'شركة الصيانة' : 'Company'}</span>
              <span>{v.companyName || '—'}</span>
            </div>
            <div className="record-card-row">
              <span>{lang === 'ar' ? 'الفني' : 'Technician'}</span>
              <span>{v.technicianName}</span>
            </div>
            <div className="record-card-row">
              <span>{lang === 'ar' ? 'المشرف' : 'Supervisor'}</span>
              <span>{v.supervisorName}</span>
            </div>
            <div className="record-card-row">
              <span>{lang === 'ar' ? 'ما تم إنجازه' : 'Completed items'}</span>
              <span>{completedCountForVisit(v.id)}</span>
            </div>
            {v.notes && (
              <div className="record-card-row">
                <span>{lang === 'ar' ? 'ملاحظات' : 'Notes'}</span>
                <span>{v.notes}</span>
              </div>
            )}
          </div>
        ))
      )}

      {showAdd && (
        <Modal title={lang === 'ar' ? 'تسجيل زيارة صيانة' : 'Log Maintenance Visit'} onClose={() => setShowAdd(false)}>
          <div className="form-grid">
            <div className="form-field">
              <label>{lang === 'ar' ? 'تاريخ الزيارة' : 'Visit Date'}</label>
              <DateInput value={visitDate} onChange={setVisitDate} />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'شركة الصيانة' : 'Maintenance Company'}</label>
              <Autocomplete
                value={companyName}
                onChange={setCompanyName}
                options={settings.supplierList.map((n) => ({ value: n, label: n }))}
                placeholder={lang === 'ar' ? 'اختر من الموردين' : 'Select from suppliers'}
              />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'اسم الفني' : 'Technician Name'}</label>
              <input value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'اسم المشرف' : 'Supervisor Name'}</label>
              <input value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} />
            </div>
          </div>
          <div className="form-field" style={{ marginTop: 10 }}>
            <label>{lang === 'ar' ? 'ملاحظات' : 'Notes'}</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {pendingItemsThisMonth.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 6 }}>
                {lang === 'ar' ? 'بنود الخطة المعلقة لهذا الشهر — حدد ما تم إنجازه' : "This month's pending plan elements — select what was completed"}
              </div>
              {pendingItemsThisMonth.map((item) => (
                <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', marginBottom: 4 }}>
                  <input
                    type="checkbox"
                    checked={selectedItemIds.has(item.id)}
                    onChange={() => toggleSet(selectedItemIds, item.id, setSelectedItemIds)}
                  />
                  {item.elementName}
                </label>
              ))}
            </div>
          )}

          {pendingRequests.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 6 }}>
                {lang === 'ar' ? 'طلبات الصيانة المعلقة — حدد ما تم إغلاقه' : 'Pending maintenance requests — select what was closed'}
              </div>
              {pendingRequests.map((req) => (
                <label key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', marginBottom: 4 }}>
                  <input
                    type="checkbox"
                    checked={selectedRequestIds.has(req.id)}
                    onChange={() => toggleSet(selectedRequestIds, req.id, setSelectedRequestIds)}
                  />
                  {req.description} ({lang === 'ar' ? 'مقدم الطلب' : 'requested by'}: {req.requesterName})
                </label>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setShowAdd(false)}>
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button className="btn btn-primary" onClick={saveVisit}>
              {lang === 'ar' ? 'حفظ الزيارة' : 'Save Visit'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
