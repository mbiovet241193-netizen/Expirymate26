import React from 'react';
import type { ProductStatus } from '../../types';
import { STATUS_COLORS, STATUS_LABELS_AR, STATUS_LABELS_EN, nearExpiryLabel } from '../../engine/shelfLifeEngine';
import { useApp } from '../../context/AppContext';

const DOTS: Record<ProductStatus, string> = {
  within_shelf_life: '🟢',
  after_half: '🟡',
  near_expiry: '🔵',
  expired: '🔴'
};

/**
 * `shortRule` should be passed for `near_expiry` batches to pick the correct wording:
 * true => "Expiring Soon" (shelf life <= 3 months), false/omitted => "Will Expire Within 30 Days".
 */
export default function StatusBadge({ status, shortRule = false }: { status: ProductStatus; shortRule?: boolean }) {
  const { lang } = useApp();
  const label =
    status === 'near_expiry' ? nearExpiryLabel(shortRule, lang) : lang === 'ar' ? STATUS_LABELS_AR[status] : STATUS_LABELS_EN[status];
  return (
    <span className="badge" style={{ background: STATUS_COLORS[status] }}>
      <span>{DOTS[status]}</span>
      {label}
    </span>
  );
}
