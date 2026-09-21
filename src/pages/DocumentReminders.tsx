import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { DocumentReminderRepo, ActivityLogRepo } from '../db/repositories';
import { generateId } from '../db/db';
import type { DocumentReminder } from '../types';
import { computeDocumentStatus, DOCUMENT_STATUS_LABELS } from '../engine/documentEngine';
import DateInput from '../components/common/DateInput';
import Modal from '../components/common/Modal';

export default function DocumentReminders() {
  const { lang } = useApp();
  const [documents, setDocuments] = useState<DocumentReminder[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DocumentReminder | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [belongsTo, setBelongsTo] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const load = async () => setDocuments(await DocumentReminderRepo.all());
  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => [...documents].sort((a, b) => a.endDate.localeCompare(b.endDate)), [documents]);

  const openAdd = () => {
    setEditing(null);
    setDocumentName('');
    setBelongsTo('');
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate(new Date().toISOString().slice(0, 10));
    setShowModal(true);
  };

  const openEdit = (d: DocumentReminder) => {
    setEditing(d);
    setDocumentName(d.documentName);
    setBelongsTo(d.belongsTo);
    setStartDate(d.startDate);
    setEndDate(d.endDate);
    setShowModal(true);
  };

  const save = async () => {
    if (!documentName.trim() || !belongsTo.trim()) return;
    const doc: DocumentReminder = editing
      ? { ...editing, documentName: documentName.trim(), belongsTo: belongsTo.trim(), startDate, endDate }
      : { id: generateId(), documentName: documentName.trim(), belongsTo: belongsTo.trim(), startDate, endDate, createdAt: new Date().toISOString() };
    await DocumentReminderRepo.save(doc);
    if (!editing) await ActivityLogRepo.log('documentAdded', documentName.trim());
    setShowModal(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'حذف هذا المستند؟' : 'Delete this document?')) return;
    await DocumentReminderRepo.remove(id);
    load();
  };

  return (
    <div>
      <div className="toolbar no-print">
        <button className="btn btn-primary" onClick={openAdd}>
          + {lang === 'ar' ? 'إضافة مستند جديد' : 'Add New Document'}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 6 }}>
        <div style={{ fontWeight: 800 }}>{lang === 'ar' ? 'منبه المستندات' : 'Document Reminder'}</div>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">{lang === 'ar' ? 'لا توجد مستندات مسجلة' : 'No documents logged yet'}</div>
      ) : (
        sorted.map((d) => {
          const { remainingDays, status } = computeDocumentStatus(d.endDate);
          const label = DOCUMENT_STATUS_LABELS[status];
          return (
            <div key={d.id} className="record-card" style={{ marginBottom: 10 }}>
              <div className="record-card-header">
                <div className="record-card-title">{d.documentName}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className="badge" style={{ background: label.color }}>
                    {lang === 'ar' ? label.ar : label.en}
                  </span>
                  <button className="icon-btn" onClick={() => openEdit(d)} title={lang === 'ar' ? 'تعديل' : 'Edit'}>
                    ✏️
                  </button>
                  <button className="icon-btn" onClick={() => remove(d.id)} title={lang === 'ar' ? 'حذف' : 'Delete'}>
                    🗑️
                  </button>
                </div>
              </div>
              <div className="record-card-row">
                <span>{lang === 'ar' ? 'خاص بـ' : 'Belongs To'}</span>
                <span>{d.belongsTo}</span>
              </div>
              <div className="record-card-row">
                <span>{lang === 'ar' ? 'تاريخ البداية' : 'Start Date'}</span>
                <span>{d.startDate}</span>
              </div>
              <div className="record-card-row">
                <span>{lang === 'ar' ? 'تاريخ النهاية' : 'End Date'}</span>
                <span>{d.endDate}</span>
              </div>
              <div className="record-card-row">
                <span>{lang === 'ar' ? 'المدة المتبقية' : 'Remaining Days'}</span>
                <span style={{ fontWeight: 700, color: label.color }}>
                  {remainingDays} {lang === 'ar' ? 'يوم' : 'days'}
                </span>
              </div>
            </div>
          );
        })
      )}

      {showModal && (
        <Modal title={editing ? (lang === 'ar' ? 'تعديل مستند' : 'Edit Document') : lang === 'ar' ? 'إضافة مستند جديد' : 'Add New Document'} onClose={() => setShowModal(false)}>
          <div className="form-field">
            <label>{lang === 'ar' ? 'اسم المستند' : 'Document Name'}</label>
            <input value={documentName} onChange={(e) => setDocumentName(e.target.value)} autoFocus />
          </div>
          <div className="form-field" style={{ marginTop: 10 }}>
            <label>{lang === 'ar' ? 'خاص بمين' : 'Belongs To'}</label>
            <input value={belongsTo} onChange={(e) => setBelongsTo(e.target.value)} />
          </div>
          <div className="form-grid" style={{ marginTop: 10 }}>
            <div className="form-field">
              <label>{lang === 'ar' ? 'تاريخ البداية' : 'Start Date'}</label>
              <DateInput value={startDate} onChange={setStartDate} />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'تاريخ النهاية' : 'End Date'}</label>
              <DateInput value={endDate} onChange={setEndDate} />
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
