// Document Reminder status engine - a document has only start/end dates
// (no half-life concept), same simple 30-day threshold as health certificates.
import type { DocumentStatus } from '../types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function computeDocumentStatus(endDate: string): { remainingDays: number; status: DocumentStatus } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = parseISODate(endDate);
  end.setHours(0, 0, 0, 0);

  const remainingDays = Math.round((end.getTime() - today.getTime()) / MS_PER_DAY);

  let status: DocumentStatus;
  if (remainingDays < 0) status = 'expired';
  else if (remainingDays <= 30) status = 'near_expiry';
  else status = 'valid';

  return { remainingDays, status };
}

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, { ar: string; en: string; color: string }> = {
  valid: { ar: 'ساري', en: 'Valid', color: 'var(--success)' },
  near_expiry: { ar: 'قرب الانتهاء', en: 'Near Expiry', color: 'var(--warning)' },
  expired: { ar: 'منتهي', en: 'Expired', color: 'var(--danger)' }
};
