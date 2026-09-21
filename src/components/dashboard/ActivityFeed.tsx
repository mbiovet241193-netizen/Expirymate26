import React from 'react';
import type { ActivityLogEntry } from '../../types';
import type { Lang } from '../../i18n/translations';
import { activityLabel } from '../../utils/activityLabels';

function timeAgo(iso: string, lang: Lang): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return lang === 'ar' ? 'الآن' : 'just now';
  if (minutes < 60) return lang === 'ar' ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;
  if (hours < 24) return lang === 'ar' ? `منذ ${hours} ساعة` : `${hours}h ago`;
  if (days === 1) return lang === 'ar' ? 'أمس' : 'yesterday';
  return lang === 'ar' ? `منذ ${days} يوم` : `${days}d ago`;
}

export default function ActivityFeed({ entries, lang }: { entries: ActivityLogEntry[]; lang: Lang }) {
  if (entries.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <span className="empty-state-icon">🕐</span>
          {lang === 'ar' ? 'لا يوجد نشاط حتى الآن' : 'No activity yet'}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {entries.map((e, idx) => (
        <div
          key={e.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            padding: '10px 0',
            borderBottom: idx < entries.length - 1 ? '1px solid var(--outline)' : 'none'
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{activityLabel(e.actionKey, lang)}</div>
            {e.detail && <div style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', marginTop: 2 }}>{e.detail}</div>}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', whiteSpace: 'nowrap' }}>{timeAgo(e.timestamp, lang)}</div>
        </div>
      ))}
    </div>
  );
}
