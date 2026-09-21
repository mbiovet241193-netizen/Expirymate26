import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TrainingPlanRepo, TrainingRecordRepo, ActivityLogRepo } from '../../db/repositories';
import { generateId } from '../../db/db';
import type { TrainingPlanItem, TrainingRecord } from '../../types';
import Modal from '../common/Modal';
import DateInput from '../common/DateInput';

export default function TrainingRecordsManager({ siteName, onBack }: { siteName: string; onBack: () => void }) {
  const { lang } = useApp();
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [planItems, setPlanItems] = useState<TrainingPlanItem[]>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [planItemId, setPlanItemId] = useState(''); // '' = unplanned
  const [programName, setProgramName] = useState('');
  const [traineeCount, setTraineeCount] = useState(1);
  const [trainerName, setTrainerName] = useState('');
  const [notes, setNotes] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setRecords(await TrainingRecordRepo.all());
    setPlanItems(await TrainingPlanRepo.all());
  };
  useEffect(() => {
    load();
  }, []);

  const siteRecords = useMemo(
    () => records.filter((r) => r.siteName === siteName).sort((a, b) => b.date.localeCompare(a.date)),
    [records, siteName]
  );

  const pendingPlanItems = useMemo(() => planItems.filter((i) => i.siteName === siteName && !i.done), [planItems, siteName]);

  const onImageSelected = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const openAdd = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setPlanItemId('');
    setProgramName('');
    setTraineeCount(1);
    setTrainerName('');
    setNotes('');
    setImageDataUrl(undefined);
    setShowAdd(true);
  };

  const onPickPlanItem = (id: string) => {
    setPlanItemId(id);
    const item = pendingPlanItems.find((i) => i.id === id);
    if (item) setProgramName(item.topic);
  };

  const save = async () => {
    if (!programName.trim() || !trainerName.trim() || traineeCount < 0) return;
    const recordId = generateId();
    await TrainingRecordRepo.save({
      id: recordId,
      siteName,
      date,
      planItemId: planItemId || undefined,
      programName: programName.trim(),
      traineeCount,
      trainerName: trainerName.trim(),
      imageDataUrl,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString()
    });
    if (planItemId) {
      const item = planItems.find((i) => i.id === planItemId);
      if (item) await TrainingPlanRepo.save({ ...item, done: true, doneDate: date, recordId });
    }
    await ActivityLogRepo.log('trainingRecordLogged', `${siteName} — ${programName.trim()}`);
    setShowAdd(false);
    load();
  };

  const removeRecord = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'حذف هذا السجل؟' : 'Delete this record?')) return;
    await TrainingRecordRepo.remove(id);
    load();
  };

  return (
    <div>
      <div className="toolbar no-print">
        <button className="btn btn-outline" onClick={onBack}>
          {lang === 'ar' ? 'رجوع' : 'Back'}
        </button>
        <button className="btn btn-primary" onClick={openAdd}>
          + {lang === 'ar' ? 'إضافة سجل تدريب' : 'Add Training Record'}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 6 }}>
        <div style={{ fontWeight: 800 }}>
          {lang === 'ar' ? 'سجلات التدريب' : 'Training Records'} — {siteName}
        </div>
      </div>

      {siteRecords.length === 0 ? (
        <div className="empty-state">{lang === 'ar' ? 'لا توجد سجلات مسجلة' : 'No records logged yet'}</div>
      ) : (
        siteRecords.map((r) => (
          <div key={r.id} className="record-card" style={{ marginBottom: 10 }}>
            <div className="record-card-header">
              <div className="record-card-title">{r.programName}</div>
              <span className="badge" style={{ background: r.planItemId ? 'var(--primary)' : 'var(--warning)' }}>
                {r.planItemId ? (lang === 'ar' ? 'مخطط' : 'Planned') : lang === 'ar' ? 'غير مخطط' : 'Unplanned'}
              </span>
            </div>
            <div className="record-card-row">
              <span>{lang === 'ar' ? 'التاريخ' : 'Date'}</span>
              <span>{r.date}</span>
            </div>
            <div className="record-card-row">
              <span>{lang === 'ar' ? 'عدد المتدربين' : 'Trainees'}</span>
              <span>{r.traineeCount}</span>
            </div>
            <div className="record-card-row">
              <span>{lang === 'ar' ? 'القائم بالتدريب' : 'Trainer'}</span>
              <span>{r.trainerName}</span>
            </div>
            {r.imageDataUrl && <img src={r.imageDataUrl} alt="training record" style={{ height: 70, borderRadius: 8, marginTop: 8 }} />}
            <div className="record-card-actions">
              <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => removeRecord(r.id)}>
                {lang === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        ))
      )}

      {showAdd && (
        <Modal title={lang === 'ar' ? 'إضافة سجل تدريب' : 'Add Training Record'} onClose={() => setShowAdd(false)}>
          <div className="form-grid">
            <div className="form-field">
              <label>{lang === 'ar' ? 'التاريخ' : 'Date'}</label>
              <DateInput value={date} onChange={setDate} />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'مخطط له من الخطة (اختياري)' : 'Planned From (optional)'}</label>
              <select value={planItemId} onChange={(e) => onPickPlanItem(e.target.value)}>
                <option value="">{lang === 'ar' ? '— غير مخطط له —' : '— Unplanned —'}</option>
                {pendingPlanItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.topic} ({i.targetAudience})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-grid" style={{ marginTop: 10 }}>
            <div className="form-field">
              <label>{lang === 'ar' ? 'اسم البرنامج' : 'Program Name'}</label>
              <input value={programName} onChange={(e) => setProgramName(e.target.value)} />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'عدد المتدربين' : 'Number of Trainees'}</label>
              <input type="number" min={0} value={traineeCount} onChange={(e) => setTraineeCount(Number(e.target.value))} />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'القائم بالتدريب' : 'Trainer Name'}</label>
              <input value={trainerName} onChange={(e) => setTrainerName(e.target.value)} />
            </div>
          </div>
          <div className="form-field" style={{ marginTop: 10 }}>
            <label>{lang === 'ar' ? 'ملاحظات' : 'Notes'}</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="form-field" style={{ marginTop: 10 }}>
            <label>{lang === 'ar' ? 'صورة سجل التدريب (اختياري)' : 'Training Record Image (optional)'}</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {imageDataUrl && <img src={imageDataUrl} alt="training" style={{ height: 60, borderRadius: 8 }} />}
              <button className="btn btn-outline btn-sm" onClick={() => cameraInputRef.current?.click()}>
                📷 {lang === 'ar' ? 'التقاط بالكاميرا' : 'Capture from Camera'}
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => galleryInputRef.current?.click()}>
                🖼️ {lang === 'ar' ? 'اختيار من المعرض' : 'Choose from Gallery'}
              </button>
              {imageDataUrl && (
                <button className="btn btn-outline btn-sm" onClick={() => setImageDataUrl(undefined)}>
                  {lang === 'ar' ? 'إزالة' : 'Remove'}
                </button>
              )}
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => onImageSelected(e.target.files?.[0])} />
              <input ref={galleryInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => onImageSelected(e.target.files?.[0])} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setShowAdd(false)}>
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
