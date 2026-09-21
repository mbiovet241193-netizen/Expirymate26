import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { CategoryRepo, ProductRepo, ActivityLogRepo } from '../db/repositories';
import { generateId } from '../db/db';
import type { Category } from '../types';
import Modal from '../components/common/Modal';

export default function Categories() {
  const { t, lang } = useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');

  const load = async () => setCategories(await CategoryRepo.all());
  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setNameAr('');
    setShowModal(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setName(c.name);
    setNameAr(c.nameAr ?? '');
    setShowModal(true);
  };

  const save = async () => {
    if (!name.trim()) return;
    const cat: Category = editing
      ? { ...editing, name, nameAr }
      : { id: generateId(), name, nameAr, createdAt: new Date().toISOString() };
    await CategoryRepo.save(cat);
    if (!editing) await ActivityLogRepo.log('categoryAdded', name);
    setShowModal(false);
    load();
  };

  const remove = async (c: Category) => {
    const products = await ProductRepo.all();
    const inUse = products.some((p) => p.categoryId === c.id);
    if (inUse) {
      alert(
        lang === 'ar'
          ? 'لا يمكن حذف الفئة لأنها مستخدمة في منتجات موجودة.'
          : 'Cannot delete this category — it is in use by existing products.'
      );
      return;
    }
    if (!confirm(lang === 'ar' ? 'هل تريد حذف هذه الفئة؟' : 'Delete this category?')) return;
    await CategoryRepo.remove(c.id);
    load();
  };

  return (
    <div>
      <div className="toolbar">
        <div />
        <button className="btn btn-primary" onClick={openAdd}>
          + {t('addCategory')}
        </button>
      </div>

      {categories.length === 0 ? (
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
                  <th>{lang === 'ar' ? 'الاسم بالإنجليزية' : 'Arabic Name'}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td>{lang === 'ar' ? c.nameAr || c.name : c.name}</td>
                    <td>{lang === 'ar' ? c.name : c.nameAr || '—'}</td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>
                        {t('edit')}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(c)}>
                        {t('delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-cards">
            {categories.map((c) => (
              <div className="record-card" key={c.id}>
                <div className="record-card-header">
                  <div className="record-card-title">{lang === 'ar' ? c.nameAr || c.name : c.name}</div>
                </div>
                <div className="record-card-row">
                  <span>{lang === 'ar' ? 'بالإنجليزية' : 'Arabic'}</span>
                  <span>{lang === 'ar' ? c.name : c.nameAr || '—'}</span>
                </div>
                <div className="record-card-actions">
                  <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => openEdit(c)}>
                    {t('edit')}
                  </button>
                  <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => remove(c)}>
                    {t('delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <Modal title={editing ? t('edit') : t('addCategory')} onClose={() => setShowModal(false)}>
          <div className="form-grid">
            <div className="form-field">
              <label>{lang === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)'}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)'}</label>
              <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
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
