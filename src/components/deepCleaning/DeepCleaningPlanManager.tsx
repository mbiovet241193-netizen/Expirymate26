import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DeepCleaningPlanRepo, ActivityLogRepo } from '../../db/repositories';
import { generateId } from '../../db/db';
import type { DeepCleaningPlanItem } from '../../types';
import Modal from '../common/Modal';

const DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DeepCleaningPlanManager({ siteName, onBack }: { siteName: string; onBack: () => void }) {
  const { lang } = useApp();
  const [items, setItems] = useState<DeepCleaningPlanItem[]>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<DeepCleaningPlanItem | null>(null);
  const [elementName, setElementName] = useState('');
  const [daysOfWeek, setDaysOfWeek] = useState<Set<number>>(new Set());

  const load = async () => setItems(await DeepCleaningPlanRepo.all());
  useEffect(() => {
    load();
  }, []);

  const siteItems = useMemo(() => items.filter((i) => i.siteName === siteName), [items, siteName]);
  const dayNames = lang === 'ar' ? DAY_NAMES_AR : DAY_NAMES_EN;

  const openAdd = () => {
    setEditing(null);
    setElementName('');
    setDaysOfWeek(new Set());
    setShowAdd(true);
  };

  const openEdit = (item: DeepCleaningPlanItem) => {
    setEditing(item);
    setElementName(item.elementName);
    setDaysOfWeek(new Set(item.daysOfWeek));
    setShowAdd(true);
  };

  const toggleDay = (d: number) => {
    const next = new Set(daysOfWeek);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    setDaysOfWeek(next);
  };

  const save = async () => {
    if (!elementName.trim() || daysOfWeek.size === 0) return;
    const item: DeepCleaningPlanItem = editing
      ? { ...editing, elementName: elementName.trim(), daysOfWeek: Array.from(daysOfWeek).sort() }
      : { id: generateId(), siteName, elementName: elementName.trim(), daysOfWeek: Array.from(daysOfWeek).sort(), createdAt: new Date().toISOString() };
    await DeepCleaningPlanRepo.save(item);
    if (!editing) await ActivityLogRepo.log('deepCleaningPlanUpdated', `${siteName} — ${elementName.trim()}`);
    setShowAdd(false);
    load();
  };

  const removeItem = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'حذف هذا البند؟' : 'Delete this element?')) return;
    await DeepCleaningPlanRepo.remove(id);
    load();
  };

  return (
    <div>
      <div className="toolbar no-print">
        <button className="btn btn-outline" onClick={onBack}>
          {lang === 'ar' ? 'رجوع' : 'Back'}
        </button>
        <button className="btn btn-primary" onClick={openAdd}>
          + {lang === 'ar' ? 'إضافة بند' : 'Add Element'}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800 }}>
          {lang === 'ar' ? 'الخطة الأسبوعية للنظافة العميقة' : 'Weekly Deep Cleaning Plan'} — {siteName}
        </div>
      </div>

      {siteItems.length === 0 ? (
        <div className="empty-state">{lang === 'ar' ? 'لا توجد بنود مسجلة' : 'No elements logged yet'}</div>
      ) : (
        siteItems.map((item) => (
          <div key={item.id} className="record-card" style={{ marginBottom: 10 }}>
            <div className="record-card-header">
              <div className="record-card-title">{item.elementName}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="icon-btn" onClick={() => openEdit(item)} title={lang === 'ar' ? 'تعديل' : 'Edit'}>
                  ✏️
                </button>
                <button className="icon-btn" onClick={() => removeItem(item.id)} title={lang === 'ar' ? 'حذف' : 'Delete'}>
                  🗑️
                </button>
              </div>
            </div>
            <div className="record-card-row">
              <span>{lang === 'ar' ? 'الأيام' : 'Days'}</span>
              <span>{item.daysOfWeek.map((d) => dayNames[d]).join('، ')}</span>
            </div>
          </div>
        ))
      )}

      {showAdd && (
        <Modal title={editing ? (lang === 'ar' ? 'تعديل بند' : 'Edit Element') : lang === 'ar' ? 'إضافة بند نظافة عميقة' : 'Add Deep Cleaning Element'} onClose={() => setShowAdd(false)}>
          <div className="form-field">
            <label>{lang === 'ar' ? 'اسم البند' : 'Element Name'}</label>
            <input value={elementName} onChange={(e) => setElementName(e.target.value)} autoFocus />
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>{lang === 'ar' ? 'الأيام (يمكن اختيار أكثر من يوم)' : 'Days (multiple allowed)'}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {dayNames.map((name, idx) => (
                <button
                  key={name}
                  type="button"
                  className={`btn ${daysOfWeek.has(idx) ? 'btn-primary' : 'btn-outline'} btn-sm`}
                  onClick={() => toggleDay(idx)}
                >
                  {name}
                </button>
              ))}
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
