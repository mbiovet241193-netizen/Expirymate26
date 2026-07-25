import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { BatchRepo, CategoryRepo, ProductRepo } from '../db/repositories';
import type { Batch, Category, Product, ProductStatus } from '../types';
import { computeBatchStatus } from '../engine/shelfLifeEngine';
import StatusBadge from '../components/common/StatusBadge';
import Autocomplete from '../components/common/Autocomplete';

export default function Search() {
  const { t, lang } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | ''>('');
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
        const computed = computeBatchStatus(b.productionDate, b.expiryDate, b.halfLifeDate);
        return { batch: b, product, ...computed };
      })
      .filter((r) => {
        if (!r.product) return false;
        if (query && !r.product.name.toLowerCase().includes(query.toLowerCase())) return false;
        if (categoryFilter && r.product.categoryId !== categoryFilter) return false;
        if (statusFilter && r.status !== statusFilter) return false;
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
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ProductStatus | '')}>
              <option value="">{lang === 'ar' ? 'الكل' : 'All'}</option>
              <option value="before_half">{t('beforeHalf')}</option>
              <option value="after_half">{t('afterHalf')}</option>
              <option value="near_expiry">{t('within30Days')}</option>
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
                {results.map(({ batch, product, remainingDays, status }) => (
                  <tr key={batch.id}>
                    <td>{product?.name}</td>
                    <td>{catName(product?.categoryId ?? '')}</td>
                    <td>{batch.productionDate}</td>
                    <td>{batch.expiryDate}</td>
                    <td>{remainingDays}</td>
                    <td>
                      <StatusBadge status={status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-cards">
            {results.map(({ batch, product, remainingDays, status }) => (
              <div className="record-card" key={batch.id}>
                <div className="record-card-header">
                  <div className="record-card-title">{product?.name}</div>
                  <StatusBadge status={status} />
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
