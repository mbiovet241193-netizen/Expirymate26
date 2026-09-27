import React from 'react';
import { drDejaGreeting, DR_DEJA_INTRO, DR_DEJA_ALL_CLEAR, type DoctorGender } from '../../assistant/messages';
import type { Lang } from '../../i18n/translations';
import type { AttentionItem, WeeklyMetric } from '../../engine/insights';
import type { Route } from '../../router/Router';

export interface DrDejaTotalItem {
  label: string;
  value: number;
  icon: string;
}

const TIER_COLOR: Record<1 | 2 | 3, string> = { 1: 'var(--danger)', 2: '#EF6C00', 3: 'var(--warning)' };

export default function DrDejaWelcomeCard({
  lang,
  gender = 'male',
  doctorName,
  attentionItems,
  weeklyMetrics,
  totals,
  onNavigate
}: {
  lang: Lang;
  gender?: DoctorGender;
  doctorName?: string;
  attentionItems: AttentionItem[];
  weeklyMetrics: WeeklyMetric[];
  totals?: DrDejaTotalItem[];
  onNavigate: (route: Route) => void;
}) {
  const intro = DR_DEJA_INTRO[lang];
  const allClear = lang === 'ar' ? DR_DEJA_ALL_CLEAR.ar[gender] : DR_DEJA_ALL_CLEAR.en;

  return (
    <div className="card dr-deja-welcome-card">
      <div className="dr-deja-welcome-image">
        <img src="/assets/dr-deja.png" alt="Dr. Deja" loading="lazy" />
      </div>
      <div className="dr-deja-welcome-content">
        <div className="dr-deja-greeting">{drDejaGreeting(lang, gender, doctorName)}</div>
        <div className="dr-deja-intro">{intro}</div>

        {totals && totals.length > 0 && (
          <div className="dr-deja-totals">
            {totals.map((tot) => (
              <span className="dr-deja-total-chip" key={tot.label}>
                <span className="dr-deja-total-icon" aria-hidden="true">
                  {tot.icon}
                </span>
                {tot.label}: {tot.value}
              </span>
            ))}
          </div>
        )}

        {attentionItems.length === 0 ? (
          <div className="dr-deja-all-clear">{allClear}</div>
        ) : (
          <ul className="dr-deja-summary-list">
            {attentionItems.map((item) => (
              <li key={item.id} className="dr-deja-attention-item" onClick={() => onNavigate(item.route)}>
                <span className="dr-deja-summary-dot" style={{ background: TIER_COLOR[item.tier] }} />
                <span aria-hidden="true">{item.icon}</span> {lang === 'ar' ? item.textAr : item.textEn}
              </li>
            ))}
          </ul>
        )}

        {weeklyMetrics.length > 0 && (
          <div className="dr-deja-weekly-metrics">
            {weeklyMetrics.map((m) => {
              const improved = m.higherIsBetter ? m.current >= m.previous : m.current <= m.previous;
              const arrow = m.current === m.previous ? '' : m.current > m.previous ? '↑' : '↓';
              return (
                <div key={m.labelAr} className="dr-deja-weekly-metric">
                  <span>{lang === 'ar' ? m.labelAr : m.labelEn}</span>
                  <span style={{ color: improved ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                    {m.current}
                    {m.unit ?? ''} {arrow} {lang === 'ar' ? 'كانت' : 'was'} {m.previous}
                    {m.unit ?? ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
