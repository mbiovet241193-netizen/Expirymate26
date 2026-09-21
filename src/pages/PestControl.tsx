import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { PestControlRepo, ActivityLogRepo } from '../db/repositories';
import { generateId } from '../db/db';
import type { PestControlVisit } from '../types';
import Autocomplete from '../components/common/Autocomplete';
import DateInput from '../components/common/DateInput';
import Modal from '../components/common/Modal';

export default function PestControl() {
  const { lang, settings } = useApp();
  const [siteFilter, setSiteFilter] = useState(settings.siteNames[0] ?? '');
  const [visits, setVisits] = useState<PestControlVisit[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PestControlVisit | null>(null);
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [companyName, setCompanyName] = useState('');
  const [performedByName, setPerformedByName] = useState('');
  const [followUpByName, setFollowUpByName] = useState('');
  const [notes, setNotes] = useState('');
  const [reportImageDataUrl, setReportImageDataUrl] = useState<string | undefined>(undefined);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const load = async () => setVisits(await PestControlRepo.all());
  useEffect(() => {
    load();
  }, []);

  const siteVisits = useMemo(
    () => visits.filter((v) => v.siteName === siteFilter).sort((a, b) => b.visitDate.localeCompare(a.visitDate)),
    [visits, siteFilter]
  );

  const onImageSelected = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setReportImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const openAdd = () => {
    setEditing(null);
    setVisitDate(new Date().toISOString().slice(0, 10));
    setCompanyName(settings.supplierList[0] ?? '');
    setPerformedByName('');
    setFollowUpByName('');
    setNotes('');
    setReportImageDataUrl(undefined);
    setShowModal(true);
  };

  const openEdit = (v: PestControlVisit) => {
    setEditing(v);
    setVisitDate(v.visitDate);
    setCompanyName(v.companyName);
    setPerformedByName(v.performedByName);
    setFollowUpByName(v.followUpByName);
    setNotes(v.notes ?? '');
    setReportImageDataUrl(v.reportImageDataUrl);
    setShowModal(true);
  };

  const save = async () => {
    if (!companyName.trim() || !performedByName.trim() || !followUpByName.trim()) return;
    const visit: PestControlVisit = editing
      ? { ...editing, visitDate, companyName: companyName.trim(), performedByName: performedByName.trim(), followUpByName: followUpByName.trim(), notes: notes.trim() || undefined, reportImageDataUrl }
      : {
          id: generateId(),
          siteName: siteFilter,
          visitDate,
          companyName: companyName.trim(),
          performedByName: performedByName.trim(),
          followUpByName: followUpByName.trim(),
          notes: notes.trim() || undefined,
          reportImageDataUrl,
          createdAt: new Date().toISOString()
        };
    await PestControlRepo.save(visit);
    if (!editing) await ActivityLogRepo.log('pestControlVisitLogged', siteFilter);
    setShowModal(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'حذف هذه الزيارة؟' : 'Delete this visit?')) return;
    await PestControlRepo.remove(id);
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
          + {lang === 'ar' ? 'تسجيل زيارة مكافحة' : 'Log Pest Control Visit'}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 6 }}>
        <div style={{ fontWeight: 800 }}>
          {lang === 'ar' ? 'المكافحة' : 'Pest Control'} {siteFilter && `— ${siteFilter}`}
        </div>
      </div>

      {!siteFilter ? (
        <div style={{ marginTop: 14, fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
          {lang === 'ar' ? 'اختر موقعًا أولًا للمتابعة.' : 'Select a site first to continue.'}
        </div>
      ) : siteVisits.length === 0 ? (
        <div className="empty-state">{lang === 'ar' ? 'لا توجد زيارات مسجلة' : 'No visits logged yet'}</div>
      ) : (
        siteVisits.map((v) => (
          <div key={v.id} className="record-card" style={{ marginBottom: 10 }}>
            <div className="record-card-header">
              <div className="record-card-title">{v.visitDate}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="icon-btn" onClick={() => openEdit(v)} title={lang === 'ar' ? 'تعديل' : 'Edit'}>
                  ✏️
                </button>
                <button className="icon-btn" onClick={() => remove(v.id)} title={lang === 'ar' ? 'حذف' : 'Delete'}>
                  🗑️
                </button>
              </div>
            </div>
            <div className="record-card-row">
              <span>{lang === 'ar' ? 'شركة المكافحة' : 'Company'}</span>
              <span>{v.companyName}</span>
            </div>
            <div className="record-card-row">
              <span>{lang === 'ar' ? 'القائم بالمكافحة' : 'Performed By'}</span>
              <span>{v.performedByName}</span>
            </div>
            <div className="record-card-row">
              <span>{lang === 'ar' ? 'المسؤول بالمتابعة' : 'Follow-up By'}</span>
              <span>{v.followUpByName}</span>
            </div>
            {v.notes && (
              <div className="record-card-row">
                <span>{lang === 'ar' ? 'ملاحظات' : 'Notes'}</span>
                <span>{v.notes}</span>
              </div>
            )}
            {v.reportImageDataUrl && <img src={v.reportImageDataUrl} alt="report" style={{ height: 70, borderRadius: 8, marginTop: 8 }} />}
          </div>
        ))
      )}

      {showModal && (
        <Modal
          title={editing ? (lang === 'ar' ? 'تعديل زيارة مكافحة' : 'Edit Pest Control Visit') : lang === 'ar' ? 'تسجيل زيارة مكافحة' : 'Log Pest Control Visit'}
          onClose={() => setShowModal(false)}
        >
          <div className="form-grid">
            <div className="form-field">
              <label>{lang === 'ar' ? 'تاريخ الزيارة' : 'Visit Date'}</label>
              <DateInput value={visitDate} onChange={setVisitDate} />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'شركة المكافحة' : 'Pest Control Company'}</label>
              <Autocomplete
                value={companyName}
                onChange={setCompanyName}
                options={settings.supplierList.map((n) => ({ value: n, label: n }))}
                placeholder={lang === 'ar' ? 'اختر من الموردين' : 'Select from suppliers'}
              />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'القائم بأعمال المكافحة' : 'Performed By'}</label>
              <input value={performedByName} onChange={(e) => setPerformedByName(e.target.value)} />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'المسؤول بالمتابعة' : 'Follow-up Responsible'}</label>
              <input value={followUpByName} onChange={(e) => setFollowUpByName(e.target.value)} />
            </div>
          </div>
          <div className="form-field" style={{ marginTop: 10 }}>
            <label>{lang === 'ar' ? 'ملاحظات' : 'Notes'}</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="form-field" style={{ marginTop: 10 }}>
            <label>{lang === 'ar' ? 'صورة المحضر (اختياري)' : 'Report Image (optional)'}</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {reportImageDataUrl && <img src={reportImageDataUrl} alt="report" style={{ height: 60, borderRadius: 8 }} />}
              <button className="btn btn-outline btn-sm" onClick={() => cameraInputRef.current?.click()}>
                📷 {lang === 'ar' ? 'التقاط بالكاميرا' : 'Capture from Camera'}
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => galleryInputRef.current?.click()}>
                🖼️ {lang === 'ar' ? 'اختيار من المعرض' : 'Choose from Gallery'}
              </button>
              {reportImageDataUrl && (
                <button className="btn btn-outline btn-sm" onClick={() => setReportImageDataUrl(undefined)}>
                  {lang === 'ar' ? 'إزالة' : 'Remove'}
                </button>
              )}
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => onImageSelected(e.target.files?.[0])} />
              <input ref={galleryInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => onImageSelected(e.target.files?.[0])} />
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
