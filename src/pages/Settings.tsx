import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { exportAllData, importAllData, factoryReset } from '../db/db';
import { downloadJson, readJsonFile } from '../utils/export';
import { sendTestNotification } from '../notifications/engine';
import type { NotificationSettings } from '../types';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import WhatsAppBackupDialog from '../components/common/WhatsAppBackupDialog';

export default function Settings() {
  const { t, lang, settings, updateSettings } = useApp();
  const { installed, canInstall, isIOS, promptInstall } = useInstallPrompt();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [showWhatsAppBackup, setShowWhatsAppBackup] = useState(false);

  const [siteNameInput, setSiteNameInput] = useState('');
  const [supplierInput, setSupplierInput] = useState('');
  const [testResult, setTestResult] = useState<'sent' | 'denied' | null>(null);

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
    const ok = await sendTestNotification(lang, settings.doctorGender, settings.doctorName);
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
    downloadJson(`qualitymate-backup-${new Date().toISOString().slice(0, 10)}`, data);
  };

  const doRestore = async (file: File) => {
    const confirmMsg =
      restoreMode === 'replace'
        ? lang === 'ar'
          ? 'ستحل هذه العملية محل جميع البيانات الحالية بالكامل (إعادة ضبط ثم استعادة). هل تريد المتابعة؟'
          : 'This will completely replace all current data (reset then restore). Continue?'
        : lang === 'ar'
        ? 'سيتم دمج بيانات النسخة الاحتياطية مع البيانات الحالية: تحديث المطابق منها وإضافة الجديد، دون حذف أي شيء موجود حاليًا. هل تريد المتابعة؟'
        : "This will merge the backup into your current data: updating matching records and adding new ones, without deleting anything currently there. Continue?";
    if (!confirm(confirmMsg)) return;
    let data: any;
    try {
      data = await readJsonFile(file);
    } catch {
      alert(
        lang === 'ar'
          ? 'تعذّرت قراءة هذا الملف — تأكد أنه ملف نسخة احتياطية صالح (JSON) ولم يتلف أو يتغير امتداده.'
          : "Couldn't read this file — make sure it's a valid backup (JSON) file and its extension wasn't changed."
      );
      return;
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      alert(lang === 'ar' ? 'هذا الملف لا يبدو نسخة احتياطية صالحة.' : "This file doesn't look like a valid backup."
      );
      return;
    }
    let restoredCount: number;
    try {
      restoredCount = await importAllData(data, restoreMode);
    } catch {
      alert(
        lang === 'ar'
          ? 'حدث خطأ أثناء الاستعادة. قد تكون بعض البيانات داخل الملف تالفة. لم يتم تغيير أي شيء.'
          : 'An error occurred during restore. Some data in the file may be corrupted. Nothing was changed.'
      );
      return;
    }
    if (restoredCount === 0) {
      alert(
        lang === 'ar'
          ? 'تم فتح الملف لكن لم يتم العثور على أي بيانات معروفة بداخله. لم يتم تغيير أي شيء.'
          : "The file opened but no recognizable data was found inside it. Nothing was changed."
      );
      return;
    }
    alert(
      lang === 'ar'
        ? `تمت الاستعادة بنجاح (${restoredCount} سجل). يرجى إعادة تحميل الصفحة.`
        : `Restore complete (${restoredCount} records). Please reload the page.`
    );
    window.location.reload();
  };

  const doFactoryReset = async () => {
    const firstWarning =
      lang === 'ar'
        ? 'سيؤدي هذا إلى حذف جميع بيانات التطبيق نهائيًا (المنتجات، الدفعات، المواقع، الصيانة، التدريب، وكل شيء آخر) وإعادته لحالته كأول تثبيت. لا يمكن التراجع عن هذا الإجراء. هل تريد المتابعة؟'
        : 'This will permanently delete ALL app data (products, batches, sites, maintenance, training, and everything else) and reset it to a fresh install. This cannot be undone. Continue?';
    if (!confirm(firstWarning)) return;
    const secondWarning =
      lang === 'ar'
        ? 'تأكيد أخير: هل أنت متأكد تمامًا من حذف كل البيانات نهائيًا؟ يُفضّل عمل نسخة احتياطية أولًا إن لم تكن قد فعلت.'
        : 'Final confirmation: are you absolutely sure you want to permanently erase all data? Consider making a backup first if you haven\u2019t already.';
    if (!confirm(secondWarning)) return;
    await factoryReset();
    alert(lang === 'ar' ? 'تمت إعادة الضبط بنجاح. سيتم إعادة تحميل الصفحة.' : 'Factory reset complete. The page will now reload.');
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
            <label>{lang === 'ar' ? 'جنس الطبيب' : 'Doctor Gender'}</label>
            <select value={settings.doctorGender ?? 'male'} onChange={(e) => updateSettings({ doctorGender: e.target.value as 'male' | 'female' })}>
              <option value="male">{lang === 'ar' ? 'ذكر' : 'Male'}</option>
              <option value="female">{lang === 'ar' ? 'أنثى' : 'Female'}</option>
            </select>
            <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>
              {lang === 'ar'
                ? 'يُستخدم فقط لضبط صياغة مخاطبة الدكتورة ديجا، ولا يؤثر على التقارير أو البيانات المحفوظة.'
                : "Used only to adjust Dr. Deja's grammatical wording — never affects reports or stored data."}
            </div>
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

          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 8, color: 'var(--on-surface-variant)' }}>
              {lang === 'ar' ? 'إشعارات منبه المستندات' : 'Document Reminder Notifications'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.notifications.categories.expiredDocuments}
                  onChange={(e) => updateCategory('expiredDocuments', e.target.checked)}
                />
                {lang === 'ar' ? 'المستندات المنتهية' : 'Expired Documents'}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.notifications.categories.expiringDocuments}
                  onChange={(e) => updateCategory('expiringDocuments', e.target.checked)}
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
          <button className="btn btn-outline" onClick={() => setShowWhatsAppBackup(true)}>
            🟢 {lang === 'ar' ? 'مشاركة نسخة احتياطية عبر واتساب' : 'Share Backup via WhatsApp'}
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>{t('restore')}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline"
              onClick={() => {
                setRestoreMode('replace');
                restoreInputRef.current?.click();
              }}
            >
              ⬆️ {lang === 'ar' ? 'استعادة مع إعادة ضبط الحالي' : 'Restore & Reset Current Data'}
            </button>
            <button
              className="btn btn-outline"
              onClick={() => {
                setRestoreMode('merge');
                restoreInputRef.current?.click();
              }}
            >
              🔀 {lang === 'ar' ? 'استعادة مع الدمج والتحديث' : 'Restore & Merge/Update'}
            </button>
          </div>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.78rem', marginTop: 6 }}>
            {lang === 'ar'
              ? '"إعادة ضبط الحالي" تمسح البيانات الموجودة وتستبدلها بالكامل بمحتوى النسخة الاحتياطية. "الدمج والتحديث" تحدّث السجلات المطابقة وتضيف الجديد منها فقط، دون حذف أي شيء من بياناتك الحالية.'
              : '"Reset Current Data" erases existing data and fully replaces it with the backup\u2019s content. "Merge/Update" updates matching records and adds new ones only, without deleting any of your current data.'}
          </p>
          <input
            type="file"
            accept=".json,.txt,application/json,text/plain,*/*"
            ref={restoreInputRef}
            style={{ display: 'none' }}
            onChange={(e) => e.target.files && doRestore(e.target.files[0])}
          />
        </div>
      </div>

      <div className="card" style={{ borderColor: 'var(--danger)', borderWidth: 1, borderStyle: 'solid' }}>
        <h2 className="section-title" style={{ color: 'var(--danger)' }}>
          {lang === 'ar' ? 'إعادة ضبط المصنع' : 'Factory Reset'}
        </h2>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.85rem' }}>
          {lang === 'ar'
            ? 'يحذف جميع بيانات التطبيق نهائيًا ويعيده لحالته الأولى قبل أي استخدام. إجراء لا يمكن التراجع عنه.'
            : 'Permanently deletes all app data and resets it to its original, never-used state. This action cannot be undone.'}
        </p>
        <button className="btn btn-danger" onClick={doFactoryReset}>
          🏭 {lang === 'ar' ? 'إعادة ضبط المصنع' : 'Factory Reset'}
        </button>
      </div>

      {showWhatsAppBackup && (
        <WhatsAppBackupDialog
          lang={lang}
          doctorName={settings.doctorName}
          doctorCode={settings.doctorCode}
          savedNumber={settings.backupWhatsAppNumber}
          onSaveNumber={(number) => updateSettings({ backupWhatsAppNumber: number })}
          onClose={() => setShowWhatsAppBackup(false)}
        />
      )}
    </div>
  );
}
