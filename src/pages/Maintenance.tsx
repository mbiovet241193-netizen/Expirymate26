import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Autocomplete from '../components/common/Autocomplete';
import MaintenancePlanManager from '../components/maintenance/MaintenancePlanManager';
import MaintenanceVisitsManager from '../components/maintenance/MaintenanceVisitsManager';
import MaintenanceRequestsManager from '../components/maintenance/MaintenanceRequestsManager';

type MaintenanceView = 'plan' | 'visits' | 'requests';

export default function Maintenance() {
  const { lang, settings } = useApp();
  const [siteFilter, setSiteFilter] = useState(settings.siteNames[0] ?? '');
  const [view, setView] = useState<MaintenanceView | null>(null);

  if (view === 'plan') return <MaintenancePlanManager siteName={siteFilter} onBack={() => setView(null)} />;
  if (view === 'visits') return <MaintenanceVisitsManager siteName={siteFilter} onBack={() => setView(null)} />;
  if (view === 'requests') return <MaintenanceRequestsManager siteName={siteFilter} onBack={() => setView(null)} />;

  const cards: { view: MaintenanceView; icon: string; label: string; desc: string }[] = [
    {
      view: 'plan',
      icon: '📋',
      label: lang === 'ar' ? 'خطة الصيانة الوقائية' : 'Preventive Maintenance Plan',
      desc: lang === 'ar' ? 'عناصر الخطة السنوية لكل شهر — تم / لم يتم' : 'Annual plan elements per month — done / not done'
    },
    {
      view: 'visits',
      icon: '🧰',
      label: lang === 'ar' ? 'زيارات الصيانة' : 'Maintenance Visits',
      desc: lang === 'ar' ? 'تسجيل الزيارة، الفني، المشرف، وما تم إنجازه' : 'Log the visit, technician, supervisor, and what was completed'
    },
    {
      view: 'requests',
      icon: '🛠️',
      label: lang === 'ar' ? 'طلبات الصيانة (العلاجية)' : 'Maintenance Requests (Corrective)',
      desc: lang === 'ar' ? 'طلبات معلقة أو تم إغلاقها' : 'Pending requests or closed ones'
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
