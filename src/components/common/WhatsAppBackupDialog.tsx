import React, { useState } from 'react';
import Modal from './Modal';
import { exportAllData } from '../../db/db';
import type { Lang } from '../../i18n/translations';

function toWhatsAppNumber(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.startsWith('20')) return digits;
  if (digits.startsWith('0')) return `20${digits.slice(1)}`;
  return digits;
}

function buildMessage(lang: Lang, doctorName: string, doctorCode: string): string {
  if (lang === 'ar') {
    return `زميلي العزيز،\n\nمرفق آخر نسخة احتياطية من نظام متابعة الصلاحية، محدثة حتى اليوم.\n\nتفضلوا بقبول فائق الاحترام والتقدير.\n\nتوقيع\n\nد. ${doctorName || '—'}\n\nكود: ${doctorCode || '—'}`;
  }
  return `Dear Colleague,\n\nPlease find attached the latest backup of the Expiry Monitoring System, updated through today.\n\nKindly accept my sincere regards.\n\nSignature\n\nDr. ${doctorName || '—'}\n\nCode: ${doctorCode || '—'}`;
}

export default function WhatsAppBackupDialog({
  lang,
  doctorName,
  doctorCode,
  savedNumber,
  onSaveNumber,
  onClose
}: {
  lang: Lang;
  doctorName: string;
  doctorCode: string;
  savedNumber?: string;
  onSaveNumber: (number: string) => void;
  onClose: () => void;
}) {
  const [number, setNumber] = useState(savedNumber ?? '');
  const [remember, setRemember] = useState(!!savedNumber);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const message = buildMessage(lang, doctorName, doctorCode);
  const whatsappNumber = toWhatsAppNumber(number);

  const openWhatsApp = () => {
    if (!whatsappNumber) return;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const send = async () => {
    if (!whatsappNumber) return;
    if (remember && number.trim()) onSaveNumber(number.trim());

    setBusy(true);
    try {
      const data = await exportAllData();
      const json = JSON.stringify(data, null, 2);
      const filename = `expirymate-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const file = new File([json], filename, { type: 'application/json' });

      const canShareFiles = (navigator as any).canShare && (navigator as any).canShare({ files: [file] });
      if (navigator.share && canShareFiles) {
        await navigator.share({ text: message, files: [file] });
        setBusy(false);
        return;
      }

      // Fallback: download the backup file so the user can attach it manually, then open WhatsApp with the message.
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setNotice(
        lang === 'ar'
          ? 'تم تنزيل ملف النسخة الاحتياطية على جهازك. سيتم فتح واتساب بالرسالة، ويرجى إرفاق الملف الذي تم تنزيله يدويًا.'
          : 'The backup file has been downloaded to your device. WhatsApp will open with the message — please attach the downloaded file manually.'
      );
      openWhatsApp();
    } catch {
      setNotice(
        lang === 'ar' ? 'تعذّر تجهيز الملف للمشاركة. حاول مرة أخرى.' : 'Could not prepare the file for sharing. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={lang === 'ar' ? 'إرسال نسخة احتياطية عبر واتساب' : 'Send Backup via WhatsApp'} onClose={onClose}>
      <div className="form-field">
        <label>{lang === 'ar' ? 'رقم واتساب المستلم' : "Recipient's WhatsApp Number"}</label>
        <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="01xxxxxxxxx" />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', marginTop: 8 }}>
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        {lang === 'ar' ? 'حفظ هذا الرقم للاستخدام لاحقًا' : 'Save this number for future use'}
      </label>

      <div className="form-field" style={{ marginTop: 14 }}>
        <label>{lang === 'ar' ? 'معاينة الرسالة' : 'Message Preview'}</label>
        <textarea rows={7} value={message} readOnly />
      </div>

      {notice && <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)', marginTop: 8 }}>{notice}</div>}

      {!whatsappNumber && number.trim() && (
        <div style={{ fontSize: '0.82rem', color: 'var(--danger)', marginTop: 8 }}>
          {lang === 'ar' ? 'رقم غير صالح.' : 'Invalid number.'}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
        <button className="btn btn-outline" onClick={onClose}>
          {lang === 'ar' ? 'إلغاء' : 'Cancel'}
        </button>
        <button className="btn btn-primary" onClick={send} disabled={!whatsappNumber || busy}>
          🟢 {busy ? (lang === 'ar' ? 'جارٍ التجهيز...' : 'Preparing...') : lang === 'ar' ? 'فتح واتساب' : 'Open WhatsApp'}
        </button>
      </div>

      <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginTop: 12 }}>
        {lang === 'ar'
          ? 'هيتم فتح واتساب بالرسالة جاهزة، وأنت اللي هتضغط إرسال يدويًا داخل واتساب.'
          : 'WhatsApp will open with the message ready — you press Send manually inside WhatsApp.'}
      </div>
    </Modal>
  );
}
