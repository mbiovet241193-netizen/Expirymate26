// Real Excel (.xlsx) import/export for the centralized Products database.
// Column order is fixed and read by position (not by header text), so the
// sheet works correctly regardless of whether headers are Arabic or English.
//
// Columns: 1) Product Name  2) Category  3) Shelf Life Value  4) Shelf Life Unit

import * as XLSX from 'xlsx';
import type { Category, Product, ShelfLifeUnit } from '../types';

const HEADER_ROW = ['Product Name / اسم المنتج', 'Category / الفئة', 'Shelf Life Value / قيمة الصلاحية', 'Shelf Life Unit / وحدة الصلاحية (days/months/years)'];

function categoryLabel(categories: Category[], categoryId: string, lang: 'ar' | 'en'): string {
  const c = categories.find((c) => c.id === categoryId);
  if (!c) return '';
  return lang === 'ar' ? c.nameAr || c.name : c.name;
}

function unitLabel(unit: ShelfLifeUnit | undefined, lang: 'ar' | 'en'): string {
  const value = unit ?? 'months';
  if (lang === 'ar') {
    return value === 'days' ? 'أيام' : value === 'years' ? 'سنوات' : 'أشهر';
  }
  return value;
}

/** Exports all products to a downloadable .xlsx workbook. */
export function exportProductsToExcel(products: Product[], categories: Category[], lang: 'ar' | 'en'): void {
  const rows = [
    HEADER_ROW,
    ...products.map((p) => [p.name, categoryLabel(categories, p.categoryId, lang), p.defaultShelfLifeValue ?? '', unitLabel(p.defaultShelfLifeUnit, lang)])
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 16 }, { wch: 20 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Products');
  XLSX.writeFile(workbook, `products-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function normalizeUnit(raw: string): ShelfLifeUnit {
  const v = raw.trim().toLowerCase();
  if (v.includes('day') || v.includes('يوم') || v.includes('أيام') || v.includes('ايام')) return 'days';
  if (v.includes('year') || v.includes('سنة') || v.includes('سنوات')) return 'years';
  return 'months'; // default / covers 'month', 'شهر', 'أشهر', 'اشهر'
}

function findCategoryId(categories: Category[], raw: string): string | null {
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  const match = categories.find((c) => c.name.toLowerCase() === key || (c.nameAr ?? '').toLowerCase() === key);
  return match ? match.id : null;
}

export interface ParsedProductRow {
  name: string;
  categoryId: string;
  shelfLifeValue: number;
  shelfLifeUnit: ShelfLifeUnit;
}

/** Reads an uploaded .xlsx file into parsed product rows, skipping the header row and any row with no product name. */
export async function parseProductsExcelFile(file: File, categories: Category[]): Promise<ParsedProductRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

  const fallbackCategoryId = categories[0]?.id ?? '';
  const result: ParsedProductRow[] = [];

  rows.forEach((row, index) => {
    if (index === 0) return; // skip header row
    const name = String(row[0] ?? '').trim();
    if (!name) return; // skip empty rows
    const categoryRaw = String(row[1] ?? '');
    const shelfLifeValueRaw = row[2];
    const unitRaw = String(row[3] ?? '');

    const categoryId = findCategoryId(categories, categoryRaw) ?? fallbackCategoryId;
    const shelfLifeValue = Number(shelfLifeValueRaw);
    result.push({
      name,
      categoryId,
      shelfLifeValue: Number.isFinite(shelfLifeValue) && shelfLifeValue > 0 ? shelfLifeValue : 1,
      shelfLifeUnit: normalizeUnit(unitRaw)
    });
  });

  return result;
}
