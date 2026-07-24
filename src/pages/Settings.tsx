import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { exportAllData, importAllData } from '../db/db';
import { downloadJson, readJsonFile } from '../utils/export';
import { sendTestNotification } from '../notifications/engine';
import type { NotificationSettings } from '../types';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

type SyncStatus = 'checking' | 'unsupported' | 'not-installed' | 'permission-denied' | 'registered' | 'not-registered';

export default function Settings() {
  const { t, lang, settings, updateSettings } = useApp();
  const { installed, canInstall, isIOS, promptInstall } = useInstallPrompt();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const [siteNameInput, setSiteNameInput] = useState('');
  const [supplierInput, setSupplierInput] = useState('');
  const [testResult, setTestResult] = useState<'sent' | 'denied' | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('checking');

  useEffect(() => {
    (async () => {
      try {
        if (!('serviceWorker' in navigator)) return setSyncStatus('unsupported');
        const reg = (await navigator.serviceWorker.getRegistration()) as any;
        if (!reg || !('periodicSync' in reg)) return setSyncStatus('unsupported');
        if (!installed) return setSyncStatus('not-installed');
        const status: any = await (navigator as any).permissions.query({ name: 'periodic-background-sync' });
        if (status.state !== 'granted') return setSyncStatus('permission-denied');
        const tags: string[] = await reg.periodicSync.getTags();
        setSyncStatus(tags.includes('expirymate-daily-check') ? 'registered' : 'not-registered');
      } catch {
        setSyncStatus('unsupported');
      }
    })();
  }, [installed]);

  const updateNotifications = (partial: Partial<NotificationSettings>) => {
    updateSettings({ notifications: { ...settings.notifications, ...partial } });
  };
  const updateCategory = (key: keyof NotificationSettings['categories'], value: boolean) => {
    updateNotifications({ categories: { ...settings.notifications.categories, [key]: value } });
  };

  const toggleMasterSwitch = async (checked: boolean) => {
    if (!checked) {
      updateNotifications({ enabled: false });
      return;
    }
    if (!('Notification' in window)) {
      alert(lang === 'ar' ? 'المتصفح لا يدعم الإشعارات.' : 'This browser does not support notifications.');
      return;
    }
    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (permission === 'granted') {
      updateNotifications({ enabled: true });
    } else {
      alert(
        lang === 'ar'
          ? 'يجب السماح بالإشعارات من إعدادات المتصفح لتفعيل هذه الميزة.'
          : 'You must allow notifications in your browser settings to enable this feature.'
      );
    }
  };

  const doTestNotification = async () => {
    if (!('Notification' in window)) return;
    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (permission !== 'granted') {
      setTestResult('denied');
      return;
    }
    const ok = await sendTestNotification(lang, settings.doctorName);
    setTestResult(ok ? 'sent' : 'denied');
  };

  const onLogoSelected = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => updateSettings({ companyLogo: reader.result as string });
    reader.readAsDataURL(file);
  };

  const addSiteName = () => {
    if (!siteNameInput.trim()) return;
    updateSettings({ siteNames: [...settings.siteNames, siteNameInput.trim()] });
    setSiteNameInput('');
  };
  const removeSiteName = (name: string) => updateSettings({ siteNames: settings.siteNames.filter((n) => n !== name) });

  const addSupplier = () => {
    if (!supplierInput.trim()) return;
    updateSettings({ supplierList: [...settings.supplierList, supplierInput.trim()] });
    setSupplierInput('');
  };
  const removeSupplier = (name: string) => updateSettings({ supplierList: settings.supplierList.filter((n) => n !== name) });

  const doBackup = async () => {
    const data = await exportAllData();
    downloadJson(`expirymate-backup-${new Date().toISOString().slice(0, 10)}`, data);
  };

  const doRestore = async (file: File) => {
    if (
      !confirm(
        lang === 'ar'
          ? 'ستحل هذه العملية محل جميع البيانات الحالية بالكامل. هل تريد المتابعة؟'
          : 'This will completely replace all current data. Continue?'
      )
    )
      return;
    const data = await readJsonFile(file);
    await importAllData(data);
    alert(lang === 'ar' ? 'تمت الاستعادة بنجاح. يرجى إعادة تحميل الصفحة.' : 'Restore complete. Please reload the page.');
    window.location.reload();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 720 }}>
      <div className="card">
        <h2 className="section-title">{lang === 'ar' ? 'بيانات الشركة' : 'Company Information'}</h2>
        <div className="form-grid">
          <div className="form-field">
            <label>{t('companyName')}</label>
            <input value={settings.companyName} onChange={(e) => updateSettings({ companyName: e.target.value })} />
          </div>
          <div className="form-field">
            <label>{t('doctorName')}</label>
            <input value={settings.doctorName} onChange={(e) => updateSettings({ doctorName: e.target.value })} />
          </div>
          <div className="form-field">
            <label>{t('doctorCode')}</label>
            <input value={settings.doctorCode} onChange={(e) => updateSettings({ doctorCode: e.target.value })} />
          </div>
          <div className="form-field">
            <label>{lang === 'ar' ? 'شعار الشركة' : 'Company Logo'}</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {settings.companyLogo && <img src={settings.companyLogo} alt="logo" style={{ height: 40 }} />}
              <button className="btn btn-outline btn-sm" onClick={() => fileInputRef.current?.click()}>
                {lang === 'ar' ? 'رفع صورة' : 'Upload'}
              </button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={(e) => e.target.files && onLogoSelected(e.target.files[0])}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">{lang === 'ar' ? 'أسماء المواقع' : 'Site Names'}</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <input
            style={{ flex: 1, minWidth: 160 }}
            value={siteNameInput}
            onChange={(e) => setSiteNameInput(e.target.value)}
            placeholder={lang === 'ar' ? 'اسم موقع جديد' : 'New site name'}
          />
          <button className="btn btn-primary btn-sm" onClick={addSiteName}>
            +
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {settings.siteNames.map((n) => (
            <span key={n} className="badge" style={{ background: 'var(--secondary-container)', color: 'var(--on-surface)' }}>
              {n} <span style={{ cursor: 'pointer' }} onClick={() => removeSiteName(n)}>✕</span>
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">{lang === 'ar' ? 'الموردين' : 'Suppliers'}</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <input
            style={{ flex: 1, minWidth: 160 }}
            value={supplierInput}
            onChange={(e) => setSupplierInput(e.target.value)}
            placeholder={lang === 'ar' ? 'اسم مورد جديد' : 'New supplier'}
          />
          <button className="btn btn-primary btn-sm" onClick={addSupplier}>
            +
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {settings.supplierList.map((n) => (
            <span key={n} className="badge" style={{ background: 'var(--secondary-container)', color: 'var(--on-surface)' }}>
              {n} <span style={{ cursor: 'pointer' }} onClick={() => removeSupplier(n)}>✕</span>
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">{lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}</h2>
        {installed ? (
          <p style={{ color: 'var(--success)', fontSize: '0.9rem' }}>
            ✅ {lang === 'ar' ? 'التطبيق مثبّت بالفعل على هذا الجهاز.' : 'Application is already installed.'}
          </p>
        ) : canInstall ? (
          <button className="btn btn-primary" onClick={promptInstall}>
            📲 {lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}
          </button>
        ) : isIOS ? (
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.85rem' }}>
            {lang === 'ar'
              ? 'للتثبيت على آيفون/آيباد: اضغط زر "مشاركة" في Safari ثم اختر "إضافة إلى الشاشة الرئيسية".'
              : 'To install on iPhone/iPad: tap the Share button in Safari, then choose "Add to Home Screen".'}
          </p>
        ) : (
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.85rem' }}>
            {lang === 'ar' ? 'التثبيت غير متاح حاليًا في هذا المتصفح.' : 'Installation is not currently available in this browser.'}
          </p>
        )}
      </div>

      <div className="card">
        <h2 className="section-title">{lang === 'ar' ? 'الإشعارات' : 'Notifications'}</h2>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.85rem', marginTop: -8 }}>
          {lang === 'ar'
            ? 'الإشعارات اختيارية بالكامل ومعطّلة افتراضيًا. كل الفحص يتم محليًا على جهازك فقط.'
            : 'Notifications are fully optional and disabled by default. All checks happen locally on this device only.'}
        </p>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: '10px 0 18px' }}>
          <input
            type="checkbox"
            checked={settings.notifications.enabled}
            onChange={(e) => toggleMasterSwitch(e.target.checked)}
          />
          <strong>{lang === 'ar' ? 'تفعيل الإشعارات (المفتاح الرئيسي)' : 'Enable Notifications (Master Switch)'}</strong>
        </label>

        <div className="form-grid" style={{ marginBottom: 18 }}>
          <div className="form-field">
            <label>{lang === 'ar' ? 'وقت الإشعار اليومي' : 'Daily Notification Time'}</label>
            <input
              type="time"
              value={settings.notifications.time}
              onChange={(e) => updateNotifications({ time: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 18 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 8, color: 'var(--on-surface-variant)' }}>
              {lang === 'ar' ? 'إشعارات صلاحية المنتجات' : 'Product Expiry Notifications'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.notifications.categories.expiredProducts}
                  onChange={(e) => updateCategory('expiredProducts', e.target.checked)}
                />
                {lang === 'ar' ? 'المنتجات المنتهية' : 'Expired Products'}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.notifications.categories.halfLifeProducts}
                  onChange={(e) => updateCategory('halfLifeProducts', e.target.checked)}
                />
                {lang === 'ar' ? 'تجاوزت نصف مدة الصلاحية' : 'Passed Half Shelf Life'}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.notifications.categories.expiringProducts}
                  onChange={(e) => updateCategory('expiringProducts', e.target.checked)}
                />
                {lang === 'ar' ? 'خلال 30 يومًا' : 'Expiring Within 30 Days'}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.notifications.categories.expiringSoon}
                  onChange={(e) => updateCategory('expiringSoon', e.target.checked)}
                />
                {t('expiringSoon')}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.notifications.categories.dailyReminder}
                  onChange={(e) => updateCategory('dailyReminder', e.target.checked)}
                />
                {lang === 'ar' ? 'تذكير يومي بمراجعة الصلاحيات' : 'Daily Reminder to Review Expiry Dates'}
              </label>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 8, color: 'var(--on-surface-variant)' }}>
              {lang === 'ar' ? 'إشعارات الشهادات الصحية' : 'Health Certificate Notifications'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.notifications.categories.expiredCertificates}
                  onChange={(e) => updateCategory('expiredCertificates', e.target.checked)}
                />
                {lang === 'ar' ? 'الشهادات المنتهية' : 'Expired Health Certificates'}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.notifications.categories.expiringCertificates}
                  onChange={(e) => updateCategory('expiringCertificates', e.target.checked)}
                />
                {lang === 'ar' ? 'خلال 30 يومًا' : 'Expiring Within 30 Days'}
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={doTestNotification}>
            🔔 {lang === 'ar' ? 'إرسال إشعار تجريبي' : 'Send Test Notification'}
          </button>
          {testResult === 'sent' && (
            <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>
              ✅ {lang === 'ar' ? 'تم الإرسال بنجاح.' : 'Sent successfully.'}
            </span>
          )}
          {testResult === 'denied' && (
            <span style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>
              ⚠️ {lang === 'ar' ? 'الإذن غير مُمنوح من المتصفح.' : 'Permission not granted by the browser.'}
            </span>
          )}
        </div>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.78rem', marginTop: 14, marginBottom: 0 }}>
          {lang === 'ar'
            ? 'ملاحظة: التوقيت الدقيق مضمون فقط عند فتح التطبيق. على أندرويد/ديسكتوب (Chrome/Edge) قد تصل الإشعارات أحيانًا في الخلفية أيضًا؛ على آيفون تظهر فقط عند فتح التطبيق.'
            : 'Note: exact timing is only guaranteed when the app is open. On Android/Desktop Chrome/Edge, notifications may sometimes also arrive in the background; on iPhone they appear only when the app is opened.'}
        </p>
        <p
          style={{
            fontSize: '0.78rem',
            marginTop: 8,
            marginBottom: 0,
            color:
              syncStatus === 'registered'
                ? 'var(--success)'
                : syncStatus === 'checking'
                ? 'var(--on-surface-variant)'
                : 'var(--danger)'
          }}
        >
          {syncStatus === 'checking' && (lang === 'ar' ? '⏳ جارٍ فحص حالة الفحص الخلفي...' : '⏳ Checking background sync status...')}
          {syncStatus === 'unsupported' &&
            (lang === 'ar'
              ? '⚠️ هذا المتصفح لا يدعم الفحص الخلفي (Periodic Background Sync) — التنبيهات ستظهر فقط عند فتح التطبيق.'
              : '⚠️ This browser does not support Periodic Background Sync — alerts will only appear when the app is opened.')}
          {syncStatus === 'not-installed' &&
            (lang === 'ar'
              ? '⚠️ الفحص الخلفي يعمل فقط بعد تثبيت التطبيق فعليًا على الجهاز (Install App). ثبّته من الأعلى ثم أعد فتح هذه الصفحة.'
              : '⚠️ Background sync only works after installing the app on the device. Install it above, then reopen this page.')}
          {syncStatus === 'permission-denied' &&
            (lang === 'ar'
              ? '⚠️ المتصفح لم يمنح إذن الفحص الخلفي بعد. Chrome يمنحه تلقائيًا فقط مع الاستخدام المتكرر للتطبيق على مدار عدة أيام — استمر في فتح التطبيق يوميًا وسيُمنح تلقائيًا.'
              : '⚠️ The browser has not granted background-sync permission yet. Chrome grants it automatically only after frequent, repeated use over several days — keep opening the app daily and it will be granted.')}
          {syncStatus === 'not-registered' &&
            (lang === 'ar'
              ? '⚠️ الإذن مُمنوح لكن التسجيل لم يكتمل بعد — أعد فتح التطبيق مرة واحدة ليكتمل التسجيل.'
              : '⚠️ Permission is granted but registration has not completed yet — reopen the app once to complete it.')}
          {syncStatus === 'registered' &&
            (lang === 'ar'
              ? '✅ الفحص الخلفي مُفعّل ومسجّل على هذا الجهاز. تذكّر أن Chrome هو من يحدد التوقيت الفعلي (وقد لا يكون دقيقًا)، وأن أوضاع توفير البطارية على بعض الأجهزة (مثل شاومي/هواوي/سامسونج) قد توقفه رغم تسجيله.'
              : '✅ Background sync is enabled and registered on this device. Note that Chrome itself decides the exact timing (it may not be precise), and battery-saver modes on some devices (e.g. Xiaomi/Huawei/Samsung) can still block it even when registered.')}
        </p>
      </div>

      <div className="card">
        <h2 className="section-title">{lang === 'ar' ? 'النسخ الاحتياطي والاستعادة' : 'Backup & Restore'}</h2>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.85rem' }}>
          {lang === 'ar'
            ? 'كل البيانات مخزنة محليًا على هذا الجهاز فقط. قم بعمل نسخة احتياطية بانتظام.'
            : 'All data is stored locally on this device only. Back up regularly.'}
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={doBackup}>
            ⬇️ {t('backup')}
          </button>
          <button className="btn btn-outline" onClick={() => restoreInputRef.current?.click()}>
            ⬆️ {t('restore')}
          </button>
          <input
            type="file"
            accept="application/json"
            ref={restoreInputRef}
            style={{ display: 'none' }}
            onChange={(e) => e.target.files && doRestore(e.target.files[0])}
          />
        </div>
      </div>
    </div>
  );
}
