import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { BatchRepo, CategoryRepo, ProductRepo } from '../db/repositories';
import type { Batch, Category, Product, ProductStatus } from '../types';
import { computeBatchStatus, isShortShelfLife } from '../engine/shelfLifeEngine';
import StatusBadge from '../components/common/StatusBadge';
import Autocomplete from '../components/common/Autocomplete';

export default function Search() {
  const { t, lang } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  // "Expiring Soon" is a UI-level filter refinement of 'near_expiry' (short shelf-life
  // products, <= 3 months, remaining days 1-9) - not a separate ProductStatus value.
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'expiring_soon' | ''>('');
  const [beforeDate, setBeforeDate] = useState('');

  useEffect(() => {
    (async () => {
      setProducts(await ProductRepo.all());
      setCategories(await CategoryRepo.all());
      setBatches(await BatchRepo.all());
    })();
  }, []);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const catName = (id: string) => {
    const c = categories.find((c) => c.id === id);
    if (!c) return '—';
    return lang === 'ar' ? c.nameAr || c.name : c.name;
  };

  const results = useMemo(() => {
    return batches
      .map((b) => {
        const product = productMap.get(b.productId);
        const computed = computeBatchStatus(b.productionDate, b.expiryDate, b.halfLifeDate, b.shelfLifeValue, b.shelfLifeUnit);
        const shortRule = isShortShelfLife(b.shelfLifeValue, b.shelfLifeUnit);
        return { batch: b, product, shortRule, ...computed };
      })
      .filter((r) => {
        if (!r.product) return false;
        if (query && !r.product.name.toLowerCase().includes(query.toLowerCase())) return false;
        if (categoryFilter && r.product.categoryId !== categoryFilter) return false;
        if (statusFilter === 'expiring_soon') {
          if (!(r.status === 'near_expiry' && r.shortRule)) return false;
        } else if (statusFilter && r.status !== statusFilter) {
          return false;
        }
        if (beforeDate && r.batch.expiryDate > beforeDate) return false;
        return true;
      })
      .sort((a, b) => a.batch.expiryDate.localeCompare(b.batch.expiryDate));
  }, [batches, productMap, query, categoryFilter, statusFilter, beforeDate]);

  return (
    <div>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="form-grid">
          <div className="form-field">
            <label>{lang === 'ar' ? 'اسم المنتج' : 'Product Name'}</label>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={lang === 'ar' ? 'ابحث...' : 'Search...'} />
          </div>
          <div className="form-field">
            <label>{t('category')}</label>
            <Autocomplete
              value={categoryFilter}
              onChange={setCategoryFilter}
              allowEmptyOption={{ value: '', label: lang === 'ar' ? 'الكل' : 'All' }}
              options={categories.map((c) => ({ value: c.id, label: catName(c.id) }))}
              placeholder={lang === 'ar' ? 'الكل' : 'All'}
            />
          </div>
          <div className="form-field">
            <label>{t('status')}</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ProductStatus | 'expiring_soon' | '')}>
              <option value="">{lang === 'ar' ? 'الكل' : 'All'}</option>
              <option value="within_shelf_life">{t('withinShelfLife')}</option>
              <option value="after_half">{t('afterHalf')}</option>
              <option value="near_expiry">{lang === 'ar' ? 'قريبة من الانتهاء' : 'Near Expiry'}</option>
              <option value="expiring_soon">{t('expiringSoon')}</option>
              <option value="expired">{t('expiredProducts')}</option>
            </select>
          </div>
          <div className="form-field">
            <label>{lang === 'ar' ? 'الانتهاء قبل تاريخ' : 'Expiry Before'}</label>
            <input type="date" value={beforeDate} onChange={(e) => setBeforeDate(e.target.value)} />
          </div>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="card">
          <div className="empty-state">{t('noData')}</div>
        </div>
      ) : (
        <>
          <div className="card desktop-only-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('name')}</th>
                  <th>{t('category')}</th>
                  <th>{t('productionDate')}</th>
                  <th>{t('expiryDate')}</th>
                  <th>{t('remainingDays')}</th>
                  <th>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {results.map(({ batch, product, remainingDays, status, shortRule }) => (
                  <tr key={batch.id}>
                    <td>{product?.name}</td>
                    <td>{catName(product?.categoryId ?? '')}</td>
                    <td>{batch.productionDate}</td>
                    <td>{batch.expiryDate}</td>
                    <td>{remainingDays}</td>
                    <td>
                      <StatusBadge status={status} shortRule={shortRule} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-cards">
            {results.map(({ batch, product, remainingDays, status, shortRule }) => (
              <div className="record-card" key={batch.id}>
                <div className="record-card-header">
                  <div className="record-card-title">{product?.name}</div>
                  <StatusBadge status={status} shortRule={shortRule} />
                </div>
                <div className="record-card-row">
                  <span>{t('category')}</span>
                  <span>{catName(product?.categoryId ?? '')}</span>
                </div>
                <div className="record-card-row">
                  <span>{t('expiryDate')}</span>
                  <span>{batch.expiryDate}</span>
                </div>
                <div className="record-card-row">
                  <span>{t('remainingDays')}</span>
                  <span>{remainingDays}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
