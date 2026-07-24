import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface AutocompleteOption {
  value: string;
  label: string;
  /** Optional secondary line shown under the label (e.g. job title, category) */
  sublabel?: string;
}

interface AutocompleteProps {
  options: AutocompleteOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  noResultsText?: string;
  disabled?: boolean;
  /** Shown as the first selectable row (e.g. "All Categories"). Pass value: '' */
  allowEmptyOption?: AutocompleteOption;
  /**
   * When true, the field behaves like a text input with suggestions instead of a
   * closed-set selector: `value` is the raw typed text (not an option id), every
   * keystroke calls onChange with that text, and picking a suggestion fills the
   * text with its label. Used where free text entry must be preserved
   * (e.g. typing a new product name that doesn't exist yet).
   */
  freeText?: boolean;
}

/**
 * Reusable searchable autocomplete field, meant as a drop-in replacement for
 * native <select> and <input list="..."> dropdowns across the app.
 *
 * - Type-ahead filtering (case-insensitive, matches anywhere in label/sublabel)
 * - Keyboard navigation (Up/Down/Enter/Escape)
 * - Touch-friendly on mobile
 * - Pure UI component: caller still owns the selected value/state
 */
export default function Autocomplete({
  options,
  value,
  onChange,
  placeholder,
  emptyText,
  noResultsText,
  disabled,
  allowEmptyOption,
  freeText
}: AutocompleteProps) {
  const allOptions = allowEmptyOption ? [allowEmptyOption, ...options] : options;
  const selected = allOptions.find((o) => o.value === value);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the visible text in sync with the externally-controlled value.
  useEffect(() => {
    if (freeText) {
      setQuery(value ?? '');
    } else if (!open) {
      setQuery(selected?.label ?? '');
    }
  }, [value, open, selected?.label, freeText]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || (!freeText && query === selected?.label)) return allOptions;
    return allOptions.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.sublabel ?? '').toLowerCase().includes(q)
    );
  }, [query, allOptions, selected?.label, freeText]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (!freeText) setQuery(selected?.label ?? '');
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.label, freeText]);

  const commit = (opt: AutocompleteOption) => {
    onChange(freeText ? opt.label : opt.value);
    setQuery(opt.label);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) commit(opt);
    } else if (e.key === 'Escape') {
      setOpen(false);
      if (!freeText) setQuery(selected?.label ?? '');
    }
  };

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${highlight}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  return (
    <div className="autocomplete" ref={rootRef}>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        disabled={disabled}
        placeholder={placeholder}
        value={query}
        onFocus={() => {
          setOpen(true);
          if (!freeText) setQuery('');
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (freeText) onChange(e.target.value);
        }}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <div className="autocomplete-list" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="autocomplete-empty">{noResultsText ?? emptyText ?? '—'}</div>
          ) : (
            filtered.map((opt, idx) => (
              <div
                key={opt.value || `empty-${idx}`}
                data-idx={idx}
                className={`autocomplete-option${idx === highlight ? ' is-highlighted' : ''}${
                  opt.value === value ? ' is-selected' : ''
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(opt);
                }}
                onMouseEnter={() => setHighlight(idx)}
              >
                <div className="autocomplete-option-label">{opt.label}</div>
                {opt.sublabel && <div className="autocomplete-option-sublabel">{opt.sublabel}</div>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
