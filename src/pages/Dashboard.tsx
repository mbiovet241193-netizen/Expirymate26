import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter, type Route } from '../router/Router';
import { ActivityLogRepo } from '../db/repositories';
import { computeDashboardStats, type DashboardStats } from '../engine/dashboardStats';
import type { ActivityLogEntry } from '../types';
import DrDejaWelcomeCard, { type DrDejaSummaryItem, type DrDejaTotalItem } from '../components/assistant/DrDejaWelcomeCard';
import HygieneTriangle from '../components/dashboard/HygieneTriangle';
import ActivityFeed from '../components/dashboard/ActivityFeed';

export default function Dashboard() {
  const { t, lang, settings } = useApp();
  const { navigate } = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);

  useEffect(() => {
    (async () => {
      const [computedStats, recentActivity] = await Promise.all([computeDashboardStats(), ActivityLogRepo.recent(4)]);
      setStats(computedStats);
      setActivity(recentActivity);
    })();
  }, []);

  // Items that sit outside the hygiene triangle, as supporting functions ("More").
  const moreItems: { route: Route; icon: string; label: string }[] = [
    { route: 'documentReminders', icon: '🔔', label: lang === 'ar' ? 'منبه المستندات' : 'Document Reminder' },
    { route: 'shiftNotes', icon: '📝', label: lang === 'ar' ? 'ملاحظات الشفت' : 'Shift Notes' },
    { route: 'reports', icon: '📊', label: t('reports') },
    { route: 'reportsArchive', icon: '🗄️', label: t('reportsArchive') },
    { route: 'search', icon: '🔍', label: t('search') },
    { route: 'settings', icon: '⚙️', label: t('settings') },
    { route: 'about', icon: 'ℹ️', label: t('about') }
  ];

  if (!stats) return null;

  const summaryItems: DrDejaSummaryItem[] = [
    { label: t('expiredProducts'), count: stats.expired, color: 'var(--danger)' },
    { label: t('within30Days'), count: stats.within30, color: 'var(--info)' },
    { label: t('expiringSoon'), count: stats.expiringSoon, color: '#EF6C00' },
    { label: t('afterHalf'), count: stats.afterHalf, color: 'var(--warning)' },
    { label: t('nonConformingCount'), count: stats.nonConforming, color: 'var(--danger)' },
    { label: lang === 'ar' ? 'شهادات صحية منتهية' : 'Expired Health Certificates', count: stats.expiredCerts, color: 'var(--danger)' },
    {
      label: lang === 'ar' ? 'شهادات صحية خلال 30 يومًا' : 'Health Certificates Expiring Within 30 Days',
      count: stats.expiringCerts,
      color: 'var(--info)'
    },
    { label: lang === 'ar' ? 'سجلات استلام اليوم' : "Today's Receiving Records", count: stats.receivingToday, color: 'var(--primary)' }
  ];

  const totals: DrDejaTotalItem[] = [
    { label: t('totalProducts'), value: stats.totalProducts, icon: '📦' },
    { label: t('totalBatches'), value: stats.totalBatches, icon: '⏳' },
    { label: t('beforeHalf'), value: stats.beforeHalf, icon: '✅' }
  ];

  return (
    <div>
      <DrDejaWelcomeCard lang={lang} gender={settings.doctorGender} doctorName={settings.doctorName} items={summaryItems} totals={totals} />

      <h2 className="section-title">
        <span aria-hidden="true">🔺</span>
        {lang === 'ar' ? 'محاور سلامة الغذاء' : 'Food Safety Pillars'}
      </h2>
      <HygieneTriangle lang={lang} onNavigate={navigate} />

      <h2 className="section-title">
        <span aria-hidden="true">⚡</span>
        {lang === 'ar' ? 'المزيد' : 'More'}
      </h2>
      <div className="quick-nav-grid">
        {moreItems.map((item) => (
          <div key={item.route} className="quick-nav-card" onClick={() => navigate(item.route)}>
            <div className="quick-nav-icon">{item.icon}</div>
            {item.label}
          </div>
        ))}
      </div>

      <h2 className="section-title">
        <span aria-hidden="true">🕐</span>
        {lang === 'ar' ? 'لوحة النشاط' : 'Activity Feed'}
      </h2>
      <ActivityFeed entries={activity} lang={lang} />
    </div>
  );
}
