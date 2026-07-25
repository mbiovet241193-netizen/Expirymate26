import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { CategoryRepo, ReceivingRepo, ReportRepo, ProductRepo, BatchRepo } from '../db/repositories';
import { generateId } from '../db/db';
import type { Category, Product, ReceivingRow, ReceivingSession, ShelfLifeUnit } from '../types';
import { calculateExpiry, computeBatchStatus } from '../engine/shelfLifeEngine';
import StatusBadge from '../components/common/StatusBadge';
import Autocomplete from '../components/common/Autocomplete';
import { exportToCsv } from '../utils/export';

export default function ReceivingRegister() {
  const { t, lang, settings } = useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [siteName, setSiteName] = useState(settings.siteNames[0] ?? '');
  const [supplierName, setSupplierName] = useState(settings.supplierList[0] ?? '');
  const [receivingDate, setReceivingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [receivingTime, setReceivingTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [doctorName, setDoctorName] = useState(settings.doctorName);
  const [doctorCode, setDoctorCode] = useState(settings.doctorCode);
  const [vehicleTemp, setVehicleTemp] = useState('');

  const [rows, setRows] = useState<ReceivingRow[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [addToFollowUp, setAddToFollowUp] = useState(false);
  const [followUpSummary, setFollowUpSummary] = useState<{ created: number; skipped: number } | null>(null);

  useEffect(() => {
    (async () => {
      setCategories(await CategoryRepo.all());
      setProducts(await ProductRepo.all());
    })();
  }, []);

  const addRow = () => {
    setRows((r) => [
      ...r,
      {
        id: generateId(),
        productId: undefined,
        productName: '',
        categoryId: categories[0]?.id ?? '',
        productionDate: new Date().toISOString().slice(0, 10),
        shelfLifeValue: 6,
        shelfLifeUnit: 'months',
        expiryDate: '',
        halfLifeDate: '',
        status: 'before_half',
        productTemp: '',
        notes: ''
      }
    ]);
  };

  const updateRow = (id: string, patch: Partial<ReceivingRow>) => {
    setRows((rs) =>
      rs.map((row) => {
        if (row.id !== id) return row;
        const merged = { ...row, ...patch };
        if (merged.productionDate && merged.shelfLifeValue) {
          const calc = calculateExpiry({
            productionDate: merged.productionDate,
            shelfLifeValue: merged.shelfLifeValue,
            shelfLifeUnit: merged.shelfLifeUnit
          });
          merged.expiryDate = calc.expiryDate;
          merged.halfLifeDate = calc.halfLifeDate;
          merged.status = computeBatchStatus(merged.productionDate, calc.expiryDate, calc.halfLifeDate).status;
        }
        return merged;
      })
    );
  };

  const onProductNameChange = (id: string, name: string) => {
    const match = products.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (match) {
      updateRow(id, {
        productId: match.id,
        productName: name,
        categoryId: match.categoryId,
        shelfLifeValue: match.defaultShelfLifeValue ?? 6,
        shelfLifeUnit: match.defaultShelfLifeUnit ?? 'months'
      });
    } else {
      updateRow(id, { productId: undefined, productName: name });
    }
  };

  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));

  const catName = (id: string) => {
    const c = categories.find((c) => c.id === id);
    if (!c) return '—';
    return lang === 'ar' ? c.nameAr || c.name : c.name;
  };

  const saveSession = async () => {
    const session: ReceivingSession = {
      id: generateId(),
      siteName,
      supplierName,
      receivingDate,
      receivingTime,
      doctorName,
      doctorCode,
      vehicleTemp,
      rows,
      createdAt: new Date().toISOString()
    };
    await ReceivingRepo.save(session);
    await ReportRepo.save({
      id: generateId(),
      type: 'receiving',
      title: `${lang === 'ar' ? 'تقرير استلام' : 'Receiving Report'} - ${siteName} - ${receivingDate}`,
      createdAt: new Date().toISOString(),
      payload: session
    });

    if (addToFollowUp) {
      let created = 0;
      let skipped = 0;
      for (const row of rows) {
        if (!row.productId || !row.productionDate || !row.expiryDate) {
          skipped++;
          continue;
        }
        await BatchRepo.save({
          id: generateId(),
          productId: row.productId,
          productionDate: row.productionDate,
          shelfLifeValue: row.shelfLifeValue,
          shelfLifeUnit: row.shelfLifeUnit,
          expiryDate: row.expiryDate,
          halfLifeDate: row.halfLifeDate,
          createdAt: new Date().toISOString()
        });
        created++;
      }
      setFollowUpSummary({ created, skipped });
    } else {
      setFollowUpSummary(null);
    }

    setShowReport(true);
  };

  const exportCsv = () => {
    exportToCsv(
      `receiving-${receivingDate}`,
      rows.map((r) => ({
        Product: r.productName,
        Category: catName(r.categoryId),
        ProductionDate: r.productionDate,
        ShelfLife: `${r.shelfLifeValue} ${r.shelfLifeUnit}`,
        ExpiryDate: r.expiryDate,
        HalfLife: r.halfLifeDate,
        Status: r.status,
        VehicleTemp: vehicleTemp,
        ProductTemp: r.productTemp,
        Notes: r.notes
      }))
    );
  };

  if (showReport) {
    return (
      <div>
        {addToFollowUp && followUpSummary && (
          <div className="card no-print" style={{ marginBottom: 14, background: 'var(--surface-container-high)' }}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', fontSize: '0.9rem' }}>
              <strong>{lang === 'ar' ? 'ملخص متابعة الصلاحية' : 'Expiry Follow-up Summary'}:</strong>
              <span>✅ {followUpSummary.created} {lang === 'ar' ? 'سجل تمت إضافته' : 'records added'}</span>
              {followUpSummary.skipped > 0 && (
                <span>⚠️ {followUpSummary.skipped} {lang === 'ar' ? 'صف تم تجاهله (بدون منتج مسجل)' : 'rows skipped (no matching product)'}</span>
              )}
            </div>
          </div>
        )}
        <ReceivingPrintReport
          session={{ siteName, supplierName, receivingDate, receivingTime, doctorName, doctorCode, vehicleTemp, rows }}
          catName={catName}
          onBack={() => setShowReport(false)}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2 className="section-title">{lang === 'ar' ? 'بيانات عامة' : 'General Information'}</h2>
        <div className="form-grid">
          <div className="form-field">
            <label>{t('siteName')}</label>
            <Autocomplete
              freeText
              value={siteName}
              onChange={setSiteName}
              options={settings.siteNames.map((n) => ({ value: n, label: n }))}
            />
          </div>
          <div className="form-field">
            <label>{t('supplier')}</label>
            <Autocomplete
              freeText
              value={supplierName}
              onChange={setSupplierName}
              options={settings.supplierList.map((n) => ({ value: n, label: n }))}
            />
          </div>
          <div className="form-field">
            <label>{lang === 'ar' ? 'تاريخ الاستلام' : 'Receiving Date'}</label>
            <input type="date" value={receivingDate} onChange={(e) => setReceivingDate(e.target.value)} />
          </div>
          <div className="form-field">
            <label>{lang === 'ar' ? 'وقت الاستلام' : 'Receiving Time'}</label>
            <input type="time" value={receivingTime} onChange={(e) => setReceivingTime(e.target.value)} />
          </div>
          <div className="form-field">
            <label>{t('doctorName')}</label>
            <input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
          </div>
          <div className="form-field">
            <label>{t('doctorCode')}</label>
            <input value={doctorCode} onChange={(e) => setDoctorCode(e.target.value)} />
          </div>
          <div className="form-field">
            <label>{lang === 'ar' ? 'حرارة السيارة' : 'Vehicle Temperature'}</label>
            <input value={vehicleTemp} onChange={(e) => setVehicleTemp(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="toolbar" style={{ marginTop: 18 }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          {lang === 'ar' ? 'جدول الاستلام' : 'Receiving Table'}
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={addRow}>
            + {lang === 'ar' ? 'إضافة صف' : 'Add Row'}
          </button>
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer', fontSize: '0.9rem' }}>
        <input type="checkbox" checked={addToFollowUp} onChange={(e) => setAddToFollowUp(e.target.checked)} />
        {lang === 'ar' ? 'إضافة المنتجات المستلمة إلى متابعة الصلاحية' : 'Add received products to Expiry Follow-up'}
      </label>

      <div className="card desktop-only-table">
        {rows.length === 0 ? (
          <div className="empty-state">{t('noData')}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('name')}</th>
                <th>{t('category')}</th>
                <th>{t('productionDate')}</th>
                <th>{t('shelfLife')}</th>
                <th>{t('expiryDate')}</th>
                <th>{t('status')}</th>
                <th>{lang === 'ar' ? 'حرارة المنتج' : 'Product Temp'}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Autocomplete
                      freeText
                      value={row.productName}
                      onChange={(name) => onProductNameChange(row.id, name)}
                      options={products.map((p) => ({ value: p.id, label: p.name }))}
                      placeholder={t('name')}
                    />
                  </td>
                  <td>
                    <Autocomplete
                      value={row.categoryId}
                      onChange={(v) => updateRow(row.id, { categoryId: v })}
                      options={categories.map((c) => ({ value: c.id, label: catName(c.id) }))}
                    />
                  </td>
                  <td>
                    <input type="date" value={row.productionDate} onChange={(e) => updateRow(row.id, { productionDate: e.target.value })} />
                  </td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    <input
                      type="number"
                      style={{ width: 60 }}
                      value={row.shelfLifeValue}
                      onChange={(e) => updateRow(row.id, { shelfLifeValue: Number(e.target.value) })}
                    />
                    <select
                      value={row.shelfLifeUnit}
                      onChange={(e) => updateRow(row.id, { shelfLifeUnit: e.target.value as ShelfLifeUnit })}
                    >
                      <option value="days">{t('days')}</option>
                      <option value="months">{t('months')}</option>
                      <option value="years">{t('years')}</option>
                    </select>
                  </td>
                  <td>{row.expiryDate}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>
                    <input style={{ width: 70 }} value={row.productTemp} onChange={(e) => updateRow(row.id, { productTemp: e.target.value })} />
                  </td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => removeRow(row.id)}>
                      {t('delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="card mobile-cards">
          <div className="empty-state">{t('noData')}</div>
        </div>
      ) : (
        <div className="mobile-cards">
          {rows.map((row) => (
            <div className="record-card" key={row.id}>
              <div className="record-card-header">
                <StatusBadge status={row.status} />
                <button className="btn btn-danger btn-sm" onClick={() => removeRow(row.id)}>
                  {t('delete')}
                </button>
              </div>
              <div className="form-field">
                <label>{t('name')}</label>
                <Autocomplete
                  freeText
                  value={row.productName}
                  onChange={(name) => onProductNameChange(row.id, name)}
                  options={products.map((p) => ({ value: p.id, label: p.name }))}
                  placeholder={t('name')}
                />
              </div>
              <div className="form-field">
                <label>{t('category')}</label>
                <Autocomplete
                  value={row.categoryId}
                  onChange={(v) => updateRow(row.id, { categoryId: v })}
                  options={categories.map((c) => ({ value: c.id, label: catName(c.id) }))}
                />
              </div>
              <div className="form-field">
                <label>{t('productionDate')}</label>
                <input type="date" value={row.productionDate} onChange={(e) => updateRow(row.id, { productionDate: e.target.value })} />
              </div>
              <div className="form-field">
                <label>{t('shelfLife')}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    style={{ flex: 1 }}
                    value={row.shelfLifeValue}
                    onChange={(e) => updateRow(row.id, { shelfLifeValue: Number(e.target.value) })}
                  />
                  <select
                    style={{ flex: 1 }}
                    value={row.shelfLifeUnit}
                    onChange={(e) => updateRow(row.id, { shelfLifeUnit: e.target.value as ShelfLifeUnit })}
                  >
                    <option value="days">{t('days')}</option>
                    <option value="months">{t('months')}</option>
                    <option value="years">{t('years')}</option>
                  </select>
                </div>
              </div>
              <div className="record-card-row">
                <span>{t('expiryDate')}</span>
                <span>{row.expiryDate}</span>
              </div>
              <div className="form-field">
                <label>{lang === 'ar' ? 'حرارة المنتج' : 'Product Temp'}</label>
                <input value={row.productTemp} onChange={(e) => updateRow(row.id, { productTemp: e.target.value })} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
        <button className="btn btn-outline" onClick={exportCsv} disabled={rows.length === 0}>
          {t('exportExcel')}
        </button>
        <button className="btn btn-primary" onClick={saveSession} disabled={rows.length === 0}>
          {t('generateReport')}
        </button>
      </div>
    </div>
  );
}

function ReceivingPrintReport({
  session,
  catName,
  onBack
}: {
  session: Omit<ReceivingSession, 'id' | 'createdAt'>;
  catName: (id: string) => string;
  onBack: () => void;
}) {
  const { t, lang, settings } = useApp();
  return (
    <div>
      <div className="toolbar no-print">
        <button className="btn btn-outline" onClick={onBack}>
          {lang === 'ar' ? 'رجوع للتعديل' : 'Back to Edit'}
        </button>
        <button className="btn btn-primary" onClick={() => window.print()}>
          🖨️ {t('print')}
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {settings.companyLogo && <img src={settings.companyLogo} alt="logo" style={{ height: 56 }} />}
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{settings.companyName || 'Company Name'}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>{session.siteName}</div>
            </div>
          </div>
          <div style={{ textAlign: 'end' }}>
            <div style={{ fontWeight: 800 }}>{lang === 'ar' ? 'تقرير استلام' : 'Receiving Report'}</div>
            <div style={{ fontSize: '0.85rem' }}>
              {session.receivingDate} — {session.receivingTime}
            </div>
          </div>
        </div>

        <div className="form-grid" style={{ marginBottom: 18 }}>
          <Field label={t('supplier')} value={session.supplierName} />
          <Field label={t('doctorName')} value={session.doctorName} />
          <Field label={t('doctorCode')} value={session.doctorCode} />
          <Field label={lang === 'ar' ? 'حرارة السيارة' : 'Vehicle Temperature'} value={session.vehicleTemp || '—'} />
        </div>

        <div className="desktop-only-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('name')}</th>
                <th>{t('category')}</th>
                <th>{t('productionDate')}</th>
                <th>{t('expiryDate')}</th>
                <th>{t('status')}</th>
                <th>{lang === 'ar' ? 'حرارة المنتج' : 'Product Temp'}</th>
                <th>{lang === 'ar' ? 'ملاحظات' : 'Notes'}</th>
              </tr>
            </thead>
            <tbody>
              {session.rows.map((r, i) => (
                <tr key={r.id}>
                  <td>{i + 1}</td>
                  <td>{r.productName}</td>
                  <td>{catName(r.categoryId)}</td>
                  <td>{r.productionDate}</td>
                  <td>{r.expiryDate}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>{r.productTemp}</td>
                  <td>{r.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-cards no-print">
          {session.rows.map((r, i) => (
            <div className="record-card" key={r.id}>
              <div className="record-card-header">
                <div className="record-card-title">
                  {i + 1}. {r.productName}
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="record-card-row">
                <span>{t('category')}</span>
                <span>{catName(r.categoryId)}</span>
              </div>
              <div className="record-card-row">
                <span>{t('productionDate')}</span>
                <span>{r.productionDate}</span>
              </div>
              <div className="record-card-row">
                <span>{t('expiryDate')}</span>
                <span>{r.expiryDate}</span>
              </div>
              {r.productTemp && (
                <div className="record-card-row">
                  <span>{lang === 'ar' ? 'حرارة المنتج' : 'Product Temp'}</span>
                  <span>{r.productTemp}</span>
                </div>
              )}
              {r.notes && (
                <div className="record-card-row">
                  <span>{lang === 'ar' ? 'ملاحظات' : 'Notes'}</span>
                  <span>{r.notes}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 60 }}>
          <div>
            <div style={{ borderTop: '1px solid var(--outline)', width: 200, paddingTop: 6 }}>
              {lang === 'ar' ? 'توقيع طبيب الجودة' : 'Quality Doctor Signature'}
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>{lang === 'ar' ? 'صفحة 1' : 'Page 1'}</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <div style={{ fontWeight: 700 }}>{value || '—'}</div>
    </div>
  );
}
