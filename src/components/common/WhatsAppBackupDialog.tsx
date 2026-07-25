import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { exportAllData } from '../../db/db';
import type { Lang } from '../../i18n/translations';

function toWhatsAppNumber(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.startsWith('20')) return digits; // already has Egypt country code
  if (digits.startsWith('0')) return `20${digits.slice(1)}`; // local format 0XXXXXXXXXX
  return digits; // assume already includes a country code
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
  // The backup file is built as soon as the dialog opens (not on click) so that
  // clicking "Share" can call navigator.share() with zero `await` in between.
  // Browsers (especially on mobile) revoke the share permission as soon as any
  // async gap follows the click, so any data prep must happen ahead of time.
  const [file, setFile] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeIsError, setNoticeIsError] = useState(false);
  const [number, setNumber] = useState(savedNumber ?? '');
  const [remember, setRemember] = useState(!!savedNumber);

  const message = buildMessage(lang, doctorName, doctorCode);
  const whatsappNumber = toWhatsAppNumber(number);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await exportAllData();
        const json = JSON.stringify(data, null, 2);
        // Use a .txt/text-plain file specifically for WhatsApp sharing: many mobile
        // browsers silently reject navigator.share() for application/json files
        // (it isn't on their allowed file-type list), causing a silent fallback to
        // download instead of opening the share sheet. text/plain is universally
        // accepted, and the content itself is still the same valid JSON backup.
        const filename = `expirymate-backup-${new Date().toISOString().slice(0, 10)}.txt`;
        const f = new File([json], filename, { type: 'text/plain' });
        if (!cancelled) {
          setFile(f);
          setPreparing(false);
        }
      } catch {
        if (!cancelled) {
          setPreparing(false);
          setNoticeIsError(true);
          setNotice(
            lang === 'ar' ? 'تعذّر تجهيز ملف النسخة الاحتياطية.' : 'Could not prepare the backup file.'
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadFallback = (f: File) => {
    const url = URL.createObjectURL(f);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setNoticeIsError(false);
    setNotice(
      lang === 'ar'
        ? 'تم تنزيل ملف النسخة الاحتياطية على جهازك. هيتم فتح واتساب بالرسالة، اختر الشخص وأرفق الملف الذي تم تنزيله يدويًا.'
        : 'The backup file has been downloaded to your device. WhatsApp will open with the message ready — choose the recipient and attach the downloaded file manually.'
    );
    // If a number was entered, open that chat directly (still requires the user to
    // press Send themselves — nothing is sent automatically). Otherwise fall back to
    // WhatsApp's generic contact picker, which isn't reliably supported everywhere.
    const waUrl = whatsappNumber
      ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const share = () => {
    if (!file) return;
    if (remember && number.trim()) onSaveNumber(number.trim());
    setNotice(null);
    setNoticeIsError(false);
    try {
      const canShareFiles = !!(navigator as any).canShare && (navigator as any).canShare({ files: [file] });
      if (navigator.share && canShareFiles) {
        // Called synchronously from the click handler with an already-prepared
        // file, so the browser still recognizes this as a direct user gesture.
        navigator.share({ text: message, files: [file] }).catch((err: any) => {
          if (err?.name === 'AbortError') return; // user closed the share sheet — not an error
          downloadFallback(file);
        });
        return;
      }
    } catch {
      // fall through to the download fallback below
    }
    downloadFallback(file);
  };

  return (
    <Modal title={lang === 'ar' ? 'مشاركة نسخة احتياطية عبر واتساب' : 'Share Backup via WhatsApp'} onClose={onClose}>
      <div className="form-field">
        <label>{lang === 'ar' ? 'رقم واتساب المستلم (اختياري)' : "Recipient's WhatsApp Number (optional)"}</label>
        <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="01xxxxxxxxx" />
        <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginTop: 4 }}>
          {lang === 'ar'
            ? 'لو واتساب ما فتحش تلقائيًا من غير رقم على جهازك، اكتب رقم المستلم هنا عشان يفتح المحادثة مباشرة (لسه هتضغط إرسال بنفسك).'
            : "If WhatsApp doesn't open automatically without a number on your device, enter the recipient's number here to open the chat directly (you'll still press Send yourself)."}
        </div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', marginTop: 8 }}>
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        {lang === 'ar' ? 'حفظ هذا الرقم للاستخدام لاحقًا' : 'Save this number for future use'}
      </label>

      <div className="form-field" style={{ marginTop: 14 }}>
        <label>{lang === 'ar' ? 'معاينة الرسالة' : 'Message Preview'}</label>
        <textarea rows={7} value={message} readOnly />
      </div>

      {notice && (
        <div style={{ fontSize: '0.82rem', color: noticeIsError ? 'var(--danger)' : 'var(--on-surface-variant)', marginTop: 8 }}>
          {notice}
        </div>
      )}

      {!whatsappNumber && number.trim() && (
        <div style={{ fontSize: '0.82rem', color: 'var(--danger)', marginTop: 8 }}>
          {lang === 'ar' ? 'رقم غير صالح.' : 'Invalid number.'}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
        <button className="btn btn-outline" onClick={onClose}>
          {lang === 'ar' ? 'إلغاء' : 'Cancel'}
        </button>
        <button className="btn btn-primary" onClick={share} disabled={preparing || !file}>
          🟢 {preparing ? (lang === 'ar' ? 'جارٍ التجهيز...' : 'Preparing...') : lang === 'ar' ? 'مشاركة عبر واتساب' : 'Share via WhatsApp'}
        </button>
      </div>

      <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginTop: 12 }}>
        {lang === 'ar'
          ? 'هيتفتح لك قائمة المشاركة، اختار واتساب منها، بعدين اختار الشخص بنفسك واضغط إرسال يدويًا. مفيش أي إرسال تلقائي.'
          : "This opens your device's share sheet — pick WhatsApp, choose the recipient yourself, then press Send manually. Nothing is sent automatically."}
      </div>
    </Modal>
  );
}
