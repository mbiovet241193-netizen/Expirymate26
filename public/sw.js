// ExpiryMate Service Worker
// Offline-first, cache-first strategy for the app shell.
// No external network calls are ever made by this app.

const CACHE_NAME = 'expirymate-cache-v3';
const APP_SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

// --- Notification click: open ExpiryMate directly on the relevant screen ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const route = data.route || 'dashboard';
  const query = data.params && Object.keys(data.params).length ? '?' + new URLSearchParams(data.params).toString() : '';
  const targetUrl = `/#/${route}${query}`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate ? client.navigate(targetUrl).then(() => client.focus()) : client.focus();
          return;
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

// --- Best-effort background check (Periodic Background Sync) ---
// Only Chrome/Edge on Desktop/Android support this for installed PWAs, and
// the browser - not this code - decides the actual timing. On platforms
// without support (Safari/iOS, Firefox) this event simply never fires, and
// the app falls back to the on-open check in src/context/AppContext.tsx,
// which is the only mechanism guaranteed to work everywhere.
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'expirymate-daily-check') {
    event.waitUntil(runBackgroundNotificationCheck());
  }
});

const DB_NAME = 'expirymate-db';

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGetAll(db, storeName) {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(storeName)) return resolve([]);
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db, storeName, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function wasSentToday(db, category) {
  const all = await idbGetAll(db, 'notificationLog');
  return all.some((e) => e.id === `${todayStr()}:${category}`);
}

async function markSentToday(db, category) {
  await idbPut(db, 'notificationLog', { id: `${todayStr()}:${category}`, sentAt: new Date().toISOString() });
}

function daysBetween(a, b) {
  const MS = 24 * 60 * 60 * 1000;
  const da = new Date(a);
  const db_ = new Date(b);
  da.setHours(0, 0, 0, 0);
  db_.setHours(0, 0, 0, 0);
  return Math.round((db_.getTime() - da.getTime()) / MS);
}

async function runBackgroundNotificationCheck() {
  try {
    const db = await idbOpen();
    const settingsRows = await idbGetAll(db, 'settings');
    const settings = settingsRows[0];
    if (!settings || !settings.notifications || !settings.notifications.enabled) return;
    const n = settings.notifications;
    const lang = settings.language === 'en' ? 'en' : 'ar';
    const todayIso = todayStr();
    const doctorName = (settings.doctorName || '').trim();

    const openers = {
      morning: { ar: 'صباح الخير', en: 'Good morning' },
      afternoon: { ar: 'مرحباً', en: 'Hello' },
      evening: { ar: 'مساء الخير', en: 'Good evening' }
    };
    const hour = new Date().getHours();
    const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const hasTitlePrefix = doctorName.startsWith('د.') || /^dr\.?\s/i.test(doctorName) || /^dr\./i.test(doctorName);
    const nameSuffix = !doctorName ? '' : hasTitlePrefix ? ` ${doctorName}` : lang === 'ar' ? ` يا ${doctorName}` : `, ${doctorName}`;
    const intro = `${openers[period][lang]}${nameSuffix}.`;
    const signature = '\u2014 Dr. Deja';

    // Shelf-life-in-months helper (mirrors src/engine/shelfLifeEngine.ts shelfLifeInMonths),
    // used only for the <= 3 months "short shelf-life" threshold.
    function shelfLifeMonths(value, unit) {
      if (unit === 'days') return value / 30;
      if (unit === 'years') return value * 12;
      return value; // 'months'
    }

    if (n.categories.expiredProducts || n.categories.halfLifeProducts || n.categories.expiringProducts || n.categories.expiringSoon) {
      const [products, batches] = await Promise.all([idbGetAll(db, 'products'), idbGetAll(db, 'batches')]);
      const productIds = new Set(products.map((p) => p.id));
      let expired = 0,
        within30 = 0, // near-expiry warning for long shelf-life products (> 3 months)
        expiringSoon = 0, // near-expiry warning for short shelf-life products (<= 3 months), remaining days 1-9
        halfLife = 0;
      for (const b of batches) {
        if (!productIds.has(b.productId)) continue;
        const remaining = daysBetween(todayIso, b.expiryDate);
        const shortRule = shelfLifeMonths(b.shelfLifeValue, b.shelfLifeUnit) <= 3;
        const inFinalWarningWindow = shortRule ? remaining <= 9 : remaining <= 30;
        if (remaining < 1) expired++;
        else if (inFinalWarningWindow) {
          if (shortRule) expiringSoon++;
          else within30++;
        } else if (todayIso >= b.halfLifeDate) halfLife++;
      }
      if (n.categories.expiredProducts && expired > 0 && !(await wasSentToday(db, 'expiredProducts'))) {
        const body =
          lang === 'ar'
            ? `${intro}\nيوجد ${expired} منتجات منتهية الصلاحية تحتاج إلى مراجعة.\n${signature}`
            : `${intro}\n${expired} product(s) have expired and need review.\n${signature}`;
        await self.registration.showNotification('ExpiryMate — Dr. Deja', { body, data: { route: 'batches', params: { status: 'expired' } } });
        await markSentToday(db, 'expiredProducts');
      }
      if (n.categories.expiringProducts && within30 > 0 && !(await wasSentToday(db, 'expiringProducts'))) {
        const body =
          lang === 'ar'
            ? `${intro}\nيوجد ${within30} منتجات ستنتهي خلال 30 يوماً.\n${signature}`
            : `${intro}\n${within30} product(s) will expire within 30 days.\n${signature}`;
        await self.registration.showNotification('ExpiryMate — Dr. Deja', { body, data: { route: 'batches', params: { status: 'near_expiry' } } });
        await markSentToday(db, 'expiringProducts');
      }
      if (n.categories.expiringSoon && expiringSoon > 0 && !(await wasSentToday(db, 'expiringSoon'))) {
        const body =
          lang === 'ar'
            ? `${intro}\nيوجد ${expiringSoon} منتجات ستنتهي قريباً.\n${signature}`
            : `${intro}\n${expiringSoon} product(s) are expiring soon.\n${signature}`;
        await self.registration.showNotification('ExpiryMate — Dr. Deja', { body, data: { route: 'batches', params: { status: 'near_expiry' } } });
        await markSentToday(db, 'expiringSoon');
      }
      if (n.categories.halfLifeProducts && halfLife > 0 && !(await wasSentToday(db, 'halfLifeProducts'))) {
        const body =
          lang === 'ar'
            ? `${intro}\nيوجد ${halfLife} منتجات تجاوزت نصف الصلاحية.\n${signature}`
            : `${intro}\n${halfLife} product(s) have passed half shelf life.\n${signature}`;
        await self.registration.showNotification('ExpiryMate — Dr. Deja', { body, data: { route: 'batches', params: { status: 'after_half' } } });
        await markSentToday(db, 'halfLifeProducts');
      }
    }

    if (n.categories.expiredCertificates || n.categories.expiringCertificates) {
      const [employees, certs] = await Promise.all([idbGetAll(db, 'employees'), idbGetAll(db, 'healthCertificates')]);
      const employeeIds = new Set(employees.map((e) => e.id));
      let expiredCert = 0,
        expiringCert = 0;
      for (const c of certs) {
        if (!employeeIds.has(c.employeeId)) continue;
        const remaining = daysBetween(todayIso, c.expiryDate);
        if (remaining < 0) expiredCert++;
        else if (remaining <= 30) expiringCert++;
      }
      if (n.categories.expiredCertificates && expiredCert > 0 && !(await wasSentToday(db, 'expiredCertificates'))) {
        const body =
          lang === 'ar'
            ? `${intro}\nتوجد ${expiredCert} شهادات صحية منتهية.\n${signature}`
            : `${intro}\n${expiredCert} health certificate(s) have expired.\n${signature}`;
        await self.registration.showNotification('ExpiryMate — Dr. Deja', { body, data: { route: 'healthCertificates', params: { status: 'expired' } } });
        await markSentToday(db, 'expiredCertificates');
      }
      if (n.categories.expiringCertificates && expiringCert > 0 && !(await wasSentToday(db, 'expiringCertificates'))) {
        const body =
          lang === 'ar'
            ? `${intro}\nتوجد ${expiringCert} شهادات صحية ستنتهيان قريباً.\n${signature}`
            : `${intro}\n${expiringCert} health certificate(s) will expire soon.\n${signature}`;
        await self.registration.showNotification('ExpiryMate — Dr. Deja', { body, data: { route: 'healthCertificates', params: { status: 'near_expiry' } } });
        await markSentToday(db, 'expiringCertificates');
      }
    }

    if (n.categories.dailyReminder && !(await wasSentToday(db, 'dailyReminder'))) {
      const line = lang === 'ar' ? 'تذكير: يرجى مراجعة تواريخ الصلاحية اليوم.' : 'Reminder: please review expiry dates today.';
      await self.registration.showNotification('ExpiryMate — Dr. Deja', { body: `${intro}\n${line}\n${signature}`, data: { route: 'dashboard' } });
      await markSentToday(db, 'dailyReminder');
    }
  } catch {
    // Best-effort only - never let a background failure surface to the user.
  }
}
