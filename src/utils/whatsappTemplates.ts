// Shared WhatsApp message-building logic for the Health Certificates module.
// Used by both WhatsAppMessageDialog (single employee) and BulkWhatsAppDialog
// (multiple selected employees) so the message wording and phone-number
// normalization stay identical everywhere in the app.
import type { Employee } from '../types';
import type { Lang } from '../i18n/translations';

export type MessageOption = 'expiring' | 'expired' | 'insurance' | 'custom';

export function toWhatsAppNumber(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.startsWith('20')) return digits; // already has Egypt country code
  if (digits.startsWith('0')) return `20${digits.slice(1)}`; // local format 0XXXXXXXXXX
  return digits; // assume already includes a country code
}

export function formatWhatsAppDate(iso: string, lang: Lang): string {
  try {
    return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB');
  } catch {
    return iso;
  }
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

export interface WhatsAppTemplate {
  label: string;
  enabled: boolean;
  build: () => string;
}

/**
 * Builds the standard set of WhatsApp message templates for one employee.
 * `certificateExpiryDate` lets callers pass a specific certificate record's
 * expiry date (e.g. from a site-specific HealthCertificate); it falls back to
 * the employee's own `healthCertExpiryDate` field when not provided.
 */
export function buildWhatsAppTemplates(
  employee: Employee,
  companyName: string,
  lang: Lang,
  certificateExpiryDate?: string
): Record<Exclude<MessageOption, 'custom'>, WhatsAppTemplate> {
  const effectiveExpiryDate = certificateExpiryDate ?? employee.healthCertExpiryDate;
  const hasCert = !!effectiveExpiryDate;
  const hasInsurance = !!employee.insuranceNumber;

  return {
    expiring: {
      label: lang === 'ar' ? 'شهادة صحية على وشك الانتهاء' : 'Health Certificate Expiring Soon',
      enabled: hasCert,
      build: () =>
        `السلام عليكم أستاذ/ ${employee.name}.\n\nنود تذكيركم بأن شهادتكم الصحية ستنتهي بتاريخ:\n${formatWhatsAppDate(
          effectiveExpiryDate!,
          lang
        )}\n\nيرجى سرعة تجديد الشهادة الصحية قبل موعد انتهائها لضمان استمرار العمل داخل المنشآت الغذائية.\n\nشكراً لتعاونكم.\n\nتحياتنا،\n${companyName}\n\nتم إنشاء هذه الرسالة بواسطة QualityMate.`
    },
    expired: {
      label: lang === 'ar' ? 'شهادة صحية منتهية' : 'Health Certificate Expired',
      enabled: hasCert,
      build: () =>
        `السلام عليكم أستاذ/ ${employee.name}.\n\nنحيطكم علماً بانتهاء صلاحية شهادتكم الصحية بتاريخ:\n${formatWhatsAppDate(
          effectiveExpiryDate!,
          lang
        )}\n\nولا يجوز العمل داخل المنشآت الغذائية إلا بعد تجديد الشهادة الصحية.\n\nيرجى سرعة اتخاذ الإجراءات اللازمة.\n\nشكراً لتعاونكم.\n\nتحياتنا،\n${companyName}\n\nتم إنشاء هذه الرسالة بواسطة QualityMate.`
    },
    insurance: {
      label: lang === 'ar' ? 'رقم التأمين الطبي' : 'Medical Insurance Card Number',
      enabled: hasInsurance,
      build: () =>
        `السلام عليكم أستاذ/ ${employee.name}.\n\nبناءً على طلبكم، نرسل لكم رقم كارت التأمين الطبي الخاص بكم:\n${employee.insuranceNumber}\n\nمع خالص تمنياتنا لكم بدوام الصحة والعافية.\n\nتحياتنا،\n${companyName}\n\nتم إنشاء هذه الرسالة بواسطة QualityMate.`
    }
  };
}
