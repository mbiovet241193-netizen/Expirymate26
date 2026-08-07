import React, { useMemo, useState } from 'react';
import Modal from '../common/Modal';
import type { Employee } from '../../types';
import type { Lang } from '../../i18n/translations';
import { type MessageOption, toWhatsAppNumber, dataUrlToFile, buildWhatsAppTemplates } from '../../utils/whatsappTemplates';

export default function WhatsAppMessageDialog({
  employee,
  companyName,
  lang,
  certificateImageDataUrl,
  certificateExpiryDate,
  onClose
}: {
  employee: Employee;
  companyName: string;
  lang: Lang;
  certificateImageDataUrl?: string;
  /** The expiry date of the actual certificate record being followed up on.
   *  Falls back to employee.healthCertExpiryDate when not provided (e.g. legacy callers). */
  certificateExpiryDate?: string;
  onClose: () => void;
}) {
  const [option, setOption] = useState<MessageOption | null>(null);
  const [customText, setCustomText] = useState('');
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const whatsappNumber = employee.mobilePhone ? toWhatsAppNumber(employee.mobilePhone) : null;
  const templates = useMemo(
    () => buildWhatsAppTemplates(employee, companyName, lang, certificateExpiryDate),
    [employee, companyName, lang, certificateExpiryDate]
  );

  const messageText = useMemo(() => {
    if (option === 'custom') return customText;
    if (option) return templates[option].build();
    return '';
  }, [option, customText, templates]);

  const openWhatsApp = () => {
    if (!whatsappNumber) return;
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  const attachImage = () => {
    if (!certificateImageDataUrl) return;
    try {
      const file = dataUrlToFile(certificateImageDataUrl, `${employee.code}-health-certificate.jpg`);
      const canShareFiles = (navigator as any).canShare && (navigator as any).canShare({ files: [file] });
      if (navigator.share && canShareFiles) {
        // Called synchronously right after the click (no awaited work before it),
        // so the browser still treats this as a direct user gesture.
        navigator.share({ text: messageText, files: [file] }).catch((err: any) => {
          if (err?.name === 'AbortError') return; // user closed the share sheet — not an error
          setShareNotice(
            lang === 'ar'
              ? 'متصفحك لا يدعم إرفاق الصور مباشرة داخل واتساب. هيتم فتح واتساب بالرسالة، ويمكنك إرفاق صورة الشهادة يدويًا.'
              : "Your browser doesn't support attaching images directly to WhatsApp. WhatsApp will open with the message — please attach the certificate image manually."
          );
          openWhatsApp();
        });
        return;
      }
    } catch {
      // fall through to the manual fallback below
    }
    setShareNotice(
      lang === 'ar'
        ? 'متصفحك لا يدعم إرفاق الصور مباشرة داخل واتساب. هيتم فتح واتساب بالرسالة، ويمكنك إرفاق صورة الشهادة يدويًا.'
        : "Your browser doesn't support attaching images directly to WhatsApp. WhatsApp will open with the message — please attach the certificate image manually."
    );
    openWhatsApp();
  };

  return (
    <Modal title={lang === 'ar' ? 'اختر رسالة' : 'Choose Message'} onClose={onClose}>
      {!whatsappNumber ? (
        <div style={{ color: 'var(--danger)' }}>
          {lang === 'ar' ? 'لا يوجد رقم موبايل مسجل لهذا الموظف.' : 'This employee has no mobile number on file.'}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {(Object.keys(templates) as Exclude<MessageOption, 'custom'>[]).map((key) => (
              <button
                key={key}
                className={`btn ${option === key ? 'btn-primary' : 'btn-outline'}`}
                disabled={!templates[key].enabled}
                onClick={() => setOption(key)}
                title={
                  !templates[key].enabled
                    ? lang === 'ar'
                      ? 'البيانات المطلوبة غير متوفرة لهذا الموظف'
                      : 'Required data is not available for this employee'
                    : undefined
                }
              >
                {templates[key].label}
              </button>
            ))}
            <button className={`btn ${option === 'custom' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setOption('custom')}>
              {lang === 'ar' ? 'رسالة مخصصة' : 'Custom Message'}
            </button>
          </div>

          {option && (
            <div className="form-field">
              <label>{lang === 'ar' ? 'معاينة الرسالة' : 'Message Preview'}</label>
              <textarea
                rows={8}
                value={messageText}
                readOnly={option !== 'custom'}
                onChange={(e) => option === 'custom' && setCustomText(e.target.value)}
              />
            </div>
          )}

          {shareNotice && (
            <div style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)', marginTop: 6 }}>{shareNotice}</div>
          )}

          {option && (
            <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={openWhatsApp} disabled={!messageText.trim()}>
                🟢 {lang === 'ar' ? 'فتح واتساب' : 'Open WhatsApp'}
              </button>
              {certificateImageDataUrl && (
                <button className="btn btn-outline" onClick={attachImage} disabled={!messageText.trim()}>
                  📎 {lang === 'ar' ? 'إرفاق صورة الشهادة الصحية' : 'Attach Health Certificate Image'}
                </button>
              )}
            </div>
          )}

          <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginTop: 12 }}>
            {lang === 'ar'
              ? 'هيتم فتح واتساب بالرسالة جاهزة، وأنت اللي هتضغط إرسال يدويًا داخل واتساب.'
              : 'WhatsApp will open with the message ready — you press Send manually inside WhatsApp.'}
          </div>
        </>
      )}
    </Modal>
  );
}
