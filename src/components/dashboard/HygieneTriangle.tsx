import React, { useState } from 'react';
import type { Route } from '../../router/Router';
import type { Lang } from '../../i18n/translations';

interface TriangleItem {
  route: Route;
  icon: string;
  labelAr: string;
  labelEn: string;
}

const PERSONAL_ITEMS: TriangleItem[] = [
  { route: 'personalHygiene', icon: '🧼', labelAr: 'النظافة الشخصية', labelEn: 'Personal Hygiene' },
  { route: 'healthCertificates', icon: '🩺', labelAr: 'الشهادات الصحية', labelEn: 'Health Certificates' },
  { route: 'training', icon: '🎓', labelAr: 'التدريب', labelEn: 'Training' }
];

const FOOD_DIRECT_ITEMS: TriangleItem[] = [{ route: 'receiving', icon: '🚚', labelAr: 'سجل الاستلام', labelEn: 'Receiving Register' }];

const FOOD_EXPIRY_ITEMS: TriangleItem[] = [
  { route: 'calculator', icon: '🧮', labelAr: 'حاسبة الصلاحيات', labelEn: 'Shelf-Life Calculator' },
  { route: 'categories', icon: '🗂️', labelAr: 'الفئات', labelEn: 'Categories' },
  { route: 'products', icon: '📦', labelAr: 'المنتجات', labelEn: 'Products' },
  { route: 'batches', icon: '⏳', labelAr: 'متابعة الصلاحية', labelEn: 'Expiry Follow-up' },
  { route: 'nonConforming', icon: '⚠️', labelAr: 'المنتجات غير المطابقة', labelEn: 'Non-Conforming Products' }
];

const ENVIRONMENTAL_ITEMS: TriangleItem[] = [
  { route: 'deepCleaning', icon: '🧽', labelAr: 'النظافة العميقة', labelEn: 'Deep Cleaning' },
  { route: 'pestControl', icon: '🐜', labelAr: 'مكافحة الآفات', labelEn: 'Pest Control' },
  { route: 'maintenance', icon: '🔧', labelAr: 'الصيانة', labelEn: 'Maintenance' }
];

type GroupKey = 'personal' | 'food' | 'environmental';

const GROUPS: { key: GroupKey; icon: string; labelAr: string; labelEn: string; color: string }[] = [
  { key: 'personal', icon: '🧍', labelAr: 'النظافة الشخصية', labelEn: 'Personal Hygiene', color: '#2E7D5B' },
  { key: 'food', icon: '🍽️', labelAr: 'نظافة الغذاء', labelEn: 'Food Hygiene', color: '#1565C0' },
  { key: 'environmental', icon: '🏭', labelAr: 'النظافة البيئية', labelEn: 'Environmental Hygiene', color: '#EF6C00' }
];

export default function HygieneTriangle({ lang, onNavigate }: { lang: Lang; onNavigate: (route: Route) => void }) {
  const [open, setOpen] = useState<GroupKey | null>(null);

  const itemsFor = (key: GroupKey): TriangleItem[] => {
    if (key === 'personal') return PERSONAL_ITEMS;
    if (key === 'environmental') return ENVIRONMENTAL_ITEMS;
    return [...FOOD_DIRECT_ITEMS, ...FOOD_EXPIRY_ITEMS];
  };

  return (
    <div className="hygiene-triangle-wrap">
      <div className="hygiene-triangle-groups">
        {GROUPS.map((g) => (
          <div key={g.key} className="hygiene-triangle-group">
            <button
              type="button"
              className="hygiene-triangle-corner"
              style={{ borderColor: g.color, background: open === g.key ? g.color : 'var(--surface)', color: open === g.key ? '#fff' : g.color }}
              onClick={() => setOpen(open === g.key ? null : g.key)}
            >
              <span style={{ fontSize: '1.4rem' }}>{g.icon}</span>
              <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{lang === 'ar' ? g.labelAr : g.labelEn}</span>
            </button>

            {open === g.key && (
              <div className="hygiene-triangle-items">
                {g.key === 'food' && (
                  <>
                    {FOOD_DIRECT_ITEMS.map((item) => (
                      <div key={item.route} className="hygiene-triangle-item" onClick={() => onNavigate(item.route)}>
                        <span>{item.icon}</span>
                        {lang === 'ar' ? item.labelAr : item.labelEn}
                      </div>
                    ))}
                    <div className="hygiene-triangle-subheading">{lang === 'ar' ? 'الصلاحيات' : 'Expiry'}</div>
                    {FOOD_EXPIRY_ITEMS.map((item) => (
                      <div key={item.route} className="hygiene-triangle-item" onClick={() => onNavigate(item.route)}>
                        <span>{item.icon}</span>
                        {lang === 'ar' ? item.labelAr : item.labelEn}
                      </div>
                    ))}
                  </>
                )}
                {g.key !== 'food' &&
                  itemsFor(g.key).map((item) => (
                    <div key={item.route} className="hygiene-triangle-item" onClick={() => onNavigate(item.route)}>
                      <span>{item.icon}</span>
                      {lang === 'ar' ? item.labelAr : item.labelEn}
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
