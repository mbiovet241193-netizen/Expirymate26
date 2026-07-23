import React from 'react';
import type { CertificateStatus } from '../../types';
import { CERTIFICATE_STATUS_LABELS } from '../../engine/certificateEngine';
import { useApp } from '../../context/AppContext';

const DOTS: Record<CertificateStatus, string> = {
  valid: '🟢',
  near_expiry: '🟡',
  expired: '🔴'
};

export default function CertificateStatusBadge({ status }: { status: CertificateStatus }) {
  const { lang } = useApp();
  const meta = CERTIFICATE_STATUS_LABELS[status];
  return (
    <span className="badge" style={{ background: meta.color }}>
      <span>{DOTS[status]}</span>
      {lang === 'ar' ? meta.ar : meta.en}
    </span>
  );
}
