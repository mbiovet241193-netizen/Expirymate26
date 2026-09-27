import React from 'react';
import { useApp } from '../context/AppContext';

const PHONE = '+201092110686';
const PHONE_DISPLAY = '01092110686';
const LINKEDIN_URL =
  'https://www.linkedin.com/in/mahmoud-sayed-4106a636b?utm_source=share_via&utm_content=profile&utm_medium=member_android';

export default function About() {
  const { lang } = useApp();

  const copyPhone = () => {
    navigator.clipboard?.writeText(PHONE_DISPLAY);
    alert(lang === 'ar' ? 'تم نسخ رقم الهاتف' : 'Phone number copied');
  };

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="card" style={{ textAlign: 'center', padding: 30 }}>
        <img
          src="/assets/dr-deja.png"
          alt="Dr. Deja"
          loading="lazy"
          style={{ width: 140, height: 'auto', borderRadius: 'var(--md-radius-lg)', margin: '0 auto 14px' }}
        />
        <h1 style={{ margin: '0 0 4px', fontWeight: 800 }}>Dr. Deja</h1>
        <div style={{ color: 'var(--on-surface-variant)', fontWeight: 600 }}>
          {lang === 'ar' ? 'المساعدة الذكية داخل QualityMate' : 'The Smart Quality Assistant inside QualityMate'}
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: 30 }}>
        <div style={{ fontSize: '2rem' }}>🛡️</div>
        <h1 style={{ margin: '8px 0 4px', fontWeight: 800 }}>QualityMate</h1>
        <div style={{ color: 'var(--on-surface-variant)', fontWeight: 600 }}>Your Smart Assistant for Quality & Food Safety Management</div>
        <div style={{ color: 'var(--on-surface-variant)', fontWeight: 600 }}>مساعدك الذكي لإدارة الجودة وسلامة الغذاء</div>
      </div>

      <div className="card">
        <h2 className="section-title">{lang === 'ar' ? 'نظرة عامة على التطبيق' : 'Application Overview'}</h2>
        <p>
          {lang === 'ar'
            ? 'QualityMate هو مساعد شامل لأطباء الجودة وأخصائيي سلامة الغذاء ومديري المواقع في شركات التموين والمصانع الغذائية والمطابخ المركزية والمخازن. يغطي التطبيق المحاور الثلاثة لسلامة الغذاء — النظافة الشخصية، نظافة الغذاء، والنظافة البيئية — من متابعة الصلاحيات وسجل الاستلام، إلى الشهادات الصحية والتدريب، مرورًا بالصيانة ومكافحة الآفات والنظافة العميقة، وحتى ملاحظات الشفت ومنبه المستندات، كل ذلك دون الحاجة لأي اتصال بالإنترنت.'
            : 'QualityMate is a comprehensive assistant for Quality Doctors, Food Safety Specialists, and Site Managers in catering companies, food factories, central kitchens, and warehouses. The app covers all three pillars of food safety — Personal Hygiene, Food Hygiene, and Environmental Hygiene — from expiry follow-up and receiving records to health certificates and training, through maintenance, pest control, and deep cleaning, down to shift notes and document reminders — fully offline.'}
        </p>
      </div>

      <div className="card">
        <h2 className="section-title">{lang === 'ar' ? 'الأهداف' : 'Objectives'}</h2>
        <ul>
          <li>{lang === 'ar' ? 'تطبيق دقيق لنظام FEFO' : 'Accurate FEFO implementation'}</li>
          <li>{lang === 'ar' ? 'حسابات صلاحية طبقًا للمواصفة المصرية' : 'Egyptian Standard-compliant shelf-life calculations'}</li>
          <li>{lang === 'ar' ? 'تغطية كاملة لمحاور سلامة الغذاء الثلاثة داخل تطبيق واحد' : 'Full coverage of all three food-safety pillars in one app'}</li>
          <li>{lang === 'ar' ? 'تقارير احترافية جاهزة للطباعة' : 'Professional, print-ready reports'}</li>
          <li>{lang === 'ar' ? 'خصوصية كاملة - لا سحابة، لا تتبع' : 'Complete privacy — no cloud, no tracking'}</li>
        </ul>
      </div>

      <div className="card">
        <h2 className="section-title">{lang === 'ar' ? 'الميزات الرئيسية' : 'Main Features'}</h2>
        <p>
          {lang === 'ar'
            ? 'محرك صلاحية مصري مبني على المواصفة القياسية المصرية 2613-1/2008، لوحة تحكم بمحاور سلامة الغذاء الثلاثة ولوحة نشاط فعلي، إدارة الفئات والمنتجات ومتابعة الصلاحية حسب الموقع مع حاسبة صلاحية وسجل استلام ومتابعة المنتجات غير المطابقة، متابعة الشهادات الصحية للموظفين والتدريب بخطته السنوية وسجلاته، الصيانة الوقائية والعلاجية بزياراتها وطلباتها، مكافحة الآفات، النظافة الشخصية بتسجيل المخالفات وتقاريرها، النظافة العميقة بخطتها الأسبوعية ومتابعتها اليومية، ملاحظات الشفت اليومية، منبه المستندات بتنبيهاته التلقائية، بحث عام يغطي كل أقسام التطبيق، تقارير شاملة قابلة للتصدير والأرشفة، نسخ احتياطي واستعادة كاملين، إشعارات ذكية اختيارية، وضع فاتح وداكن، ودعم كامل للغة العربية RTL.'
            : 'Egyptian Shelf-Life Engine based on Egyptian Standard 2613-1/2008, a dashboard built around the three food-safety pillars with a real activity feed, category/product management and site-based expiry follow-up with a shelf-life calculator, receiving register, and non-conforming tracking, employee health certificate tracking and training with its annual plan and records, preventive and corrective maintenance with visits and requests, pest control, personal hygiene violation logging with dedicated reports, deep cleaning with a weekly plan and daily follow-up, daily shift notes, document reminders with automatic alerts, a general search covering every part of the app, comprehensive exportable and archivable reports, full backup & restore, optional smart notifications, dark/light mode, and full Arabic RTL support.'}
        </p>
      </div>

      <div className="card">
        <div className="form-grid">
          <div className="form-field">
            <label>{lang === 'ar' ? 'الإصدار الحالي' : 'Current Version'}</label>
            <div style={{ fontWeight: 700 }}>
              2.0.0
              <div style={{ fontWeight: 500, fontSize: '0.8rem', color: 'var(--on-surface-variant)', marginTop: 2 }}>
                {lang === 'ar' ? '(كان يُعرف سابقًا باسم ExpiryMate)' : '(formerly known as ExpiryMate)'}
              </div>
            </div>
          </div>
          <div className="form-field">
            <label>{lang === 'ar' ? 'آخر تحديث' : 'Last Update'}</label>
            <div style={{ fontWeight: 700 }}>2026</div>
          </div>
          <div className="form-field">
            <label>{lang === 'ar' ? 'تصميم وإنشاء' : 'Designed & Created by'}</label>
            <div style={{ fontWeight: 700 }}>Mahmoud S.A Biomy</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">{lang === 'ar' ? 'ساهم في تطوير التطبيق' : 'Contribute to the App'}</h2>
        <p style={{ marginBottom: 14 }}>
          {lang === 'ar'
            ? 'ندعوك للمساهمة في تطوير التطبيق ومتابعة آخر تحديثاته عبر قناة التيليجرام الرسمية:'
            : "You're invited to contribute to the app's development and follow its latest updates via the official Telegram channel:"}
        </p>
        <a
          className="btn btn-primary"
          href="https://t.me/QualityMate2026"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none' }}
        >
          ✈️ Telegram
        </a>
      </div>

      <div className="card">
        <h2 className="section-title">{lang === 'ar' ? 'تواصل مع المطور' : 'Contact Developer'}</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a
            className="btn btn-primary"
            href={`https://wa.me/${PHONE.replace('+', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
          >
            📱 WhatsApp
          </a>
          <a className="btn btn-outline" href={`tel:${PHONE}`} style={{ textDecoration: 'none' }}>
            ☎️ {lang === 'ar' ? 'اتصال' : 'Call'}
          </a>
          <button className="btn btn-secondary" onClick={copyPhone}>
            📋 {lang === 'ar' ? 'نسخ الرقم' : 'Copy Number'}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">{lang === 'ar' ? 'لمتابعة أحدث التطبيقات المهنية' : 'Follow the Latest Professional Apps'}</h2>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: '2rem' }}>👨‍⚕️</div>
          <div>
            <div style={{ fontWeight: 800 }}>Vet / Mahmoud S.A Biomy</div>
            <div style={{ color: 'var(--on-surface-variant)', fontWeight: 600 }}>
              {lang === 'ar' ? 'مشرف سلامة غذاء' : 'Food Safety Supervisor'}
            </div>
          </div>
        </div>
        <p style={{ marginBottom: 14 }}>
          {lang === 'ar'
            ? 'نتشرف بزيارتكم على لينكد إن على الرابط التالي:'
            : "You're welcome to visit my LinkedIn profile at the link below:"}
        </p>
        <a
          className="btn btn-primary"
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none' }}
        >
          🔗 LinkedIn
        </a>
      </div>

      <div style={{ textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '0.85rem' }}>
        © 2026 Mahmoud S.A Biomy — {lang === 'ar' ? 'كل الحقوق محفوظة' : 'All Rights Reserved'}
      </div>
    </div>
  );
}
