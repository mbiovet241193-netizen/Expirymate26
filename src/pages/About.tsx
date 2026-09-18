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
        <div style={{ color: 'var(--on-surface-variant)', fontWeight: 600 }}>Your Smart Quality Assistant</div>
        <div style={{ color: 'var(--on-surface-variant)', fontWeight: 600 }}>مساعدك الذكي لإدارة ومراقبة الصلاحيات</div>
      </div>

      <div className="card">
        <h2 className="section-title">{lang === 'ar' ? 'نظرة عامة على التطبيق' : 'Application Overview'}</h2>
        <p>
          {lang === 'ar'
            ? 'QualityMate هو مساعد متخصص لأطباء الجودة وأخصائيي سلامة الغذاء في شركات التموين والمصانع الغذائية والمطابخ المركزية والمخازن، لإدارة تواريخ الصلاحية وتطبيق نظام FEFO وتسجيل الاستلام وتتبع المنتجات غير المطابقة، دون الحاجة لأي اتصال بالإنترنت.'
            : 'QualityMate is a specialized assistant for Quality Doctors and Food Safety Specialists in catering companies, food factories, central kitchens, and warehouses — for expiry management, FEFO, receiving records, and non-conforming product tracking, fully offline.'}
        </p>
      </div>

      <div className="card">
        <h2 className="section-title">{lang === 'ar' ? 'الأهداف' : 'Objectives'}</h2>
        <ul>
          <li>{lang === 'ar' ? 'تطبيق دقيق لنظام FEFO' : 'Accurate FEFO implementation'}</li>
          <li>{lang === 'ar' ? 'حسابات صلاحية طبقًا للمواصفة المصرية' : 'Egyptian Standard-compliant shelf-life calculations'}</li>
          <li>{lang === 'ar' ? 'تقارير احترافية جاهزة للطباعة' : 'Professional, print-ready reports'}</li>
          <li>{lang === 'ar' ? 'خصوصية كاملة - لا سحابة، لا تتبع' : 'Complete privacy — no cloud, no tracking'}</li>
        </ul>
      </div>

      <div className="card">
        <h2 className="section-title">{lang === 'ar' ? 'الميزات الرئيسية' : 'Main Features'}</h2>
        <p>
          {lang === 'ar'
            ? 'محرك صلاحية مصري مبني على المواصفة القياسية المصرية 2613-1/2008، لوحة تحكم، إدارة الفئات والمنتجات ومتابعة الصلاحية، حاسبة صلاحية، سجل استلام، متابعة المنتجات غير المطابقة، متابعة الشهادات الصحية للموظفين، بحث وفلترة متقدمة، تقارير قابلة للتصدير، إشعارات ذكية اختيارية، وضع فاتح وداكن، ودعم كامل للغة العربية RTL.'
            : 'Egyptian Shelf-Life Engine based on Egyptian Standard 2613-1/2008, dashboard, category/product/expiry-follow-up management, shelf-life calculator, receiving register, non-conforming tracking, employee health certificate tracking, advanced search & filters, exportable reports, optional smart notifications, dark/light mode, and full Arabic RTL support.'}
        </p>
      </div>

      <div className="card">
        <div className="form-grid">
          <div className="form-field">
            <label>{lang === 'ar' ? 'الإصدار الحالي' : 'Current Version'}</label>
            <div style={{ fontWeight: 700 }}>1.0.0</div>
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
