import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter, type Route } from '../router/Router';
import {
  ActivityLogRepo,
  BatchRepo,
  ProductRepo,
  HealthCertificateRepo,
  DocumentReminderRepo,
  NonConformingRepo,
  MaintenancePlanRepo,
  MaintenanceRequestRepo,
  TrainingPlanRepo,
  HygieneViolationRepo,
  DeepCleaningPlanRepo,
  DeepCleaningExecutionRepo
} from '../db/repositories';
import { computeDashboardStats, type DashboardStats } from '../engine/dashboardStats';
import { buildAttentionList, buildWeeklyComparison, type AttentionItem, type WeeklyMetric } from '../engine/insights';
import type { ActivityLogEntry } from '../types';
import DrDejaWelcomeCard, { type DrDejaTotalItem } from '../components/assistant/DrDejaWelcomeCard';
import HygieneTriangle from '../components/dashboard/HygieneTriangle';
import ActivityFeed from '../components/dashboard/ActivityFeed';

export default function Dashboard() {
  const { t, lang, settings } = useApp();
  const { navigate } = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyMetric[]>([]);

  useEffect(() => {
    (async () => {
      const [
        computedStats,
        recentActivity,
        batches,
        products,
        certificates,
        documents,
        nonConforming,
        maintenancePlan,
        maintenanceRequests,
        trainingPlan,
        hygieneViolations,
        deepCleaningPlan,
        deepCleaningExecutions
      ] = await Promise.all([
        computeDashboardStats(),
        ActivityLogRepo.recent(4),
        BatchRepo.all(),
        ProductRepo.all(),
        HealthCertificateRepo.all(),
        DocumentReminderRepo.all(),
        NonConformingRepo.all(),
        MaintenancePlanRepo.all(),
        MaintenanceRequestRepo.all(),
        TrainingPlanRepo.all(),
        HygieneViolationRepo.all(),
        DeepCleaningPlanRepo.all(),
        DeepCleaningExecutionRepo.all()
      ]);

      setStats(computedStats);
      setActivity(recentActivity);
      setAttentionItems(
        buildAttentionList({ batches, products, certificates, documents, nonConforming, maintenancePlan, maintenanceRequests, trainingPlan })
      );
      setWeeklyMetrics(buildWeeklyComparison({ hygieneViolations, deepCleaningPlan, deepCleaningExecutions }));
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

  const totals: DrDejaTotalItem[] = [
    { label: t('totalProducts'), value: stats.totalProducts, icon: '📦' },
    { label: t('totalBatches'), value: stats.totalBatches, icon: '⏳' },
    { label: t('beforeHalf'), value: stats.beforeHalf, icon: '✅' }
  ];

  return (
    <div>
      <DrDejaWelcomeCard
        lang={lang}
        gender={settings.doctorGender}
        doctorName={settings.doctorName}
        attentionItems={attentionItems}
        weeklyMetrics={weeklyMetrics}
        totals={totals}
        onNavigate={navigate}
      />

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
