import React, { useEffect, useState } from 'react';

function isoToDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

function displayToIso(display: string): string | null {
  const match = display.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  const year = match[3];
  const dayNum = Number(day);
  const monthNum = Number(month);
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return null;
  return `${year}-${month}-${day}`;
}

/** Auto-inserts "/" separators as the user types digits, e.g. "0108202" -> "01/08/202". */
function autoMask(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '').slice(0, 8);
  let out = '';
  if (digits.length > 0) out += digits.slice(0, 2);
  if (digits.length > 2) out += '/' + digits.slice(2, 4);
  if (digits.length > 4) out += '/' + digits.slice(4, 8);
  return out;
}

/**
 * Hybrid date input used everywhere a date is entered in QualityMate.
 *
 * Provides BOTH:
 *  - Manual typing, in DD/MM/YYYY format with automatic "/" insertion.
 *  - A calendar picker, via a transparent native <input type="date"> placed
 *    directly over the calendar icon. The tap lands on the real native date
 *    input (not a simulated click), so the OS/browser's genuine calendar UI
 *    opens reliably on every platform (Android, iOS, desktop) — including
 *    devices where a plain <input type="date"> only offers a picker with no
 *    typing option.
 *
 * The value/onChange contract is identical to a plain native date input
 * (ISO format YYYY-MM-DD both ways), so it is a drop-in replacement anywhere
 * `<input type="date" value={x} onChange={(e) => setX(e.target.value)} />`
 * was used before.
 */
export default function DateInput({
  value,
  onChange,
  placeholder = 'DD/MM/YYYY',
  id
}: {
  value: string;
  onChange: (isoValue: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const [text, setText] = useState(isoToDisplay(value));

  useEffect(() => {
    setText(isoToDisplay(value));
  }, [value]);

  const handleTextChange = (raw: string) => {
    const masked = autoMask(raw);
    setText(masked);
    const iso = displayToIso(masked);
    if (iso) onChange(iso);
  };

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        style={{ flex: 1 }}
      />
      <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
        <div
          className="icon-btn"
          style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}
          aria-hidden="true"
        >
          📅
        </div>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={placeholder}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0, padding: 0 }}
        />
      </div>
    </div>
  );
}
