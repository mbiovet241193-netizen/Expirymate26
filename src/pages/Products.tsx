import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { CategoryRepo, ProductRepo, BatchRepo, ActivityLogRepo } from '../db/repositories';
import { generateId } from '../db/db';
import type { Category, Product, ShelfLifeUnit } from '../types';
import Modal from '../components/common/Modal';
import Autocomplete from '../components/common/Autocomplete';
import { useRouter } from '../router/Router';
import { exportProductsToExcel, parseProductsExcelFile } from '../utils/productsExcel';

export default function Products() {
  const { t, lang } = useApp();
  const { navigate } = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [importSummary, setImportSummary] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [slValue, setSlValue] = useState<number>(6);
  const [slUnit, setSlUnit] = useState<ShelfLifeUnit>('months');

  const load = async () => {
    const [p, c] = await Promise.all([ProductRepo.all(), CategoryRepo.all()]);
    setProducts(p);
    setCategories(c);
    if (!categoryId && c.length) setCategoryId(c[0].id);
  };
  useEffect(() => {
    load();
  }, []);

  const catName = (id: string) => {
    const c = categories.find((c) => c.id === id);
    if (!c) return '—';
    return lang === 'ar' ? c.nameAr || c.name : c.name;
  };

  const openAdd = () => {
    setEditing(null);
    setName('');
    setCategoryId(categories[0]?.id ?? '');
    setSlValue(6);
    setSlUnit('months');
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setName(p.name);
    setCategoryId(p.categoryId);
    setSlValue(p.defaultShelfLifeValue ?? 6);
    setSlUnit(p.defaultShelfLifeUnit ?? 'months');
    setShowModal(true);
  };

  const save = async () => {
    if (!name.trim() || !categoryId) return;
    const now = new Date().toISOString();
    const product: Product = editing
      ? { ...editing, name, categoryId, defaultShelfLifeValue: slValue, defaultShelfLifeUnit: slUnit, updatedAt: now }
      : {
          id: generateId(),
          name,
          categoryId,
          defaultShelfLifeValue: slValue,
          defaultShelfLifeUnit: slUnit,
          createdAt: now,
          updatedAt: now
        };
    await ProductRepo.save(product);
    if (!editing) await ActivityLogRepo.log('productAdded', name);
    setShowModal(false);
    load();
  };

  const remove = async (p: Product) => {
    const batches = await BatchRepo.all();
    const hasBatches = batches.some((b) => b.productId === p.id);
    if (hasBatches) {
      if (
        !confirm(
          lang === 'ar'
            ? 'هذا المنتج لديه تشغيلات مسجلة. سيتم حذف المنتج وكل تشغيلاته. هل تريد المتابعة؟'
            : 'This product has recorded batches. Deleting it will remove all its batches too. Continue?'
        )
      )
        return;
      const toDelete = batches.filter((b) => b.productId === p.id);
      for (const b of toDelete) await BatchRepo.remove(b.id);
    } else if (!confirm(lang === 'ar' ? 'هل تريد حذف هذا المنتج؟' : 'Delete this product?')) {
      return;
    }
    await ProductRepo.remove(p.id);
    load();
  };

  const doExportExcel = () => {
    exportProductsToExcel(products, categories, lang);
  };

  const doImportExcel = async (file: File) => {
    const parsedRows = await parseProductsExcelFile(file, categories);
    const now = new Date().toISOString();
    const byNameLower = new Map(products.map((p) => [p.name.trim().toLowerCase(), p]));

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of parsedRows) {
      const key = row.name.trim().toLowerCase();
      const existing = byNameLower.get(key);
      if (existing) {
        // Existing product -> update it (never create a duplicate).
        const updatedProduct: Product = {
          ...existing,
          categoryId: row.categoryId || existing.categoryId,
          defaultShelfLifeValue: row.shelfLifeValue,
          defaultShelfLifeUnit: row.shelfLifeUnit,
          updatedAt: now
        };
        await ProductRepo.save(updatedProduct);
        byNameLower.set(key, updatedProduct);
        updated++;
      } else if (row.categoryId) {
        // New product -> create it.
        const newProduct: Product = {
          id: generateId(),
          name: row.name,
          categoryId: row.categoryId,
          defaultShelfLifeValue: row.shelfLifeValue,
          defaultShelfLifeUnit: row.shelfLifeUnit,
          createdAt: now,
          updatedAt: now
        };
        await ProductRepo.save(newProduct);
        byNameLower.set(key, newProduct);
        created++;
      } else {
        skipped++;
      }
    }

    setImportSummary({ created, updated, skipped });
    load();
  };

  const onImportFileSelected = (file: File | undefined) => {
    if (!file) return;
    doImportExcel(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filtered = filterCategory ? products.filter((p) => p.categoryId === filterCategory) : products;

  return (
    <div>
      <div className="toolbar">
        <div className="form-field" style={{ minWidth: 220 }}>
          <Autocomplete
            value={filterCategory}
            onChange={setFilterCategory}
            allowEmptyOption={{ value: '', label: lang === 'ar' ? 'كل الفئات' : 'All Categories' }}
            options={categories.map((c) => ({ value: c.id, label: lang === 'ar' ? c.nameAr || c.name : c.name }))}
            placeholder={lang === 'ar' ? 'كل الفئات' : 'All Categories'}
          />
        </div>
        <button className="btn btn-outline" onClick={doExportExcel} disabled={products.length === 0}>
          {t('exportExcel')}
        </button>
        <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()}>
          {t('importExcel')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={(e) => onImportFileSelected(e.target.files?.[0])}
        />
        <button className="btn btn-primary" onClick={openAdd}>
          + {t('addProduct')}
        </button>
      </div>

      {importSummary && (
        <div className="card" style={{ marginBottom: 14, background: 'var(--surface-container-high)' }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', fontSize: '0.9rem' }}>
            <strong>{t('importSummary')}:</strong>
            <span>✅ {importSummary.created} {t('importCreated')}</span>
            <span>🔄 {importSummary.updated} {t('importUpdated')}</span>
            {importSummary.skipped > 0 && <span>⚠️ {importSummary.skipped} {t('importSkipped')}</span>}
            <button className="btn btn-outline btn-sm" onClick={() => setImportSummary(null)}>
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
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
                  <th>{t('shelfLife')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{catName(p.categoryId)}</td>
                    <td>
                      {p.defaultShelfLifeValue} {p.defaultShelfLifeUnit ? t(p.defaultShelfLifeUnit) : ''}
                    </td>
                    <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => navigate('batches', { productId: p.id })}
                      >
                        {t('batches')}
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>
                        {t('edit')}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>
                        {t('delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-cards">
            {filtered.map((p) => (
              <div className="record-card" key={p.id}>
                <div className="record-card-header">
                  <div className="record-card-title">{p.name}</div>
                </div>
                <div className="record-card-row">
                  <span>{t('category')}</span>
                  <span>{catName(p.categoryId)}</span>
                </div>
                <div className="record-card-row">
                  <span>{t('shelfLife')}</span>
                  <span>
                    {p.defaultShelfLifeValue} {p.defaultShelfLifeUnit ? t(p.defaultShelfLifeUnit) : ''}
                  </span>
                </div>
                <div className="record-card-actions">
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => navigate('batches', { productId: p.id })}
                  >
                    {t('batches')}
                  </button>
                  <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => openEdit(p)}>
                    {t('edit')}
                  </button>
                  <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => remove(p)}>
                    {t('delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <Modal title={editing ? t('edit') : t('addProduct')} onClose={() => setShowModal(false)}>
          <div className="form-grid">
            <div className="form-field">
              <label>{t('name')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-field">
              <label>{t('category')}</label>
              <Autocomplete
                value={categoryId}
                onChange={setCategoryId}
                options={categories.map((c) => ({ value: c.id, label: lang === 'ar' ? c.nameAr || c.name : c.name }))}
                placeholder={lang === 'ar' ? 'اختر الفئة' : 'Select category'}
              />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'مدة الصلاحية الافتراضية' : 'Default Shelf Life'}</label>
              <input type="number" min={1} value={slValue} onChange={(e) => setSlValue(Number(e.target.value))} />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'الوحدة' : 'Unit'}</label>
              <select value={slUnit} onChange={(e) => setSlUnit(e.target.value as ShelfLifeUnit)}>
                <option value="days">{t('days')}</option>
                <option value="months">{t('months')}</option>
                <option value="years">{t('years')}</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setShowModal(false)}>
              {t('cancel')}
            </button>
            <button className="btn btn-primary" onClick={save}>
              {t('save')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
