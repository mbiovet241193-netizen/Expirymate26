import React, { useMemo, useState } from 'react';
import Modal from '../common/Modal';
import type { Employee } from '../../types';
import type { Lang } from '../../i18n/translations';

type MessageOption = 'expiring' | 'expired' | 'insurance' | 'custom';

function toWhatsAppNumber(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.startsWith('20')) return digits; // already has Egypt country code
  if (digits.startsWith('0')) return `20${digits.slice(1)}`; // local format 0XXXXXXXXXX
  return digits; // assume already includes a country code
}

function formatDate(iso: string, lang: Lang): string {
  try {
    return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB');
  } catch {
    return iso;
  }
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}

export default function WhatsAppMessageDialog({
  employee,
  companyName,
  lang,
  certificateImageDataUrl,
  onClose
}: {
  employee: Employee;
  companyName: string;
  lang: Lang;
  certificateImageDataUrl?: string;
  onClose: () => void;
}) {
  const [option, setOption] = useState<MessageOption | null>(null);
  const [customText, setCustomText] = useState('');
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const whatsappNumber = employee.mobilePhone ? toWhatsAppNumber(employee.mobilePhone) : null;
  const hasCert = !!employee.healthCertExpiryDate;
  const hasInsurance = !!employee.insuranceNumber;

  const templates: Record<Exclude<MessageOption, 'custom'>, { label: string; enabled: boolean; build: () => string }> = {
    expiring: {
      label: lang === 'ar' ? 'شهادة صحية على وشك الانتهاء' : 'Health Certificate Expiring Soon',
      enabled: hasCert,
      build: () =>
        `السلام عليكم أستاذ/ ${employee.name}.\n\nنود تذكيركم بأن شهادتكم الصحية ستنتهي بتاريخ:\n${formatDate(
          employee.healthCertExpiryDate!,
          lang
        )}\n\nيرجى سرعة تجديد الشهادة الصحية قبل موعد انتهائها لضمان استمرار العمل داخل المنشآت الغذائية.\n\nشكراً لتعاونكم.\n\nتحياتنا،\n${companyName}\n\nتم إنشاء هذه الرسالة بواسطة ExpiryMate.`
    },
    expired: {
      label: lang === 'ar' ? 'شهادة صحية منتهية' : 'Health Certificate Expired',
      enabled: hasCert,
      build: () =>
        `السلام عليكم أستاذ/ ${employee.name}.\n\nنحيطكم علماً بانتهاء صلاحية شهادتكم الصحية بتاريخ:\n${formatDate(
          employee.healthCertExpiryDate!,
          lang
        )}\n\nولا يجوز العمل داخل المنشآت الغذائية إلا بعد تجديد الشهادة الصحية.\n\nيرجى سرعة اتخاذ الإجراءات اللازمة.\n\nشكراً لتعاونكم.\n\nتحياتنا،\n${companyName}\n\nتم إنشاء هذه الرسالة بواسطة ExpiryMate.`
    },
    insurance: {
      label: lang === 'ar' ? 'رقم التأمين الطبي' : 'Medical Insurance Card Number',
      enabled: hasInsurance,
      build: () =>
        `السلام عليكم أستاذ/ ${employee.name}.\n\nبناءً على طلبكم، نرسل لكم رقم كارت التأمين الطبي الخاص بكم:\n${employee.insuranceNumber}\n\nمع خالص تمنياتنا لكم بدوام الصحة والعافية.\n\nتحياتنا،\n${companyName}\n\nتم إنشاء هذه الرسالة بواسطة ExpiryMate.`
    }
  };

  const messageText = useMemo(() => {
    if (option === 'custom') return customText;
    if (option) return templates[option].build();
    return '';
  }, [option, customText, employee, companyName, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const openWhatsApp = () => {
    if (!whatsappNumber) return;
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  const attachImage = async () => {
    if (!certificateImageDataUrl) return;
    try {
      const file = await dataUrlToFile(certificateImageDataUrl, `${employee.code}-health-certificate.jpg`);
      const canShareFiles = (navigator as any).canShare && (navigator as any).canShare({ files: [file] });
      if (navigator.share && canShareFiles) {
        await navigator.share({ text: messageText, files: [file] });
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
