import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DeepCleaningPlanRepo, DeepCleaningExecutionRepo, ActivityLogRepo } from '../../db/repositories';
import { generateId } from '../../db/db';
import type { DeepCleaningExecution, DeepCleaningPlanItem } from '../../types';
import Modal from '../common/Modal';
import DateInput from '../common/DateInput';

export default function DeepCleaningExecutionManager({ siteName, onBack }: { siteName: string; onBack: () => void }) {
  const { lang } = useApp();
  const [planItems, setPlanItems] = useState<DeepCleaningPlanItem[]>([]);
  const [executions, setExecutions] = useState<DeepCleaningExecution[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [showAdd, setShowAdd] = useState(false);
  const [pickMode, setPickMode] = useState<'existing' | 'new'>('existing');
  const [pickedPlanItemId, setPickedPlanItemId] = useState('');
  const [newElementName, setNewElementName] = useState('');
  const [performedByName, setPerformedByName] = useState('');

  const load = async () => {
    setPlanItems(await DeepCleaningPlanRepo.all());
    setExecutions(await DeepCleaningExecutionRepo.all());
  };
  useEffect(() => {
    load();
  }, []);

  const sitePlanItems = useMemo(() => planItems.filter((i) => i.siteName === siteName), [planItems, siteName]);
  const weekday = new Date(date).getDay(); // 0=Sunday..6=Saturday
  const expectedToday = useMemo(() => sitePlanItems.filter((i) => i.daysOfWeek.includes(weekday)), [sitePlanItems, weekday]);

  const dayExecutions = useMemo(
    () => executions.filter((e) => e.siteName === siteName && e.date === date),
    [executions, siteName, date]
  );

  const executionForPlanItem = (planItemId: string) => dayExecutions.find((e) => e.planItemId === planItemId);

  const openAddForItem = (planItemId: string, elementName: string) => {
    setPickMode('existing');
    setPickedPlanItemId(planItemId);
    setNewElementName(elementName);
    setPerformedByName('');
    setShowAdd(true);
  };

  const openAddGeneric = () => {
    setPickMode('existing');
    setPickedPlanItemId('');
    setNewElementName('');
    setPerformedByName('');
    setShowAdd(true);
  };

  const save = async () => {
    if (!performedByName.trim()) return;
    let elementName = newElementName.trim();
    let planItemId: string | undefined = pickedPlanItemId || undefined;
    if (pickMode === 'existing') {
      const item = sitePlanItems.find((i) => i.id === pickedPlanItemId);
      if (!item) return;
      elementName = item.elementName;
    } else {
      planItemId = undefined;
      if (!elementName) return;
    }
    await DeepCleaningExecutionRepo.save({
      id: generateId(),
      siteName,
      date,
      planItemId,
      elementName,
      performedByName: performedByName.trim(),
      createdAt: new Date().toISOString()
    });
    await ActivityLogRepo.log('deepCleaningExecutionLogged', `${siteName} — ${elementName}`);
    setShowAdd(false);
    load();
  };

  const removeExecution = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'حذف هذا التنفيذ؟' : 'Delete this execution?')) return;
    await DeepCleaningExecutionRepo.remove(id);
    load();
  };

  return (
    <div>
      <div className="toolbar no-print">
        <button className="btn btn-outline" onClick={onBack}>
          {lang === 'ar' ? 'رجوع' : 'Back'}
        </button>
        <div className="form-field" style={{ maxWidth: 200 }}>
          <DateInput value={date} onChange={setDate} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800 }}>
          {lang === 'ar' ? 'المتابعة اليومية — النظافة العميقة' : 'Daily Follow-up — Deep Cleaning'} — {siteName}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>{lang === 'ar' ? 'بنود اليوم المجدولة' : "Today's Scheduled Elements"}</div>
        {expectedToday.length === 0 ? (
          <div className="empty-state">{lang === 'ar' ? 'لا توجد بنود مجدولة لهذا اليوم' : 'No elements scheduled for this day'}</div>
        ) : (
          expectedToday.map((item) => {
            const exec = executionForPlanItem(item.id);
            return (
              <div key={item.id} className="record-card" style={{ marginBottom: 8 }}>
                <div className="record-card-header">
                  <div className="record-card-title">{item.elementName}</div>
                  {exec ? (
                    <span className="badge" style={{ background: 'var(--primary)' }}>
                      {lang === 'ar' ? 'تم' : 'Done'}
                    </span>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => openAddForItem(item.id, item.elementName)}>
                      {lang === 'ar' ? 'تسجيل التنفيذ' : 'Log Execution'}
                    </button>
                  )}
                </div>
                {exec && (
                  <div className="record-card-row">
                    <span>{lang === 'ar' ? 'القائم بالتنفيذ' : 'Performed By'}</span>
                    <span>{exec.performedByName}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 700 }}>{lang === 'ar' ? 'كل تنفيذات هذا اليوم' : "All of Today's Executions"}</div>
          <button className="btn btn-outline btn-sm" onClick={openAddGeneric}>
            + {lang === 'ar' ? 'إضافة تنفيذ آخر' : 'Add Another Execution'}
          </button>
        </div>
        {dayExecutions.length === 0 ? (
          <div className="empty-state">{lang === 'ar' ? 'لا توجد تنفيذات مسجلة' : 'No executions logged yet'}</div>
        ) : (
          dayExecutions.map((e) => (
            <div key={e.id} className="record-card" style={{ marginBottom: 8 }}>
              <div className="record-card-header">
                <div className="record-card-title">{e.elementName}</div>
                <button className="icon-btn" onClick={() => removeExecution(e.id)} title={lang === 'ar' ? 'حذف' : 'Delete'}>
                  🗑️
                </button>
              </div>
              <div className="record-card-row">
                <span>{lang === 'ar' ? 'القائم بالتنفيذ' : 'Performed By'}</span>
                <span>{e.performedByName}</span>
              </div>
              {!e.planItemId && (
                <div className="record-card-row">
                  <span>{lang === 'ar' ? 'النوع' : 'Type'}</span>
                  <span>{lang === 'ar' ? 'بند إضافي لهذا اليوم' : 'Ad-hoc for this day'}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showAdd && (
        <Modal title={lang === 'ar' ? 'تسجيل تنفيذ' : 'Log Execution'} onClose={() => setShowAdd(false)}>
          {!pickedPlanItemId && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button className={`btn ${pickMode === 'existing' ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => setPickMode('existing')}>
                {lang === 'ar' ? 'من بنود الخطة' : 'From Plan Elements'}
              </button>
              <button className={`btn ${pickMode === 'new' ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => setPickMode('new')}>
                {lang === 'ar' ? 'بند جديد لهذا اليوم' : 'New Element for This Day'}
              </button>
            </div>
          )}

          {pickMode === 'existing' ? (
            <div className="form-field">
              <label>{lang === 'ar' ? 'اختر البند' : 'Select Element'}</label>
              <select value={pickedPlanItemId} onChange={(e) => setPickedPlanItemId(e.target.value)}>
                <option value="">{lang === 'ar' ? '— اختر —' : '— Select —'}</option>
                {sitePlanItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.elementName}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-field">
              <label>{lang === 'ar' ? 'اسم البند الجديد' : 'New Element Name'}</label>
              <input value={newElementName} onChange={(e) => setNewElementName(e.target.value)} autoFocus />
            </div>
          )}

          <div className="form-field" style={{ marginTop: 10 }}>
            <label>{lang === 'ar' ? 'القائم بالتنفيذ' : 'Performed By'}</label>
            <input value={performedByName} onChange={(e) => setPerformedByName(e.target.value)} />
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
