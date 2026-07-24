import React from 'react';
import { drDejaGreeting, DR_DEJA_INTRO, DR_DEJA_ALL_CLEAR } from '../../assistant/messages';
import type { Lang } from '../../i18n/translations';

export interface DrDejaSummaryItem {
  label: string;
  count: number;
  color: string;
}

export default function DrDejaWelcomeCard({
  lang,
  items,
  doctorName
}: {
  lang: Lang;
  items: DrDejaSummaryItem[];
  doctorName?: string;
}) {
  const visibleItems = items.filter((i) => i.count > 0);
  const intro = DR_DEJA_INTRO[lang];
  const allClear = DR_DEJA_ALL_CLEAR[lang];

  return (
    <div className="card dr-deja-welcome-card">
      <div className="dr-deja-welcome-image">
        <img src="/assets/dr-deja.png" alt="Dr. Deja" loading="lazy" />
      </div>
      <div className="dr-deja-welcome-content">
        <div className="dr-deja-greeting">{drDejaGreeting(lang, doctorName)}</div>
        <div className="dr-deja-intro">{intro}</div>

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
