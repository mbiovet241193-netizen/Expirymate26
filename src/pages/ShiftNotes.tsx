import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShiftNoteRepo, ActivityLogRepo } from '../db/repositories';
import { generateId } from '../db/db';
import type { ShiftNote } from '../types';
import Autocomplete from '../components/common/Autocomplete';
import DateInput from '../components/common/DateInput';
import Modal from '../components/common/Modal';

export default function ShiftNotes() {
  const { lang, settings } = useApp();
  const [siteFilter, setSiteFilter] = useState(settings.siteNames[0] ?? '');
  const [notes, setNotes] = useState<ShiftNote[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ShiftNote | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [text, setText] = useState('');

  const load = async () => setNotes(await ShiftNoteRepo.all());
  useEffect(() => {
    load();
  }, []);

  const siteNotes = useMemo(
    () => notes.filter((n) => n.siteName === siteFilter).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [notes, siteFilter]
  );

  const openAdd = () => {
    setEditing(null);
    setDate(new Date().toISOString().slice(0, 10));
    setText('');
    setShowModal(true);
  };

  const openEdit = (n: ShiftNote) => {
    setEditing(n);
    setDate(n.date);
    setText(n.text);
    setShowModal(true);
  };

  const save = async () => {
    if (!text.trim()) return;
    const note: ShiftNote = editing
      ? { ...editing, date, text: text.trim() }
      : { id: generateId(), siteName: siteFilter, date, text: text.trim(), createdAt: new Date().toISOString() };
    await ShiftNoteRepo.save(note);
    if (!editing) await ActivityLogRepo.log('shiftNoteAdded', siteFilter);
    setShowModal(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'حذف هذه الملاحظة؟' : 'Delete this note?')) return;
    await ShiftNoteRepo.remove(id);
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
          + {lang === 'ar' ? 'إضافة ملاحظة' : 'Add Note'}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 6 }}>
        <div style={{ fontWeight: 800 }}>
          {lang === 'ar' ? 'ملاحظات الشفت' : 'Shift Notes'} {siteFilter && `— ${siteFilter}`}
        </div>
      </div>

      {!siteFilter ? (
        <div style={{ marginTop: 14, fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
          {lang === 'ar' ? 'اختر موقعًا أولًا للمتابعة.' : 'Select a site first to continue.'}
        </div>
      ) : siteNotes.length === 0 ? (
        <div className="empty-state">{lang === 'ar' ? 'لا توجد ملاحظات مسجلة' : 'No notes logged yet'}</div>
      ) : (
        siteNotes.map((n) => (
          <div key={n.id} className="record-card" style={{ marginBottom: 10 }}>
            <div className="record-card-header">
              <div className="record-card-title">{n.date}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="icon-btn" onClick={() => openEdit(n)} title={lang === 'ar' ? 'تعديل' : 'Edit'}>
                  ✏️
                </button>
                <button className="icon-btn" onClick={() => remove(n.id)} title={lang === 'ar' ? 'حذف' : 'Delete'}>
                  🗑️
                </button>
              </div>
            </div>
            <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{n.text}</div>
          </div>
        ))
      )}

      {showModal && (
        <Modal title={editing ? (lang === 'ar' ? 'تعديل ملاحظة' : 'Edit Note') : lang === 'ar' ? 'إضافة ملاحظة' : 'Add Note'} onClose={() => setShowModal(false)}>
          <div className="form-field">
            <label>{lang === 'ar' ? 'التاريخ' : 'Date'}</label>
            <DateInput value={date} onChange={setDate} />
          </div>
          <div className="form-field" style={{ marginTop: 10 }}>
            <label>{lang === 'ar' ? 'الملاحظة' : 'Note'}</label>
            <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
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
