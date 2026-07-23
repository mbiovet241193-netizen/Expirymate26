import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter, type Route } from '../router/Router';
import { BatchRepo, ProductRepo, NonConformingRepo, ReportRepo, EmployeeRepo, HealthCertificateRepo, ReceivingRepo } from '../db/repositories';
import { computeBatchStatus } from '../engine/shelfLifeEngine';
import { computeCertificateStatus } from '../engine/certificateEngine';
import type { Batch, SavedReport } from '../types';
import DrDejaWelcomeCard, { type DrDejaSummaryItem } from '../components/assistant/DrDejaWelcomeCard';

interface Stats {
  totalProducts: number;
  totalBatches: number;
  expired: number;
  within30: number;
  afterHalf: number;
  beforeHalf: number;
  nonConforming: number;
  expiredCerts: number;
  expiringCerts: number;
  receivingToday: number;
}

export default function Dashboard() {
  const { t, lang } = useApp();
  const { navigate } = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<SavedReport[]>([]);

  useEffect(() => {
    (async () => {
      const [products, batches, nc, savedReports, employees, certificates, receivingSessions] = await Promise.all([
        ProductRepo.all(),
        BatchRepo.all(),
        NonConformingRepo.all(),
        ReportRepo.all(),
        EmployeeRepo.all(),
        HealthCertificateRepo.all(),
        ReceivingRepo.all()
      ]);

      let expired = 0;
      let within30 = 0;
      let afterHalf = 0;
      let beforeHalf = 0;

      batches.forEach((b: Batch) => {
        const { status } = computeBatchStatus(b.productionDate, b.expiryDate, b.halfLifeDate);
        if (status === 'expired') expired++;
        else if (status === 'near_expiry') within30++;
        else if (status === 'after_half') afterHalf++;
        else beforeHalf++;
      });

      const employeeIds = new Set(employees.map((e) => e.id));
      let expiredCerts = 0;
      let expiringCerts = 0;
      certificates.forEach((c) => {
        if (!employeeIds.has(c.employeeId)) return;
        const { status } = computeCertificateStatus(c.expiryDate);
        if (status === 'expired') expiredCerts++;
        else if (status === 'near_expiry') expiringCerts++;
      });

      const todayStr = new Date().toISOString().slice(0, 10);
      const receivingToday = receivingSessions.filter((s) => s.receivingDate === todayStr).length;

      setStats({
        totalProducts: products.length,
        totalBatches: batches.length,
        expired,
        within30,
        afterHalf,
        beforeHalf,
        nonConforming: nc.length,
        expiredCerts,
        expiringCerts,
        receivingToday
      });

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
    { label: t('afterHalf'), count: stats.afterHalf, color: 'var(--warning)' },
    { label: lang === 'ar' ? 'شهادات صحية منتهية' : 'Expired Health Certificates', count: stats.expiredCerts, color: 'var(--danger)' },
    {
      label: lang === 'ar' ? 'شهادات صحية خلال 30 يومًا' : 'Health Certificates Expiring Within 30 Days',
      count: stats.expiringCerts,
      color: 'var(--info)'
    },
    { label: lang === 'ar' ? 'سجلات استلام اليوم' : "Today's Receiving Records", count: stats.receivingToday, color: 'var(--primary)' }
  ];

  return (
    <div>
      <DrDejaWelcomeCard lang={lang} items={summaryItems} />

      <div className="stat-grid">
        <StatCard label={t('totalProducts')} value={stats.totalProducts} color="var(--primary)" icon="📦" />
        <StatCard label={t('totalBatches')} value={stats.totalBatches} color="var(--info)" icon="⏳" />
        <StatCard label={t('expiredProducts')} value={stats.expired} color="var(--danger)" icon="⛔" />
        <StatCard label={t('within30Days')} value={stats.within30} color="var(--info)" icon="⏰" />
        <StatCard label={t('afterHalf')} value={stats.afterHalf} color="var(--warning)" icon="⚠️" />
        <StatCard label={t('beforeHalf')} value={stats.beforeHalf} color="var(--primary)" icon="✅" />
        <StatCard label={t('nonConformingCount')} value={stats.nonConforming} color="var(--danger)" icon="🚫" />
        <StatCard
          label={lang === 'ar' ? 'شهادات صحية منتهية' : 'Expired Health Certificates'}
          value={stats.expiredCerts}
          color="var(--danger)"
          icon="🩺"
        />
        <StatCard
          label={lang === 'ar' ? 'شهادات صحية خلال 30 يومًا' : 'Health Certificates Within 30 Days'}
          value={stats.expiringCerts}
          color="var(--info)"
          icon="🩺"
        />
      </div>

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

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div className="stat-card" style={{ borderInlineStartColor: color, ['--stat-color' as string]: color }}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-body">
        <div className="stat-value" style={{ color }}>
          {value}
        </div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}
