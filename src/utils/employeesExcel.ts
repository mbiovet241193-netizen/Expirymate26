// Real Excel (.xlsx) import for the centralized Employee database (Health Certificates module).
// Columns are read by position:
//   1) Employee Code  2) Employee Name  3) Job Title
//   4) Health Certificate Expiry Date (optional)  5) Insurance Number (optional)  6) Mobile Phone (optional)
// Matching on import is by Employee Code (case-insensitive): existing code -> update, new code -> create.

import * as XLSX from 'xlsx';
import type { Employee } from '../types';

const HEADER_ROW = [
  'Employee Code / كود الموظف',
  'Employee Name / اسم الموظف',
  'Job Title / المسمى الوظيفي',
  'Health Certificate Expiry Date / تاريخ انتهاء الشهادة الصحية',
  'Insurance Number / رقم التأمين الطبي',
  'Mobile Phone / رقم الموبايل'
];

/** Exports all employees to a downloadable .xlsx workbook. */
export function exportEmployeesToExcel(employees: Employee[]): void {
  const rows = [
    HEADER_ROW,
    ...employees.map((e) => [e.code, e.name, e.jobTitle, e.healthCertExpiryDate ?? '', e.insuranceNumber ?? '', e.mobilePhone ?? ''])
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 24 }, { wch: 22 }, { wch: 20 }, { wch: 18 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Employees');
  XLSX.writeFile(workbook, `employees-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export interface ParsedEmployeeRow {
  code: string;
  name: string;
  jobTitle: string;
  healthCertExpiryDate?: string;
  insuranceNumber?: string;
  mobilePhone?: string;
}

/** Converts an Excel cell value (Date object, serial number, or string) to an ISO date string (YYYY-MM-DD). */
function toIsoDate(cell: unknown): string | undefined {
  if (cell === undefined || cell === null || cell === '') return undefined;
  if (cell instanceof Date && !isNaN(cell.getTime())) {
    return cell.toISOString().slice(0, 10);
  }
  const text = String(cell).trim();
  if (!text) return undefined;
  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return text; // keep as-is if it can't be parsed, rather than silently dropping it
}

/** Reads an uploaded .xlsx file into parsed employee rows, skipping the header row and any row with no employee code. */
export async function parseEmployeesExcelFile(file: File): Promise<ParsedEmployeeRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

  const result: ParsedEmployeeRow[] = [];
  rows.forEach((row, index) => {
    if (index === 0) return; // skip header row
    const code = String(row[0] ?? '').trim();
    if (!code) return; // skip empty rows
    const name = String(row[1] ?? '').trim();
    const jobTitle = String(row[2] ?? '').trim();
    const healthCertExpiryDate = toIsoDate(row[3]);
    const insuranceNumber = String(row[4] ?? '').trim() || undefined;
    const mobilePhone = String(row[5] ?? '').trim() || undefined;
    result.push({ code, name, jobTitle, healthCertExpiryDate, insuranceNumber, mobilePhone });
  });

  return result;
}
