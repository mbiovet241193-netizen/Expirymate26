import React, { useEffect, useState } from 'react';
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
  // The backup file is built as soon as the dialog opens (not on click) so that
  // clicking "Share" can call navigator.share() with zero `await` in between.
  // Browsers (especially on mobile) revoke the share permission as soon as any
  // async gap follows the click, so any data prep must happen ahead of time.
  const [file, setFile] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeIsError, setNoticeIsError] = useState(false);

  const message = buildMessage(lang, doctorName, doctorCode);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await exportAllData();
        const json = JSON.stringify(data, null, 2);
        const filename = `expirymate-backup-${new Date().toISOString().slice(0, 10)}.json`;
        const f = new File([json], filename, { type: 'application/json' });
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
        ? 'المشاركة المباشرة عبر واتساب غير مدعومة على هذا الجهاز/المتصفح. تم حفظ ملف النسخة الاحتياطية على جهازك — يمكنك فتح واتساب وإرفاقه يدويًا.'
        : "Direct WhatsApp sharing isn't supported on this device/browser. The backup file has been saved to your device — you can open WhatsApp and attach it manually."
    );
  };

  const share = () => {
    if (!file) return;
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
