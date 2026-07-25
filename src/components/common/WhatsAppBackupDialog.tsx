import React, { useState } from 'react';
import Modal from './Modal';
import { exportAllData } from '../../db/db';
import type { Lang } from '../../i18n/translations';

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
  onClose
}: {
  lang: Lang;
  doctorName: string;
  doctorCode: string;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeIsError, setNoticeIsError] = useState(false);

  const message = buildMessage(lang, doctorName, doctorCode);

  const share = async () => {
    setBusy(true);
    setNotice(null);
    setNoticeIsError(false);
    try {
      const data = await exportAllData();
      const json = JSON.stringify(data, null, 2);
      const filename = `expirymate-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const file = new File([json], filename, { type: 'application/json' });

      const canShareFiles = !!(navigator as any).canShare && (navigator as any).canShare({ files: [file] });
      if (navigator.share && canShareFiles) {
        // Opens the device share sheet: the user picks WhatsApp themselves,
        // then picks the recipient, then presses Send manually. Nothing is sent automatically.
        await navigator.share({ text: message, files: [file] });
        setBusy(false);
        return;
      }

      // WhatsApp/file sharing isn't available in this browser — download the backup
      // instead of silently failing, and explain clearly what to do next.
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setNoticeIsError(false);
      setNotice(
        lang === 'ar'
          ? 'المشاركة المباشرة عبر واتساب غير مدعومة على هذا الجهاز/المتصفح. تم حفظ ملف النسخة الاحتياطية على جهازك — يمكنك فتح واتساب وإرفاقه يدويًا.'
          : "Direct WhatsApp sharing isn't supported on this device/browser. The backup file has been saved to your device — you can open WhatsApp and attach it manually."
      );
    } catch (err: any) {
      // The user cancelling the share sheet also lands here (AbortError) — that's not a real failure.
      if (err?.name === 'AbortError') {
        setBusy(false);
        return;
      }
      setNoticeIsError(true);
      setNotice(
        lang === 'ar' ? 'تعذّر تجهيز الملف للمشاركة. حاول مرة أخرى.' : 'Could not prepare the file for sharing. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={lang === 'ar' ? 'مشاركة نسخة احتياطية عبر واتساب' : 'Share Backup via WhatsApp'} onClose={onClose}>
      <div className="form-field">
        <label>{lang === 'ar' ? 'معاينة الرسالة' : 'Message Preview'}</label>
        <textarea rows={7} value={message} readOnly />
      </div>

      {notice && (
        <div style={{ fontSize: '0.82rem', color: noticeIsError ? 'var(--danger)' : 'var(--on-surface-variant)', marginTop: 8 }}>
          {notice}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
        <button className="btn btn-outline" onClick={onClose}>
          {lang === 'ar' ? 'إلغاء' : 'Cancel'}
        </button>
        <button className="btn btn-primary" onClick={share} disabled={busy}>
          🟢 {busy ? (lang === 'ar' ? 'جارٍ التجهيز...' : 'Preparing...') : lang === 'ar' ? 'مشاركة عبر واتساب' : 'Share via WhatsApp'}
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
