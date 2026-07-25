// Notification engine - runs a lightweight, one-shot check (never continuous
// polling). Triggered on app open / tab becoming visible, and best-effort via
// Periodic Background Sync where the browser supports it (see sw.js).
import { BatchRepo, ProductRepo, EmployeeRepo, HealthCertificateRepo, NotificationLogRepo } from '../db/repositories';
import { computeBatchStatus } from '../engine/shelfLifeEngine';
import { computeCertificateStatus } from '../engine/certificateEngine';
import { notificationLine, DAILY_REMINDER_LINE, getDayPeriod, DR_DEJA_SIGNATURE } from '../assistant/messages';
import type { AppSettings } from '../types';
import type { Lang } from '../i18n/translations';

const NOTIFICATION_INTROS_BY_PERIOD: Record<string, { ar: string; en: string }> = {
  morning: { ar: 'صباح الخير.', en: 'Good morning.' },
  afternoon: { ar: 'مرحباً.', en: 'Hello.' },
  evening: { ar: 'مساء الخير.', en: 'Good evening.' }
};

async function showNotification(title: string, body: string, route: string, params?: Record<string, string>) {
  if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { route, params: params ?? {} }
    });
  } catch {
    // Silently ignore - notifications are a non-critical enhancement.
  }
}

/**
 * Runs the one-shot daily check. Safe to call often (e.g. on every app open
 * or tab-visible event) - each category is deduped so it only ever sends once
 * per calendar day regardless of how many times this function runs.
 */
export async function runNotificationCheck(settings: AppSettings): Promise<void> {
  const n = settings.notifications;
  if (!n || !n.enabled) return;
  if (Notification.permission !== 'granted') return;

  const lang: Lang = settings.language;
  const period = getDayPeriod();
  const intro = NOTIFICATION_INTROS_BY_PERIOD[period][lang];

  // --- Product expiry categories ---
  if (n.categories.expiredProducts || n.categories.halfLifeProducts || n.categories.expiringProducts) {
    const [products, batches] = await Promise.all([ProductRepo.all(), BatchRepo.all()]);
    const productById = new Map(products.map((p) => [p.id, p]));
    let expiredCount = 0;
    let expiringCount = 0;
    let halfLifeCount = 0;
    for (const b of batches) {
      if (!productById.has(b.productId)) continue;
      const { status } = computeBatchStatus(b.productionDate, b.expiryDate, b.halfLifeDate, b.shelfLifeValue, b.shelfLifeUnit);
      if (status === 'expired') expiredCount++;
      else if (status === 'near_expiry' || status === 'expiring_soon') expiringCount++;
      else if (status === 'after_half') halfLifeCount++;
    }

    if (n.categories.expiredProducts && expiredCount > 0 && !(await NotificationLogRepo.wasSentToday('expiredProducts'))) {
      await showNotification(
        'ExpiryMate — Dr. Deja',
        `${intro}\n${notificationLine('expiredProducts', expiredCount, lang)}\n${DR_DEJA_SIGNATURE}`,
        'batches',
        { status: 'expired' }
      );
      await NotificationLogRepo.markSentToday('expiredProducts');
    }
    if (n.categories.expiringProducts && expiringCount > 0 && !(await NotificationLogRepo.wasSentToday('expiringProducts'))) {
      await showNotification(
        'ExpiryMate — Dr. Deja',
        `${intro}\n${notificationLine('expiringProducts', expiringCount, lang)}\n${DR_DEJA_SIGNATURE}`,
        'batches',
        { status: 'near_expiry' }
      );
      await NotificationLogRepo.markSentToday('expiringProducts');
    }
    if (n.categories.halfLifeProducts && halfLifeCount > 0 && !(await NotificationLogRepo.wasSentToday('halfLifeProducts'))) {
      await showNotification(
        'ExpiryMate — Dr. Deja',
        `${intro}\n${notificationLine('halfLifeProducts', halfLifeCount, lang)}\n${DR_DEJA_SIGNATURE}`,
        'batches',
        { status: 'after_half' }
      );
      await NotificationLogRepo.markSentToday('halfLifeProducts');
    }
  }

  // --- Health certificate categories ---
  if (n.categories.expiredCertificates || n.categories.expiringCertificates) {
    const [employees, certificates] = await Promise.all([EmployeeRepo.all(), HealthCertificateRepo.all()]);
    const employeeIds = new Set(employees.map((e) => e.id));
    let expiredCertCount = 0;
    let expiringCertCount = 0;
    for (const c of certificates) {
      if (!employeeIds.has(c.employeeId)) continue;
      const { status } = computeCertificateStatus(c.expiryDate);
      if (status === 'expired') expiredCertCount++;
      else if (status === 'near_expiry') expiringCertCount++;
    }

    if (n.categories.expiredCertificates && expiredCertCount > 0 && !(await NotificationLogRepo.wasSentToday('expiredCertificates'))) {
      await showNotification(
        'ExpiryMate — Dr. Deja',
        `${intro}\n${notificationLine('expiredCertificates', expiredCertCount, lang)}\n${DR_DEJA_SIGNATURE}`,
        'healthCertificates',
        { status: 'expired' }
      );
      await NotificationLogRepo.markSentToday('expiredCertificates');
    }
    if (n.categories.expiringCertificates && expiringCertCount > 0 && !(await NotificationLogRepo.wasSentToday('expiringCertificates'))) {
      await showNotification(
        'ExpiryMate — Dr. Deja',
        `${intro}\n${notificationLine('expiringCertificates', expiringCertCount, lang)}\n${DR_DEJA_SIGNATURE}`,
        'healthCertificates',
        { status: 'near_expiry' }
      );
      await NotificationLogRepo.markSentToday('expiringCertificates');
    }
  }

  // --- Daily reminder (no data condition - just a nudge, once a day) ---
  if (n.categories.dailyReminder && !(await NotificationLogRepo.wasSentToday('dailyReminder'))) {
    const line = lang === 'ar' ? DAILY_REMINDER_LINE.ar : DAILY_REMINDER_LINE.en;
    await showNotification('ExpiryMate — Dr. Deja', `${intro}\n${line}\n${DR_DEJA_SIGNATURE}`, 'dashboard');
    await NotificationLogRepo.markSentToday('dailyReminder');
  }
}

/** Sends an immediate test notification, bypassing the daily dedup log. */
export async function sendTestNotification(lang: Lang): Promise<boolean> {
  if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return false;
  const period = getDayPeriod();
  const intro = NOTIFICATION_INTROS_BY_PERIOD[period][lang];
  const body =
    lang === 'ar'
      ? `${intro}\nهذا إشعار تجريبي للتأكد من عمل الإشعارات بشكل صحيح.\n${DR_DEJA_SIGNATURE}`
      : `${intro}\nThis is a test notification to confirm everything is working.\n${DR_DEJA_SIGNATURE}`;
  await showNotification('ExpiryMate — Dr. Deja', body, 'dashboard');
  return true;
}

/**
 * Decides whether today's scheduled check is due yet (current time >= settings.notifications.time)
 * and hasn't already run today (checked via a lightweight marker in the log store).
 */
export async function shouldRunScheduledCheck(settings: AppSettings): Promise<boolean> {
  const n = settings.notifications;
  if (!n?.enabled) return false;
  const [h, m] = n.time.split(':').map(Number);
  const now = new Date();
  const scheduled = new Date();
  scheduled.setHours(h || 8, m || 0, 0, 0);
  if (now.getTime() < scheduled.getTime()) return false;
  return !(await NotificationLogRepo.wasSentToday('__scheduleMarker'));
}

export async function markScheduledCheckRan(): Promise<void> {
  await NotificationLogRepo.markSentToday('__scheduleMarker');
}
