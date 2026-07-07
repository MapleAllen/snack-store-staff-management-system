# Reports-And-Exports Module Description

## Module Name

Reports-And-Exports

## Purpose

Reports-And-Exports gives owners a monthly cross-store payroll status view and a CSV handoff path for store payroll. It distinguishes forecast, confirmed, and closed totals, exposes blockers and review exceptions, and prevents open-month exports from being mistaken for final payroll files.

## Current Implementation

Reporting is implemented mainly in `src/pages/ReportsPage.jsx`. Payroll CSV export is initiated from `src/App.jsx` and uses helpers in `src/payrollLogic.js`. There is no separate report persistence layer; reports are derived from the current workspace each render.

### Capabilities

**Monthly report page**

- `ReportsPage.jsx` receives `workspace`, `activeMonth`, `setActiveMonth`, `onSelectStore`, and `onNavigate`.
- Provides a report month picker.
- Supports an `includeArchived` checkbox to include archived stores.
- Computes per-store rows, stage summary, blockers, review rows, overtime total, leave deductions, and absolute special adjustments.

**Cross-store summary**

- Shows confirmed total with forecast hint.
- Shows ready-to-close store count and already frozen store count.
- Shows payroll blocker employee count.
- Shows review change count and closed total hint.

**Store-level report rows**

- Displays store name, employee count, confirmed count, forecast amount, confirmed or closed amount, status badge, top blocker/review item, overtime, leave deductions, and special adjustment total.
- Clicking an active store row selects that store and navigates to payroll.
- Archived store rows are disabled in the report list.

**CSV payroll export**

- `exportCurrentMonth()` in `App.jsx` exports the active store and active month.
- Export status is `草稿·未月结` for open months and `正式·已月结` for closed months.
- `buildExportRows()` creates Chinese-labeled row objects.
- `buildPayrollExportMetadata()` creates machine-readable handoff metadata for the same store/month scope, including draft/formal status, counts, totals, generated time, and formula version summary.
- The metadata helper is not wired to UI download yet, so existing CSV files and column formats are unchanged.
- `csvEscape()` escapes cells and neutralizes spreadsheet formula injection prefixes for string cells.
- CSV download includes UTF-8 BOM and a sanitized filename.

## Architecture

Reports-And-Exports is a derived-read module plus a single-store CSV export action. It reuses Payroll-Logic calculations rather than storing report snapshots separately.

### Report UI (`src/pages/ReportsPage.jsx`)

- Local state `includeArchived`
  - Controls whether archived stores appear.
- Derived `summaries`
  - One object per report store containing rows, stage summary, blocker rows, review rows, overtime, deductions, and adjustments.
- Report rows
  - Route active stores to payroll via `onSelectStore()` and `onNavigate("payroll")`.

### Export Flow (`src/App.jsx`, `src/payrollLogic.js`)

- `exportCurrentMonth()`
  - Builds rows for active store/month and downloads CSV.
- `buildExportRows(store, rows, exportStatus)`
  - Creates localized export objects.
- `buildPayrollExportMetadata(store, month, rows, monthlyStore, options)`
  - Creates reusable metadata for future export manifests and audit handoff.
- `csvEscape(value)`
  - Escapes CSV values and spreadsheet formula-like strings.
- `sanitizeDownloadFileName(value, fallback)`
  - Produces filesystem-safe download names.

## Integration Points

- `src/payrollLogic.js`
  - Supplies payroll rows, summaries, blockers, issue items, and export helpers.
- `src/App.jsx`
  - Owns active month, active store, and CSV download.
- `src/pages/HomePage.jsx`
  - Routes users to reports from the dashboard.
- `src/payrollLogic.test.js`
  - Tests export safety, filename sanitization, validation output, and stage totals.

## Current Limitations

- Report page is a derived summary only; it does not persist report snapshots.
- CSV export is single active store/month from the payroll page, not a multi-store package.
- There is no XLSX, PDF, JSON, or print-ready report export.
- There is a logic-level export metadata helper, but no downloaded export manifest, checksum, row hash, or audit sidecar file yet.
- Open-month report values can change after rule or salary edits until the month is closed.
- Report page does not provide trend comparison, historical charts, or employee-level drill-down.
- Archived store report rows are visible when included but not clickable.

## Future Directions

- Add multi-store monthly export package.
- Add structured JSON report export with metadata and versioning.
- Connect export metadata to manifests with app version, workspace version, and snapshot hash.
- Add closed-month report snapshots or audit views.
- Add trend reports across months.
- Add print-friendly owner summaries.
- Add import/export verification tests for Windows Excel compatibility.
