import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TrainingPlanRepo, ActivityLogRepo } from '../../db/repositories';
import { generateId } from '../../db/db';
import type { TrainingPlanItem } from '../../types';
import Modal from '../common/Modal';

const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];
const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function TrainingPlanManager({ siteName, onBack }: { siteName: string; onBack: () => void }) {
  const { lang } = useApp();
  const [items, setItems] = useState<TrainingPlanItem[]>([]);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [showAdd, setShowAdd] = useState(false);
  const [topic, setTopic] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [repeatAllMonths, setRepeatAllMonths] = useState(false);

  const load = async () => setItems(await TrainingPlanRepo.all());
  useEffect(() => {
    load();
  }, []);

  const monthItems = useMemo(
    () => items.filter((i) => i.siteName === siteName && i.year === year && i.month === month),
    [items, siteName, year, month]
  );

  const monthNames = lang === 'ar' ? MONTH_NAMES_AR : MONTH_NAMES_EN;

  const addItem = async () => {
    if (!topic.trim() || !targetAudience.trim()) return;
    const now2 = new Date().toISOString();
    const months = repeatAllMonths ? Array.from({ length: 12 }, (_, i) => i + 1) : [month];
    for (const m of months) {
      await TrainingPlanRepo.save({
        id: generateId(),
        siteName,
        year,
        month: m,
        topic: topic.trim(),
        targetAudience: targetAudience.trim(),
        done: false,
        createdAt: now2
      });
    }
    await ActivityLogRepo.log('trainingPlanUpdated', `${siteName} — ${topic.trim()}`);
    setTopic('');
    setTargetAudience('');
    setRepeatAllMonths(false);
    setShowAdd(false);
    load();
  };

  const toggleDone = async (item: TrainingPlanItem) => {
    const done = !item.done;
    await TrainingPlanRepo.save({
      ...item,
      done,
      doneDate: done ? new Date().toISOString().slice(0, 10) : undefined,
      recordId: done ? item.recordId : undefined
    });
    load();
  };

  const removeItem = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'حذف هذا البند؟' : 'Delete this element?')) return;
    await TrainingPlanRepo.remove(id);
    load();
  };

  const doneCount = monthItems.filter((i) => i.done).length;

  return (
    <div>
      <div className="toolbar no-print">
        <button className="btn btn-outline" onClick={onBack}>
          {lang === 'ar' ? 'رجوع' : 'Back'}
        </button>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + {lang === 'ar' ? 'إضافة بند' : 'Add Element'}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>
          {lang === 'ar' ? 'الخطة السنوية للتدريب' : 'Annual Training Plan'} — {siteName}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="form-field" style={{ width: 120 }}>
            <label>{lang === 'ar' ? 'السنة' : 'Year'}</label>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
          {monthNames.map((name, idx) => (
            <button key={name} className={`btn ${month === idx + 1 ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => setMonth(idx + 1)}>
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>
            {monthNames[month - 1]} {year}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
            {lang === 'ar' ? `منجز ${doneCount} من ${monthItems.length}` : `${doneCount} of ${monthItems.length} done`}
          </div>
        </div>

        {monthItems.length === 0 ? (
          <div className="empty-state">{lang === 'ar' ? 'لا توجد بنود لهذا الشهر' : 'No elements for this month'}</div>
        ) : (
          monthItems.map((item) => (
            <div key={item.id} className="record-card" style={{ marginBottom: 10 }}>
              <div className="record-card-header">
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1 }}>
                  <input type="checkbox" checked={item.done} onChange={() => toggleDone(item)} />
                  <span style={{ fontWeight: 700, textDecoration: item.done ? 'line-through' : 'none' }}>{item.topic}</span>
                </label>
                <button className="icon-btn" onClick={() => removeItem(item.id)} title={lang === 'ar' ? 'حذف' : 'Delete'}>
                  🗑️
                </button>
              </div>
              <div className="record-card-row">
                <span>{lang === 'ar' ? 'الفئة المستهدفة' : 'Target Audience'}</span>
                <span>{item.targetAudience}</span>
              </div>
              <div className="record-card-row">
                <span>{lang === 'ar' ? 'الحالة' : 'Status'}</span>
                <span style={{ color: item.done ? 'var(--primary)' : 'var(--warning)', fontWeight: 700 }}>
                  {item.done ? (lang === 'ar' ? 'تم' : 'Done') : lang === 'ar' ? 'لم يتم' : 'Not Done'}
                </span>
              </div>
              {item.done && item.doneDate && (
                <div className="record-card-row">
                  <span>{lang === 'ar' ? 'تاريخ الإنجاز' : 'Done Date'}</span>
                  <span>{item.doneDate}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showAdd && (
        <Modal title={lang === 'ar' ? 'إضافة بند تدريب' : 'Add Training Element'} onClose={() => setShowAdd(false)}>
          <div className="form-field">
            <label>{lang === 'ar' ? 'موضوع التدريب' : 'Training Topic'}</label>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} autoFocus />
          </div>
          <div className="form-field" style={{ marginTop: 10 }}>
            <label>{lang === 'ar' ? 'الفئة المستهدفة' : 'Target Audience'}</label>
            <input value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: '0.85rem' }}>
            <input type="checkbox" checked={repeatAllMonths} onChange={(e) => setRepeatAllMonths(e.target.checked)} />
            {lang === 'ar' ? `تكرار هذا البند في كل أشهر سنة ${year}` : `Repeat this element across all months of ${year}`}
          </label>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setShowAdd(false)}>
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button className="btn btn-primary" onClick={addItem}>
              {lang === 'ar' ? 'إضافة' : 'Add'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
