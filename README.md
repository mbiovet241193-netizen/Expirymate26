# ExpiryMate

**Your Smart Quality Assistant** — مساعدك الذكي لإدارة الصلاحيات

A fully offline, installable Progressive Web App for Quality Doctors and Food
Safety Specialists to manage expiry dates, FEFO, receiving records, and
non-conforming products in catering companies, food factories, central
kitchens, and warehouses.

## Getting Started

```bash
npm install
npm run dev       # local dev server at http://localhost:5173
npm run build     # production build to dist/
npm run preview   # preview the production build
```

No environment variables, API keys, or backend server are required — the app
is 100% client-side and stores all data locally in the browser via
IndexedDB.

## Tech Stack

- React 18 + TypeScript + Vite
- Hand-written IndexedDB layer (no external DB dependency)
- Hand-written hash router (no react-router dependency)
- Material Design 3–inspired CSS design system (no MUI dependency)
- Manual service worker (`public/sw.js`) for offline-first caching
- Zero external/runtime network calls — no analytics, no tracking, no cloud

This keeps `npm install` fast and the dependency surface minimal
(`react`, `react-dom`, `vite`, `typescript`, `@vitejs/plugin-react` only).

## Verification note

This project was built and code-reviewed without live internet/npm-registry
access in the authoring environment, so `npm install` / `vite build` could
not be executed there. Instead, the entire codebase was validated by:

1. Syntax-checking every `.ts`/`.tsx` file with the TypeScript compiler.
2. Bundling the full module graph with esbuild against the real `react` /
   `react-dom` packages — this resolves every import/export across all 28
   source files.
3. Loading the built bundle in a real headless Chromium browser and
   interactively testing: adding categories/products/batches, verifying the
   Egyptian Standard 2613-1/2008 date math (both the ≤3-month exact-date rule
   and the >3-month "last day of month" rule), dark/light mode, Arabic/English
   + RTL/LTR switching, and the Non-Conforming Products flow — all with zero
   console or runtime errors.

Still, please run `npm install && npm run build` yourself before deploying,
in case your environment surfaces something the above didn't (e.g. an npm
peer-dependency resolution quirk).

## Known simplifications (documented, not hidden)

- **"Export to Excel"** is implemented as UTF-8 CSV with a BOM (opens
  natively and correctly, including Arabic text, in Excel/Google Sheets).
  A true `.xlsx` binary export was intentionally left out to keep the app
  dependency-free; it's a natural follow-up (see `src/utils/export.ts`).
- **PDF export** is not implemented. Every report and the receiving register
  are print-ready (`window.print()` with dedicated print CSS in
  `src/styles/global.css`), which covers "professional printable report" as
  specified, and leaves room for PDF generation to be added later without
  restructuring anything.
- Category/product default names are seeded in English + Arabic; you can
  rename or add more from the Categories/Products/Shelf-Life Database pages.

## Project Structure

```
src/
  engine/shelfLifeEngine.ts   Egyptian Standard 2613-1/2008 calculations
  db/                         IndexedDB wrapper + repositories
  context/AppContext.tsx      settings, theme, language
  router/Router.tsx           lightweight hash router
  i18n/translations.ts        Arabic/English strings
  pages/                      one file per app section
  components/                 layout + shared UI
```

---
Designed & Concept by Mahmoud S.A Biomy © 2026
