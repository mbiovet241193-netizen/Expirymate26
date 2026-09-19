import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Autocomplete from '../components/common/Autocomplete';
import DeepCleaningPlanManager from '../components/deepCleaning/DeepCleaningPlanManager';
import DeepCleaningExecutionManager from '../components/deepCleaning/DeepCleaningExecutionManager';

type DeepCleaningView = 'plan' | 'execution';

export default function DeepCleaning() {
  const { lang, settings } = useApp();
  const [siteFilter, setSiteFilter] = useState(settings.siteNames[0] ?? '');
  const [view, setView] = useState<DeepCleaningView | null>(null);

  if (view === 'plan') return <DeepCleaningPlanManager siteName={siteFilter} onBack={() => setView(null)} />;
  if (view === 'execution') return <DeepCleaningExecutionManager siteName={siteFilter} onBack={() => setView(null)} />;

  const cards: { view: DeepCleaningView; icon: string; label: string; desc: string }[] = [
    {
      view: 'plan',
      icon: '📅',
      label: lang === 'ar' ? 'الخطة الأسبوعية' : 'Weekly Plan',
      desc: lang === 'ar' ? 'بنود لكل يوم من أيام الأسبوع، ويمكن تكرار البند في أكثر من يوم' : 'Items for each weekday, an item can repeat on several days'
    },
    {
      view: 'execution',
      icon: '✅',
      label: lang === 'ar' ? 'المتابعة اليومية' : 'Daily Follow-up',
      desc: lang === 'ar' ? 'تنفيذ البنود يوميًا مع القائم بالتنفيذ' : 'Daily execution of items and who performed them'
    }
  ];

  return (
    <div>
      <div className="card" style={{ maxWidth: 340, marginBottom: 18 }}>
        <div className="form-field">
          <label>{lang === 'ar' ? 'الموقع' : 'Site'}</label>
          <Autocomplete
            value={siteFilter}
            onChange={setSiteFilter}
            options={settings.siteNames.map((n) => ({ value: n, label: n }))}
            placeholder={lang === 'ar' ? '— اختر الموقع —' : '— Select Site —'}
          />
        </div>
      </div>

      <div className="quick-nav-grid">
        {cards.map((c) => (
          <div key={c.view} className="quick-nav-card" onClick={() => siteFilter && setView(c.view)} style={{ opacity: siteFilter ? 1 : 0.5 }}>
            <div className="quick-nav-icon">{c.icon}</div>
            {c.label}
            <div style={{ fontSize: '0.76rem', color: 'var(--on-surface-variant)', marginTop: 4 }}>{c.desc}</div>
          </div>
        ))}
      </div>
      {!siteFilter && (
        <div style={{ marginTop: 14, fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
          {lang === 'ar' ? 'اختر موقعًا أولًا للمتابعة.' : 'Select a site first to continue.'}
        </div>
      )}
    </div>
  );
}
