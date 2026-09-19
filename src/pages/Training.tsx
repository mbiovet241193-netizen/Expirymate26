import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Autocomplete from '../components/common/Autocomplete';
import TrainingPlanManager from '../components/training/TrainingPlanManager';
import TrainingRecordsManager from '../components/training/TrainingRecordsManager';

type TrainingView = 'plan' | 'records';

export default function Training() {
  const { lang, settings } = useApp();
  const [siteFilter, setSiteFilter] = useState(settings.siteNames[0] ?? '');
  const [view, setView] = useState<TrainingView | null>(null);

  if (view === 'plan') return <TrainingPlanManager siteName={siteFilter} onBack={() => setView(null)} />;
  if (view === 'records') return <TrainingRecordsManager siteName={siteFilter} onBack={() => setView(null)} />;

  const cards: { view: TrainingView; icon: string; label: string; desc: string }[] = [
    {
      view: 'plan',
      icon: '📋',
      label: lang === 'ar' ? 'الخطة السنوية للتدريب' : 'Annual Training Plan',
      desc: lang === 'ar' ? 'بنود التدريب لكل شهر مع الفئة المستهدفة — تم / لم يتم' : 'Training topics per month with target audience — done / not done'
    },
    {
      view: 'records',
      icon: '🎓',
      label: lang === 'ar' ? 'سجلات التدريب' : 'Training Records',
      desc: lang === 'ar' ? 'مخطط له أو غير مخطط، عدد المتدربين، والقائم بالتدريب' : 'Planned or unplanned, trainee count, and the trainer'
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
