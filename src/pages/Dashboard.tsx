import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter, type Route } from '../router/Router';
import { ReportRepo } from '../db/repositories';
import { computeDashboardStats, type DashboardStats } from '../engine/dashboardStats';
import type { SavedReport } from '../types';
import DrDejaWelcomeCard, { type DrDejaSummaryItem, type DrDejaTotalItem } from '../components/assistant/DrDejaWelcomeCard';

export default function Dashboard() {
  const { t, lang, settings } = useApp();
  const { navigate } = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reports, setReports] = useState<SavedReport[]>([]);

  useEffect(() => {
    (async () => {
      const [computedStats, savedReports] = await Promise.all([computeDashboardStats(), ReportRepo.all()]);
      setStats(computedStats);

      setReports(
        savedReports
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
      );
    })();
  }, []);

  const quickNav: { route: Route; icon: string; label: string }[] = [
    { route: 'categories', icon: '🗂️', label: t('categories') },
    { route: 'products', icon: '📦', label: t('products') },
    { route: 'batches', icon: '⏳', label: t('batches') },
    { route: 'calculator', icon: '🧮', label: t('calculator') },
    { route: 'receiving', icon: '🚚', label: t('receiving') },
    { route: 'nonConforming', icon: '⚠️', label: t('nonConforming') },
    { route: 'healthCertificates', icon: '🩺', label: t('healthCertificates') },
    { route: 'maintenance', icon: '🔧', label: lang === 'ar' ? 'الصيانة' : 'Maintenance' },
    { route: 'shiftNotes', icon: '📝', label: lang === 'ar' ? 'ملاحظات الشفت' : 'Shift Notes' },
    { route: 'pestControl', icon: '🐜', label: lang === 'ar' ? 'المكافحة' : 'Pest Control' },
    { route: 'training', icon: '🎓', label: lang === 'ar' ? 'التدريب' : 'Training' },
    { route: 'personalHygiene', icon: '🧼', label: lang === 'ar' ? 'النظافة الشخصية' : 'Personal Hygiene' },
    { route: 'deepCleaning', icon: '🧽', label: lang === 'ar' ? 'النظافة العميقة' : 'Deep Cleaning' },
    { route: 'search', icon: '🔍', label: t('search') },
    { route: 'reports', icon: '📊', label: t('reports') },
    { route: 'reportsArchive', icon: '🗄️', label: t('reportsArchive') },
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
        <span aria-hidden="true">⚡</span>
        {t('quickNav')}
      </h2>
      <div className="quick-nav-grid">
        {quickNav.map((item) => (
          <div key={item.route} className="quick-nav-card" onClick={() => navigate(item.route)}>
            <div className="quick-nav-icon">{item.icon}</div>
            {item.label}
          </div>
        ))}
      </div>

      <h2 className="section-title">
        <span aria-hidden="true">🗒️</span>
        {t('latestReports')}
      </h2>
      {reports.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon">📄</span>
            {t('noData')}
          </div>
        </div>
      ) : (
        <>
          <div className="card desktop-only-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{lang === 'ar' ? 'العنوان' : 'Title'}</th>
                  <th>{lang === 'ar' ? 'النوع' : 'Type'}</th>
                  <th>{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td>{r.title}</td>
                    <td>{r.type}</td>
                    <td>{new Date(r.createdAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-cards">
            {reports.map((r) => (
              <div className="record-card" key={r.id}>
                <div className="record-card-header">
                  <div className="record-card-title">{r.title}</div>
                </div>
                <div className="record-card-row">
                  <span>{lang === 'ar' ? 'النوع' : 'Type'}</span>
                  <span>{r.type}</span>
                </div>
                <div className="record-card-row">
                  <span>{lang === 'ar' ? 'التاريخ' : 'Date'}</span>
                  <span>{new Date(r.createdAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


