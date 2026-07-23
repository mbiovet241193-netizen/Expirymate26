import React from 'react';
import type { ProductStatus } from '../../types';
import { STATUS_COLORS, STATUS_LABELS_AR, STATUS_LABELS_EN } from '../../engine/shelfLifeEngine';
import { useApp } from '../../context/AppContext';

const DOTS: Record<ProductStatus, string> = {
  before_half: '🟢',
  after_half: '🟡',
  near_expiry: '🔵',
  expired: '🔴'
};

export default function StatusBadge({ status }: { status: ProductStatus }) {
  const { lang } = useApp();
  const label = lang === 'ar' ? STATUS_LABELS_AR[status] : STATUS_LABELS_EN[status];
  return (
    <span className="badge" style={{ background: STATUS_COLORS[status] }}>
      <span>{DOTS[status]}</span>
      {label}
    </span>
  );
}
