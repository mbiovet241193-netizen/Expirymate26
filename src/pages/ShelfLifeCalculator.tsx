import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Product, ShelfLifeUnit } from '../types';
import { ProductRepo } from '../db/repositories';
import { calculateExpiry, computeBatchStatus } from '../engine/shelfLifeEngine';
import DateInput from '../components/common/DateInput';
import StatusBadge from '../components/common/StatusBadge';
import Autocomplete from '../components/common/Autocomplete';

export default function ShelfLifeCalculator() {
  const { t, lang } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productionDate, setProductionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [value, setValue] = useState<number>(6);
  const [unit, setUnit] = useState<ShelfLifeUnit>('months');

  useEffect(() => {
    ProductRepo.all().then(setProducts);
  }, []);

  const onProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    if (!productId) return;
    const p = products.find((p) => p.id === productId);
    if (p) {
      setValue(p.defaultShelfLifeValue ?? 6);
      setUnit(p.defaultShelfLifeUnit ?? 'months');
    }
  };

  const result = useMemo(() => {
    if (!productionDate || !value) return null;
    const calc = calculateExpiry({ productionDate, shelfLifeValue: value, shelfLifeUnit: unit });
    const status = computeBatchStatus(productionDate, calc.expiryDate, calc.halfLifeDate, value, unit);
    return { ...calc, ...status };
  }, [productionDate, value, unit]);

  return (
    <div>
      <div className="card" style={{ maxWidth: 640 }}>
        <h2 className="section-title">{t('calculator')}</h2>
        <div className="form-grid">
          <div className="form-field" style={{ gridColumn: '1 / -1' }}>
            <label>{lang === 'ar' ? 'اختر منتجًا (اختياري)' : 'Select a Product (optional)'}</label>
            <Autocomplete
              value={selectedProductId}
              onChange={onProductSelect}
              allowEmptyOption={{ value: '', label: lang === 'ar' ? '— إدخال يدوي —' : '— Manual Entry —' }}
              options={products.map((p) => ({ value: p.id, label: p.name }))}
              placeholder={lang === 'ar' ? '— إدخال يدوي —' : '— Manual Entry —'}
            />
          </div>
          <div className="form-field">
            <label>{t('productionDate')}</label>
            <DateInput value={productionDate} onChange={setProductionDate} />
          </div>
          <div className="form-field">
            <label>{t('shelfLife')}</label>
            <input type="number" min={1} value={value} onChange={(e) => setValue(Number(e.target.value))} />
          </div>
          <div className="form-field">
            <label>{lang === 'ar' ? 'الوحدة' : 'Unit'}</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value as ShelfLifeUnit)}>
              <option value="days">{t('days')}</option>
              <option value="months">{t('months')}</option>
              <option value="years">{t('years')}</option>
            </select>
          </div>
        </div>
      </div>

      {result && (
        <div className="card" style={{ maxWidth: 640, marginTop: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: '0.92rem' }}>
            <Field label={t('expiryDate')} value={result.expiryDate} />
            <Field label={t('halfLifeDate')} value={result.halfLifeDate} />
            <Field label={t('remainingDays')} value={String(result.remainingDays)} />
            <Field label={t('consumption')} value={`${result.consumptionPercent.toFixed(1)}%`} />
            <Field
              label={lang === 'ar' ? 'قاعدة الحساب' : 'Rule Used'}
              value={
                result.usesShortRule
                  ? lang === 'ar'
                    ? 'يوم/شهر/سنة (تاريخ محدد)'
                    : 'Day/Month/Year (exact date)'
                  : lang === 'ar'
                  ? 'شهر/سنة (آخر يوم في الشهر)'
                  : 'Month/Year (last day of month)'
              }
            />
            <div className="form-field">
              <label>{t('status')}</label>
              <div style={{ marginTop: 4 }}>
                <StatusBadge status={result.status} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <div style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}
