// Real Excel (.xlsx) import for the centralized Employee database (Health Certificates module).
// Columns are read by position: 1) Employee Code  2) Employee Name  3) Job Title
// Matching on import is by Employee Code (case-insensitive): existing code -> update, new code -> create.

import * as XLSX from 'xlsx';
import type { Employee } from '../types';

const HEADER_ROW = ['Employee Code / كود الموظف', 'Employee Name / اسم الموظف', 'Job Title / المسمى الوظيفي'];

/** Exports all employees to a downloadable .xlsx workbook. */
export function exportEmployeesToExcel(employees: Employee[]): void {
  const rows = [HEADER_ROW, ...employees.map((e) => [e.code, e.name, e.jobTitle])];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 24 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Employees');
  XLSX.writeFile(workbook, `employees-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export interface ParsedEmployeeRow {
  code: string;
  name: string;
  jobTitle: string;
}

/** Reads an uploaded .xlsx file into parsed employee rows, skipping the header row and any row with no employee code. */
export async function parseEmployeesExcelFile(file: File): Promise<ParsedEmployeeRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
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
    result.push({ code, name, jobTitle });
  });

  return result;
}
