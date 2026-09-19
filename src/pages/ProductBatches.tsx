// Expiry Follow-up module.
// NOTE: file/route/db-store names stay as "batches"/"ProductBatches" for backward
// compatibility with existing data and links; only the user-facing label changed
// to "Expiry Follow-up" per the product's new naming.
import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../router/Router';
import { BatchRepo, ProductRepo, CategoryRepo } from '../db/repositories';
import { generateId } from '../db/db';
import type { Batch, Category, Product, ProductStatus } from '../types';
import { calculateExpiry, computeBatchStatus, STATUS_LABELS_AR, STATUS_LABELS_EN } from '../engine/shelfLifeEngine';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import Autocomplete from '../components/common/Autocomplete';
import DateInput from '../components/common/DateInput';

const ALL_STATUSES: ProductStatus[] = ['expired', 'near_expiry', 'expiring_soon', 'before_half', 'after_half'];

export default function ProductBatches() {
  const { t, lang, settings } = useApp();
  const { params } = useRouter();
  const productIdFilter = params.productId;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | ''>((params.status as ProductStatus) ?? '');

  const [selectedProductId, setSelectedProductId] = useState('');
  const [siteName, setSiteName] = useState('');
  const [productionDate, setProductionDate] = useState(() => new Date().toISOString().slice(0, 10));

  const load = async () => {
    const [p, b, c] = await Promise.all([ProductRepo.all(), BatchRepo.all(), CategoryRepo.all()]);
    setProducts(p);
    setBatches(b);
    setCategories(c);
  };
  useEffect(() => {
    load();
  }, []);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const productName = (id: string) => productById.get(id)?.name ?? '—';
  const catName = (id: string | undefined) => {
    const c = categories.find((c) => c.id === id);
    if (!c) return '—';
    return lang === 'ar' ? c.nameAr || c.name : c.name;
  };

  const visibleBatches = useMemo(() => {
    let list = productIdFilter ? batches.filter((b) => b.productId === productIdFilter) : batches;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((b) => productName(b.productId).toLowerCase().includes(q));
    }
    if (siteFilter) {
      list = list.filter((b) => b.siteName === siteFilter);
    }
    if (categoryFilter) {
      list = list.filter((b) => productById.get(b.productId)?.categoryId === categoryFilter);
    }
    if (statusFilter) {
      list = list.filter(
        (b) => computeBatchStatus(b.productionDate, b.expiryDate, b.halfLifeDate, b.shelfLifeValue, b.shelfLifeUnit).status === statusFilter
      );
    }

    // FEFO: First Expired First Out -> sort ascending by expiry date (default, always on)
    return [...list].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches, productIdFilter, searchQuery, siteFilter, categoryFilter, statusFilter, productById]);

  const openAdd = () => {
    setEditing(null);
    const defaultProductId = productIdFilter ?? products[0]?.id ?? '';
    setSelectedProductId(defaultProductId);
    setSiteName(siteFilter || settings.siteNames[0] || '');
    setProductionDate(new Date().toISOString().slice(0, 10));
    setShowModal(true);
  };

  const openEdit = (b: Batch) => {
    setEditing(b);
    setSelectedProductId(b.productId);
    setSiteName(b.siteName ?? '');
    setProductionDate(b.productionDate);
    setShowModal(true);
  };

  const save = async () => {
    const product = productById.get(selectedProductId);
    if (!product || !productionDate) return;

    // Shelf life always comes from the central Products database - never re-typed here.
    const shelfLifeValue = product.defaultShelfLifeValue ?? 6;
    const shelfLifeUnit = product.defaultShelfLifeUnit ?? 'months';
    const { expiryDate, halfLifeDate } = calculateExpiry({ productionDate, shelfLifeValue, shelfLifeUnit });

    const batch: Batch = editing
      ? { ...editing, productId: selectedProductId, siteName: siteName || undefined, productionDate, shelfLifeValue, shelfLifeUnit, expiryDate, halfLifeDate }
      : {
          id: generateId(),
          productId: selectedProductId,
          siteName: siteName || undefined,
          productionDate,
          shelfLifeValue,
          shelfLifeUnit,
          expiryDate,
          halfLifeDate,
          createdAt: new Date().toISOString()
        };
    await BatchRepo.save(batch);
    setShowModal(false);
    load();
  };

  const remove = async (b: Batch) => {
    if (!confirm(lang === 'ar' ? 'هل تريد حذف هذا السجل؟' : 'Delete this record?')) return;
    await BatchRepo.remove(b.id);
    load();
  };

  const clearAllBatches = async () => {
    const warning =
      lang === 'ar'
        ? `سيتم حذف كل سجلات متابعة الصلاحية نهائيًا (${batches.length} سجل) ولا يمكن التراجع عن هذا الإجراء. هل أنت متأكد؟`
        : `This will permanently delete ALL Expiry Follow-up records (${batches.length}) and cannot be undone. Are you sure?`;
    if (!confirm(warning)) return;
    if (
      !confirm(
        lang === 'ar'
          ? 'تأكيد أخير: سيتم مسح كل البيانات بشكل نهائي. اضغط موافق للمتابعة.'
          : 'Final confirmation: all data will be permanently erased. Press OK to proceed.'
      )
    )
      return;
    await BatchRepo.clearAll();
    load();
  };

  const selectedProduct = productById.get(selectedProductId);
  const preview =
    selectedProduct && productionDate
      ? calculateExpiry({
          productionDate,
          shelfLifeValue: selectedProduct.defaultShelfLifeValue ?? 6,
          shelfLifeUnit: selectedProduct.defaultShelfLifeUnit ?? 'months'
        })
      : null;

  const statusLabel = (s: ProductStatus) => (lang === 'ar' ? STATUS_LABELS_AR[s] : STATUS_LABELS_EN[s]);

  return (
    <div>
      <div className="toolbar">
        <div style={{ fontWeight: 700, color: 'var(--on-surface-variant)' }}>
          {productIdFilter
            ? `${lang === 'ar' ? 'متابعة صلاحية' : 'Expiry Follow-up for'}: ${productName(productIdFilter)}`
            : lang === 'ar'
            ? 'متابعة الصلاحية (مرتبة حسب FEFO)'
            : 'Expiry Follow-up (sorted by FEFO)'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-danger" onClick={clearAllBatches} disabled={batches.length === 0}>
            🗑️ {lang === 'ar' ? 'مسح الكل' : 'Clear All'}
          </button>
          <button className="btn btn-primary" onClick={openAdd} disabled={products.length === 0}>
            + {lang === 'ar' ? 'إضافة سجل' : 'Add Record'}
          </button>
        </div>
      </div>

      {!productIdFilter && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="form-grid">
            <div className="form-field">
              <label>{lang === 'ar' ? 'الموقع' : 'Site'}</label>
              <Autocomplete
                value={siteFilter}
                onChange={setSiteFilter}
                allowEmptyOption={{ value: '', label: lang === 'ar' ? 'كل المواقع' : 'All Sites' }}
                options={settings.siteNames.map((n) => ({ value: n, label: n }))}
                placeholder={lang === 'ar' ? 'كل المواقع' : 'All Sites'}
              />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'بحث' : 'Search'}</label>
              <input
                placeholder={lang === 'ar' ? 'ابحث باسم المنتج...' : 'Search by product name...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>{t('category')}</label>
              <Autocomplete
                value={categoryFilter}
                onChange={setCategoryFilter}
                allowEmptyOption={{ value: '', label: lang === 'ar' ? 'كل الفئات' : 'All Categories' }}
                options={categories.map((c) => ({ value: c.id, label: lang === 'ar' ? c.nameAr || c.name : c.name }))}
                placeholder={lang === 'ar' ? 'كل الفئات' : 'All Categories'}
              />
            </div>
            <div className="form-field">
              <label>{t('status')}</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ProductStatus | '')}>
                <option value="">{lang === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {visibleBatches.length === 0 ? (
        <div className="card">
          <div className="empty-state">{t('noData')}</div>
        </div>
      ) : (
        <>
          {/* Desktop: professional responsive data table */}
          <div className="card desktop-only-table" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {!productIdFilter && <th>{t('products')}</th>}
                  {!siteFilter && <th>{lang === 'ar' ? 'الموقع' : 'Site'}</th>}
                  <th>{t('productionDate')}</th>
                  <th>{t('expiryDate')}</th>
                  <th>{t('halfLifeDate')}</th>
                  <th>{t('remainingDays')}</th>
                  <th>{t('consumption')}</th>
                  <th>{t('status')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleBatches.map((b) => {
                  const { remainingDays, consumptionPercent, status } = computeBatchStatus(
                    b.productionDate,
                    b.expiryDate,
                    b.halfLifeDate,
                    b.shelfLifeValue,
                    b.shelfLifeUnit
                  );
                  return (
                    <tr key={b.id}>
                      {!productIdFilter && <td>{productName(b.productId)}</td>}
                      {!siteFilter && <td>{b.siteName || (lang === 'ar' ? '— غير محدد —' : '— Unassigned —')}</td>}
                      <td>{b.productionDate}</td>
                      <td>{b.expiryDate}</td>
                      <td>{b.halfLifeDate}</td>
                      <td>{remainingDays}</td>
                      <td>{consumptionPercent.toFixed(0)}%</td>
                      <td>
                        <StatusBadge status={status} />
                      </td>
                      <td style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(b)}>
                          {t('edit')}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(b)}>
                          {t('delete')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: Material Design cards */}
          <div className="mobile-cards">
            {visibleBatches.map((b) => {
              const { remainingDays, consumptionPercent, status } = computeBatchStatus(
                b.productionDate,
                b.expiryDate,
                b.halfLifeDate,
                b.shelfLifeValue,
                b.shelfLifeUnit
              );
              return (
                <div className="expiry-card" key={b.id}>
                  <div className="expiry-card-header">
                    <div className="expiry-card-title">{productIdFilter ? productName(productIdFilter) : productName(b.productId)}</div>
                    <StatusBadge status={status} />
                  </div>
                  <div className="expiry-card-row">
                    <span>{t('productionDate')}</span>
                    <span>{b.productionDate}</span>
                  </div>
                  {!siteFilter && (
                    <div className="expiry-card-row">
                      <span>{lang === 'ar' ? 'الموقع' : 'Site'}</span>
                      <span>{b.siteName || (lang === 'ar' ? '— غير محدد —' : '— Unassigned —')}</span>
                    </div>
                  )}
                  <div className="expiry-card-row">
                    <span>{t('expiryDate')}</span>
                    <span>{b.expiryDate}</span>
                  </div>
                  <div className="expiry-card-row">
                    <span>{t('remainingDays')}</span>
                    <span>
                      {remainingDays} · {consumptionPercent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="expiry-card-actions">
                    <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => openEdit(b)}>
                      {t('edit')}
                    </button>
                    <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => remove(b)}>
                      {t('delete')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showModal && (
        <Modal
          title={editing ? t('edit') : lang === 'ar' ? 'إضافة سجل' : 'Add Record'}
          onClose={() => setShowModal(false)}
        >
          <div className="form-grid">
            {!productIdFilter && (
              <div className="form-field">
                <label>{t('products')}</label>
                <Autocomplete
                  value={selectedProductId}
                  onChange={setSelectedProductId}
                  options={products.map((p) => ({ value: p.id, label: p.name }))}
                  placeholder={lang === 'ar' ? 'اختر المنتج' : 'Select product'}
                />
              </div>
            )}
            <div className="form-field">
              <label>{lang === 'ar' ? 'الموقع' : 'Site'}</label>
              <Autocomplete
                value={siteName}
                onChange={setSiteName}
                allowEmptyOption={{ value: '', label: lang === 'ar' ? '— بدون تحديد —' : '— Unassigned —' }}
                options={settings.siteNames.map((n) => ({ value: n, label: n }))}
                placeholder={lang === 'ar' ? 'اختر الموقع' : 'Select site'}
              />
            </div>
            <div className="form-field">
              <label>{t('productionDate')}</label>
              <DateInput value={productionDate} onChange={setProductionDate} />
            </div>
          </div>

          {preview && selectedProduct && (
            <div className="card" style={{ marginTop: 14, background: 'var(--surface-container-high)' }}>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: '0.85rem' }}>
                <div>
                  <strong>{t('shelfLife')}:</strong> {selectedProduct.defaultShelfLifeValue} {t(selectedProduct.defaultShelfLifeUnit ?? 'months')}
                </div>
                <div>
                  <strong>{t('expiryDate')}:</strong> {preview.expiryDate}
                </div>
                <div>
                  <strong>{t('halfLifeDate')}:</strong> {preview.halfLifeDate}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setShowModal(false)}>
              {t('cancel')}
            </button>
            <button className="btn btn-primary" onClick={save} disabled={!selectedProductId || !productionDate}>
              {t('save')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
