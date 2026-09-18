import React, { useMemo, useState } from 'react';
import Modal from '../common/Modal';
import type { Employee } from '../../types';
import type { Lang } from '../../i18n/translations';
import { type MessageOption, toWhatsAppNumber, buildWhatsAppTemplates } from '../../utils/whatsappTemplates';

/**
 * Bulk WhatsApp messaging for a set of selected employees.
 *
 * IMPORTANT: QualityMate never sends messages automatically. This dialog only
 * prepares one message per employee; the user must open WhatsApp and press
 * Send manually for each employee, one at a time. There is no "send all" action.
 */
export default function BulkWhatsAppDialog({
  employees,
  companyName,
  lang,
  onClose
}: {
  employees: Employee[];
  companyName: string;
  lang: Lang;
  onClose: () => void;
}) {
  const [option, setOption] = useState<MessageOption | null>(null);
  const [customText, setCustomText] = useState('');
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const rows = useMemo(
    () =>
      employees.map((employee) => ({
        employee,
        whatsappNumber: employee.mobilePhone ? toWhatsAppNumber(employee.mobilePhone) : null,
        templates: buildWhatsAppTemplates(employee, companyName, lang)
      })),
    [employees, companyName, lang]
  );

  const sendableCount = rows.filter((r) => r.whatsappNumber).length;

  const messageFor = (row: (typeof rows)[number]): string => {
    if (option === 'custom') return customText;
    if (option) return row.templates[option].build();
    return '';
  };

  const send = (row: (typeof rows)[number]) => {
    if (!row.whatsappNumber) return;
    const text = messageFor(row);
    if (!text.trim()) return;
    const url = `https://wa.me/${row.whatsappNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setSentIds((prev) => new Set(prev).add(row.employee.id));
  };

  return (
    <Modal title={lang === 'ar' ? 'إرسال واتساب للمحددين' : 'Send WhatsApp to Selected'} onClose={onClose}>
      <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)', marginBottom: 12 }}>
        {lang === 'ar'
          ? `${employees.length} موظف محدد، ${sendableCount} منهم لديه رقم موبايل مسجل. اختر نوع الرسالة، ثم اضغط "إرسال" لكل موظف على حدة — كل ضغطة تفتح واتساب لهذا الموظف فقط، وعليك تأكيد الإرسال يدويًا داخل واتساب.`
          : `${employees.length} employee(s) selected, ${sendableCount} have a mobile number on file. Choose a message type, then press "Send" for each employee individually — each press opens WhatsApp for that one employee, and you confirm sending manually inside WhatsApp.`}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        <button className={`btn ${option === 'expiring' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setOption('expiring')}>
          {lang === 'ar' ? 'شهادة صحية على وشك الانتهاء' : 'Health Certificate Expiring Soon'}
        </button>
        <button className={`btn ${option === 'expired' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setOption('expired')}>
          {lang === 'ar' ? 'شهادة صحية منتهية' : 'Health Certificate Expired'}
        </button>
        <button className={`btn ${option === 'insurance' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setOption('insurance')}>
          {lang === 'ar' ? 'رقم التأمين الطبي' : 'Medical Insurance Card Number'}
        </button>
        <button className={`btn ${option === 'custom' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setOption('custom')}>
          {lang === 'ar' ? 'رسالة مخصصة' : 'Custom Message'}
        </button>
      </div>

      {option === 'custom' && (
        <div className="form-field">
          <label>{lang === 'ar' ? 'نص الرسالة (يُرسل كما هو لكل الموظفين المحددين)' : 'Message text (sent as-is to every selected employee)'}</label>
          <textarea rows={5} value={customText} onChange={(e) => setCustomText(e.target.value)} />
        </div>
      )}

      {option && (
        <div style={{ marginTop: 14, maxHeight: 320, overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>{lang === 'ar' ? 'الموظف' : 'Employee'}</th>
                <th>{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const templateReady = option === 'custom' ? true : row.templates[option].enabled;
                const canSend = !!row.whatsappNumber && templateReady;
                return (
                  <tr key={row.employee.id}>
                    <td>{row.employee.name}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
                      {!row.whatsappNumber
                        ? lang === 'ar'
                          ? 'لا يوجد رقم موبايل'
                          : 'No mobile number'
                        : !templateReady
                        ? lang === 'ar'
                          ? 'بيانات الرسالة غير متوفرة'
                          : 'Message data unavailable'
                        : sentIds.has(row.employee.id)
                        ? lang === 'ar'
                          ? '✅ تم الفتح'
                          : '✅ Opened'
                        : ''}
                    </td>
                    <td>
                      <button className="btn btn-outline btn-sm" disabled={!canSend} onClick={() => send(row)}>
                        🟢 {lang === 'ar' ? 'إرسال' : 'Send'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginTop: 12 }}>
        {lang === 'ar'
          ? 'QualityMate لا يرسل أي رسالة تلقائيًا أبدًا. كل رسالة يتم تجهيزها وفتحها في واتساب على حدة، وأنت اللي تضغط إرسال يدويًا.'
          : 'QualityMate never sends messages automatically. Each message is prepared and opened in WhatsApp individually, and you press Send manually.'}
      </div>
    </Modal>
  );
}
