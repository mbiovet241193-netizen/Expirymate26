import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ensureDefaultCategories, ensureDefaultSettings, migrateLegacyShelfLifeDbIntoProducts } from '../db/repositories';
import { SettingsRepo } from '../db/repositories';
import type { AppSettings } from '../types';
import { translations, type Lang, type TranslationKey } from '../i18n/translations';
import { runNotificationCheck, shouldRunScheduledCheck, markScheduledCheckRan } from '../notifications/engine';

interface AppContextValue {
  settings: AppSettings & { id: string };
  updateSettings: (s: Partial<AppSettings>) => Promise<void>;
  ready: boolean;
  t: (key: TranslationKey) => string;
  lang: Lang;
  toggleTheme: () => void;
  refreshToken: number;
  bump: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<(AppSettings & { id: string }) | null>(null);
  const [ready, setReady] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    (async () => {
      await ensureDefaultCategories();
      await migrateLegacyShelfLifeDbIntoProducts();
      const s = await ensureDefaultSettings();
      setSettings(s as AppSettings & { id: string });
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!settings) return;
    document.documentElement.setAttribute('dir', settings.language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', settings.language);
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings?.language, settings?.theme]);

  // Lightweight, one-shot notification check: runs at most once per day, only
  // when the app is actually open/visible (see notifications/engine.ts for
  // why true background scheduling can't be guaranteed on every platform).
  useEffect(() => {
    if (!settings) return;

    const check = async () => {
      if (await shouldRunScheduledCheck(settings)) {
        await runNotificationCheck(settings);
        await markScheduledCheckRan();
      }
    };
    check();

    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [settings]);

  const updateSettings = useCallback(
    async (partial: Partial<AppSettings>) => {
      if (!settings) return;
      const next = { ...settings, ...partial };
      await SettingsRepo.save(next);
      setSettings(next);
    },
    [settings]
  );

  const toggleTheme = useCallback(() => {
    if (!settings) return;
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  }, [settings, updateSettings]);

  const bump = useCallback(() => setRefreshToken((v) => v + 1), []);

  const t = useCallback(
    (key: TranslationKey) => {
      const lang = settings?.language ?? 'ar';
      return translations[lang][key];
    },
    [settings?.language]
  );

  if (!ready || !settings) {
    return (
      <div className="splash-loading">
        <div className="splash-logo">QualityMate</div>
        <div className="splash-sub">مساعدك الذكي لإدارة الصلاحيات</div>
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{ settings, updateSettings, ready, t, lang: settings.language, toggleTheme, refreshToken, bump }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
