import React from 'react';
import { useApp } from '../../context/AppContext';
import { useRouter } from '../../router/Router';
import type { TranslationKey } from '../../i18n/translations';

const TITLES: Record<string, TranslationKey> = {
  dashboard: 'dashboard',
  categories: 'categories',
  products: 'products',
  batches: 'batches',
  calculator: 'calculator',
  receiving: 'receiving',
  nonConforming: 'nonConforming',
  healthCertificates: 'healthCertificates',
  search: 'search',
  reports: 'reports',
  reportsArchive: 'reportsArchive',
  settings: 'settings',
  about: 'about'
};

export default function Header() {
  const { settings, t, toggleTheme, updateSettings } = useApp();
  const { route, navigate } = useRouter();

  return (
    <header className="top-header no-print">
      <div className="header-brand" onClick={() => navigate('dashboard')} role="button" tabIndex={0}>
        <span className="header-brand-icon" aria-hidden="true">🛡️</span>
        <span className="header-brand-title">QualityMate</span>
      </div>
      {route !== 'dashboard' && <h1 className="header-page-title">{t(TITLES[route] ?? 'dashboard')}</h1>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          className="icon-btn"
          title={settings.language === 'ar' ? 'English' : 'العربية'}
          onClick={() => updateSettings({ language: settings.language === 'ar' ? 'en' : 'ar' })}
        >
          {settings.language === 'ar' ? 'EN' : 'AR'}
        </button>
        <button
          className="icon-btn"
          title={settings.theme === 'light' ? t('darkMode') : t('lightMode')}
          onClick={toggleTheme}
        >
          {settings.theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </header>
  );
}
