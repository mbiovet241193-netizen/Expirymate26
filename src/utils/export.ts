// Export helpers. Excel export is implemented as UTF-8 CSV (opens natively
// in Excel/Google Sheets) to avoid pulling in any external/binary XLSX
// dependency, keeping the app 100% offline and dependency-light.
// True .xlsx and PDF export are natural follow-ups noted in the About page.

export function exportToCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (rows.length === 0) {
    rows = [{ info: 'no data' }];
  }
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.join(',')].concat(
    rows.map((row) => headers.map((h) => escape(row[h])).join(','))
  );
  // BOM for correct UTF-8 (Arabic) rendering in Excel
  const csv = '\uFEFF' + lines.join('\r\n');
  downloadBlob(csv, filename.endsWith('.csv') ? filename : `${filename}.csv`, 'text/csv;charset=utf-8;');
}

export function downloadJson(filename: string, data: unknown): void {
  const json = JSON.stringify(data, null, 2);
  downloadBlob(json, filename.endsWith('.json') ? filename : `${filename}.json`, 'application/json');
}

function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function readJsonFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string));
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
