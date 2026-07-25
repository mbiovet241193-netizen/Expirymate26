import React from 'react';
import { drDejaGreeting, DR_DEJA_INTRO, DR_DEJA_ALL_CLEAR, type DoctorGender } from '../../assistant/messages';
import type { Lang } from '../../i18n/translations';

export interface DrDejaSummaryItem {
  label: string;
  count: number;
  color: string;
}

export interface DrDejaTotalItem {
  label: string;
  value: number;
  icon: string;
}

export default function DrDejaWelcomeCard({
  lang,
  gender = 'male',
  doctorName,
  items,
  totals
}: {
  lang: Lang;
  gender?: DoctorGender;
  doctorName?: string;
  items: DrDejaSummaryItem[];
  totals?: DrDejaTotalItem[];
}) {
  const visibleItems = items.filter((i) => i.count > 0);
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

        {visibleItems.length === 0 ? (
          <div className="dr-deja-all-clear">{allClear}</div>
        ) : (
          <ul className="dr-deja-summary-list">
            {visibleItems.map((item) => (
              <li key={item.label}>
                <span className="dr-deja-summary-dot" style={{ background: item.color }} />
                {item.label}: <strong>{item.count}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
