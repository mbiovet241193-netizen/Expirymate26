import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { NonConformingRepo, ReportRepo, ProductRepo, CategoryRepo } from '../db/repositories';
import { generateId } from '../db/db';
import type { Category, NonConformingDecision, NonConformingRecord, Product } from '../types';
import DateInput from '../components/common/DateInput';
import Modal from '../components/common/Modal';
import Autocomplete from '../components/common/Autocomplete';
import { exportToCsv } from '../utils/export';

const DECISIONS: NonConformingDecision[] = ['disposal', 'returned', 'rejected', 'pending'];

const DECISION_LABELS: Record<NonConformingDecision, { ar: string; en: string }> = {
  disposal: { ar: 'إعدام', en: 'Disposal' },
  returned: { ar: 'مرتجع', en: 'Returned' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
  pending: { ar: 'قيد القرار', en: 'Pending Decision' }
};

export default function NonConforming() {
  const { t, lang, settings } = useApp();
  const [records, setRecords] = useState<NonConformingRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<NonConformingRecord | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [decisionFilter, setDecisionFilter] = useState<NonConformingDecision | ''>('');

  const [showReportSetup, setShowReportSetup] = useState(false);
  const [setupSite, setSetupSite] = useState('');
  const [setupDoctor, setSetupDoctor] = useState('');
  const [setupDoctorCode, setSetupDoctorCode] = useState('');
  const [setupDate, setSetupDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [previewReport, setPreviewReport] = useState(false);
  const [savedToArchive, setSavedToArchive] = useState(false);

  const [productName, setProductName] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [decision, setDecision] = useState<NonConformingDecision>('pending');
  const [notes, setNotes] = useState('');

  const load = async () => {
    setRecords(await NonConformingRepo.all());
    setProducts(await ProductRepo.all());
    setCategories(await CategoryRepo.all());
  };
  useEffect(() => {
    load();
  }, []);

  const catNameForProduct = (productId?: string) => {
    if (!productId) return '—';
    const p = products.find((pr) => pr.id === productId);
    if (!p) return '—';
    const c = categories.find((cat) => cat.id === p.categoryId);
    if (!c) return '—';
    return lang === 'ar' ? c.nameAr || c.name : c.name;
  };

  const visibleRecords = useMemo(() => {
    let list = records;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((r) => r.productName.toLowerCase().includes(q));
    }
    if (decisionFilter) {
      list = list.filter((r) => r.decision === decisionFilter);
    }
    return list;
  }, [records, searchQuery, decisionFilter]);

  const openAdd = () => {
    setEditing(null);
    setProductName('');
    setDate(new Date().toISOString().slice(0, 10));
    setReason('');
    setDecision('pending');
    setNotes('');
    setShowModal(true);
  };

  const openEdit = (r: NonConformingRecord) => {
    setEditing(r);
    setProductName(r.productName);
    setDate(r.date);
    setReason(r.reason);
    setDecision(r.decision);
    setNotes(r.notes ?? '');
    setShowModal(true);
  };

  const save = async () => {
    if (!productName.trim()) return;
    const rec: NonConformingRecord = editing
      ? { ...editing, productName, date, reason, decision, notes }
      : { id: generateId(), productName, date, reason, decision, notes, createdAt: new Date().toISOString() };
    await NonConformingRepo.save(rec);
    setShowModal(false);
    load();
  };

  const remove = async (r: NonConformingRecord) => {
    if (!confirm(lang === 'ar' ? 'هل تريد حذف هذا السجل؟' : 'Delete this record?')) return;
    await NonConformingRepo.remove(r.id);
    load();
  };

  const openReportSetup = () => {
    setSetupSite(settings.siteNames[0] ?? '');
    setSetupDoctor(settings.doctorName ?? '');
    setSetupDoctorCode(settings.doctorCode ?? '');
    setSetupDate(new Date().toISOString().slice(0, 10));
    setSavedToArchive(false);
    setShowReportSetup(true);
  };

  const openPreview = () => {
    setShowReportSetup(false);
    setSavedToArchive(false);
    setPreviewReport(true);
  };

  const saveToArchive = async () => {
    const dateLabel = new Date(setupDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US');
    await ReportRepo.save({
      id: generateId(),
      type: 'non_conforming',
      title: lang === 'ar' ? `تقرير المنتجات غير المطابقة - ${setupSite} - ${dateLabel}` : `Non-Conforming Report - ${setupSite} - ${dateLabel}`,
      createdAt: new Date().toISOString(),
      payload: {
        site: setupSite,
        doctorName: setupDoctor,
        doctorCode: setupDoctorCode,
        reportDate: setupDate,
        records: records.map((r) => ({
          productName: r.productName,
          category: catNameForProduct(r.productId),
          date: r.date,
          reason: r.reason,
          decision: DECISION_LABELS[r.decision][lang],
          notes: r.notes
        }))
      }
    });
    exportToCsv(
      'non-conforming-report',
      records.map((r) => ({
        Product: r.productName,
        Category: catNameForProduct(r.productId),
        Date: r.date,
        Reason: r.reason,
        Decision: DECISION_LABELS[r.decision][lang],
        Notes: r.notes
      }))
    );
    setSavedToArchive(true);
  };

  if (previewReport) {
    return (
      <div>
        <div className="toolbar no-print">
          <button className="btn btn-outline" onClick={() => setPreviewReport(false)}>
            {lang === 'ar' ? 'رجوع للتعديل' : 'Back to Edit'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={saveToArchive}>
              {lang === 'ar' ? 'حفظ في الأرشيف' : 'Save to Archive'}
            </button>
            <button className="btn btn-outline" onClick={() => window.print()}>
              🖨️ {t('print')}
            </button>
          </div>
        </div>

        {savedToArchive && (
          <div className="card no-print" style={{ marginBottom: 14, background: 'var(--surface-container-high)' }}>
            ✅ {lang === 'ar' ? 'تم حفظ التقرير في الأرشيف وتصديره.' : 'Report saved to the archive and exported.'}
          </div>
        )}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {settings.companyLogo && <img src={settings.companyLogo} alt="logo" style={{ height: 56 }} />}
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{settings.companyName || 'Company Name'}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>{setupSite}</div>
              </div>
            </div>
            <div style={{ textAlign: 'end' }}>
              <div style={{ fontWeight: 800 }}>{lang === 'ar' ? 'تقرير المنتجات غير المطابقة' : 'Non-Conforming Products Report'}</div>
              <div style={{ fontSize: '0.85rem' }}>{new Date(setupDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</div>
            </div>
          </div>

          <div className="form-grid" style={{ marginBottom: 18 }}>
            <div className="form-field">
              <label>{lang === 'ar' ? 'طبيب الجودة' : 'Quality Doctor'}</label>
              <div style={{ fontWeight: 700 }}>{setupDoctor || '—'}</div>
            </div>
            <div className="form-field">
              <label>{t('doctorCode')}</label>
              <div style={{ fontWeight: 700 }}>{setupDoctorCode || '—'}</div>
            </div>
          </div>

          {records.length === 0 ? (
            <div className="empty-state">{t('noData')}</div>
          ) : (
            <>
              <div className="desktop-only-table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('name')}</th>
                      <th>{t('category')}</th>
                      <th>{lang === 'ar' ? 'القرار' : 'Decision'}</th>
                      <th>{lang === 'ar' ? 'السبب' : 'Reason'}</th>
                      <th>{lang === 'ar' ? 'ملاحظات' : 'Notes'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={r.id}>
                        <td>{i + 1}</td>
                        <td>{r.productName}</td>
                        <td>{catNameForProduct(r.productId)}</td>
                        <td>{DECISION_LABELS[r.decision][lang]}</td>
                        <td>{r.reason}</td>
                        <td>{r.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mobile-cards no-print">
                {records.map((r, i) => (
                  <div className="record-card" key={r.id}>
                    <div className="record-card-header">
                      <div className="record-card-title">
                        {i + 1}. {r.productName}
                      </div>
                      <span className="badge" style={{ background: 'var(--secondary-container)', color: 'var(--on-surface)' }}>
                        {DECISION_LABELS[r.decision][lang]}
                      </span>
                    </div>
                    <div className="record-card-row">
                      <span>{t('category')}</span>
                      <span>{catNameForProduct(r.productId)}</span>
                    </div>
                    {r.reason && (
                      <div className="record-card-row">
                        <span>{lang === 'ar' ? 'السبب' : 'Reason'}</span>
                        <span>{r.reason}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 60 }}>
            <div style={{ borderTop: '1px solid var(--outline)', width: 200, paddingTop: 6 }}>
              {lang === 'ar' ? 'توقيع طبيب الجودة' : 'Quality Doctor Signature'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <div />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={openReportSetup} disabled={records.length === 0}>
            {t('generateReport')}
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            + {lang === 'ar' ? 'إضافة سجل' : 'Add Record'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="form-grid">
          <div className="form-field">
            <label>{lang === 'ar' ? 'بحث' : 'Search'}</label>
            <input
              placeholder={lang === 'ar' ? 'ابحث باسم المنتج...' : 'Search by product name...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>{lang === 'ar' ? 'القرار' : 'Decision'}</label>
            <select value={decisionFilter} onChange={(e) => setDecisionFilter(e.target.value as NonConformingDecision | '')}>
              <option value="">{lang === 'ar' ? 'كل القرارات' : 'All Decisions'}</option>
              {DECISIONS.map((d) => (
                <option key={d} value={d}>
                  {DECISION_LABELS[d][lang]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {visibleRecords.length === 0 ? (
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
                  <th>{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th>{lang === 'ar' ? 'السبب' : 'Reason'}</th>
                  <th>{lang === 'ar' ? 'القرار' : 'Decision'}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleRecords.map((r) => (
                  <tr key={r.id}>
                    <td>{r.productName}</td>
                    <td>{r.date}</td>
                    <td>{r.reason}</td>
                    <td>{DECISION_LABELS[r.decision][lang]}</td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>
                        {t('edit')}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(r)}>
                        {t('delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-cards">
            {visibleRecords.map((r) => (
              <div className="record-card" key={r.id}>
                <div className="record-card-header">
                  <div className="record-card-title">{r.productName}</div>
                  <span className="badge" style={{ background: 'var(--secondary-container)', color: 'var(--on-surface)' }}>
                    {DECISION_LABELS[r.decision][lang]}
                  </span>
                </div>
                <div className="record-card-row">
                  <span>{lang === 'ar' ? 'التاريخ' : 'Date'}</span>
                  <span>{r.date}</span>
                </div>
                <div className="record-card-row">
                  <span>{lang === 'ar' ? 'السبب' : 'Reason'}</span>
                  <span>{r.reason || '—'}</span>
                </div>
                <div className="record-card-actions">
                  <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => openEdit(r)}>
                    {t('edit')}
                  </button>
                  <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => remove(r)}>
                    {t('delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <Modal title={editing ? t('edit') : (lang === 'ar' ? 'إضافة سجل' : 'Add Record')} onClose={() => setShowModal(false)}>
          <div className="form-grid">
            <div className="form-field">
              <label>{t('name')}</label>
              <Autocomplete
                freeText
                value={productName}
                onChange={setProductName}
                options={products.map((p) => ({ value: p.id, label: p.name }))}
                placeholder={t('name')}
              />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'التاريخ' : 'Date'}</label>
              <DateInput value={date} onChange={setDate} />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>{lang === 'ar' ? 'السبب' : 'Reason'}</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'القرار' : 'Decision'}</label>
              <select value={decision} onChange={(e) => setDecision(e.target.value as NonConformingDecision)}>
                {DECISIONS.map((d) => (
                  <option key={d} value={d}>
                    {DECISION_LABELS[d][lang]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>{lang === 'ar' ? 'ملاحظات' : 'Notes'}</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
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

      {showReportSetup && (
        <Modal title={lang === 'ar' ? 'بيانات التقرير' : 'Report Details'} onClose={() => setShowReportSetup(false)}>
          <div className="form-grid">
            <div className="form-field">
              <label>{lang === 'ar' ? 'الموقع' : 'Site'}</label>
              <Autocomplete
                value={setupSite}
                onChange={setSetupSite}
                allowEmptyOption={{ value: '', label: lang === 'ar' ? '— اختر —' : '— Select —' }}
                options={settings.siteNames.map((n) => ({ value: n, label: n }))}
                placeholder={lang === 'ar' ? '— اختر —' : '— Select —'}
              />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'طبيب الجودة' : 'Quality Doctor'}</label>
              <input value={setupDoctor} onChange={(e) => setSetupDoctor(e.target.value)} />
            </div>
            <div className="form-field">
              <label>{t('doctorCode')}</label>
              <input value={setupDoctorCode} onChange={(e) => setSetupDoctorCode(e.target.value)} />
            </div>
            <div className="form-field">
              <label>{lang === 'ar' ? 'تاريخ التقرير' : 'Report Date'}</label>
              <DateInput value={setupDate} onChange={setSetupDate} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setShowReportSetup(false)}>
              {t('cancel')}
            </button>
            <button className="btn btn-primary" onClick={openPreview}>
              {lang === 'ar' ? 'معاينة التقرير' : 'Preview Report'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
