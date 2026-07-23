// Health Certificate status engine - much simpler than the shelf-life engine
// since a health certificate has only an expiry date (no half-life concept).
import type { CertificateStatus } from '../types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function computeCertificateStatus(expiryDate: string): { remainingDays: number; status: CertificateStatus } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = parseISODate(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const remainingDays = Math.round((expiry.getTime() - today.getTime()) / MS_PER_DAY);

  let status: CertificateStatus;
  if (remainingDays < 0) status = 'expired';
  else if (remainingDays <= 30) status = 'near_expiry';
  else status = 'valid';

  return { remainingDays, status };
}

export const CERTIFICATE_STATUS_LABELS: Record<CertificateStatus, { ar: string; en: string; color: string }> = {
  valid: { ar: 'سارية', en: 'Valid', color: 'var(--success)' },
  near_expiry: { ar: 'خلال 30 يومًا', en: '30 Days or Less', color: 'var(--warning)' },
  expired: { ar: 'منتهية', en: 'Expired', color: 'var(--danger)' }
};
