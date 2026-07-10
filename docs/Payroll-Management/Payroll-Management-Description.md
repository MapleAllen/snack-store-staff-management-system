# Payroll-Management Module Description

## Module Name

Payroll-Management

## Purpose

Payroll-Management is the owner-facing monthly payroll workflow. It lets a store operator enter attendance-related payroll inputs, review each employee's calculated salary, explicitly confirm every employee, close a store-month into a frozen snapshot, unlock with a reason when mistakes are found, and export draft or formal payroll CSV files.

## Current Implementation

The workflow is implemented across `src/App.jsx`, `src/pages/PayrollPage.jsx`, `src/pages/AttendancePage.jsx`, `src/payrollLogic.js`, and `src/workspaceOperations.js`. `App.jsx` owns active store/month state and workspace mutations. `payrollLogic.js` derives rows, totals, blockers, and export data. `workspaceOperations.js` closes and unlocks payroll months.

### Capabilities

**Monthly payroll workspace**

- Tracks an active store and active month from `App.jsx`.
- Builds `payrollRows` with `getStorePayrollRows(workspace, activeMonth, activeStore)`.
- Displays estimated, confirmed, and closed values without merging the meanings.
- Supports desktop table layout and mobile card layout in `PayrollPage.jsx`.

**Payroll entry**

- Supports overtime hours, leave days, leave hours, night shift hours when enabled, audit pass/fail, special adjustment, and note.
- The current payroll UI keeps the legacy free numeric special adjustment field and also lets the employee detail panel add, edit, delete, and review structured one-time monthly adjustment records.
- Structured payroll adjustment UI records support category, approval status, amount, and reason, and write to optional `entry.payrollAdjustments` data on the monthly row.
- Shares row data with `AttendancePage.jsx`; edits on attendance and payroll pages update the same monthly row.
- Any edit made through `patchMonthlyEntry()` automatically clears `isComplete` unless the patch explicitly changes completion.

**Employee confirmation**

- Every employee must be explicitly confirmed with `toggleEntryComplete()` before store-month close.
- Confirmation is blocked when structured validation issues exist or salary is not configured; the UI still shows the Chinese issue message.
- Confirmation records `completedAt`.
- Draft rows with edited values but no confirmation remain close blockers.

**Close and unlock**

- `requestClosePayroll()` opens a grouped close confirmation summary for blockers, review-only exceptions, and clean rows.
- The close confirmation modal only exposes the final month-close action when the grouped summary has no blocker rows.
- `closeStoreMonth()` freezes a deep-cloned snapshot, stamps each newly closed row with formula version metadata, and appends close history.
- `confirmClosePayroll()` creates an automatic recovery point after successful close in desktop mode.
- `unlockStoreMonth()` requires a non-empty reason and clears the frozen snapshot.

**Review and export**

- Uses owner-first blocker and exception summaries from `getPayrollCloseBlockers()`, `getPayrollCloseSummary()`, `getPayrollIssueItems()`, `getPayrollReviewStatus()`, and `getPayrollChangeItems()`.
- `getPayrollMonthCloseReadiness()` provides the overview with a read-only all-active-store close preview. It reuses the same per-store close blockers, keeps review-only exceptions non-blocking, and reads closed totals from frozen snapshots.
- Close blockers from payroll logic are structured as `{ code, severity, field, message }`; payroll, attendance, reports, and overview pages render the `message` to preserve current Chinese wording.
- Pending or invalid structured payroll adjustments surface through the same validation issue and close blocker flow; rejected records remain visible in the detail panel but do not affect pay.
- Shows current employee wage components, calculated deductions/additions, recent salary adjustments, and close/unlock history.
- Shows formula trace steps in the employee detail panel with source fields, formula text, input values, raw values, rounded amounts, and rounding explanations when trace data is available.
- Older closed snapshots without stored trace or formula metadata show frozen payroll amounts and do not get recalculated or backfilled from live data.
- `exportCurrentMonth()` exports CSV with either `草稿·未月结` or `正式·已月结` status.
- Payroll logic now exposes `buildPayrollExportMetadata()` for future payment handoff and audit flows; the current payroll page does not download this metadata yet.

## Architecture

Payroll-Management is a page-level workflow over shared data and operation modules. UI components render derived rows; state changes flow through `App.jsx` into the local workspace.

### State Orchestration (`src/App.jsx`)

- `activeMonth`, `activeStoreId`, `selectedEmployeeId`
  - Current payroll scope and selected detail row.
- `patchMonthlyEntry(employeeId, patch)`
  - Updates monthly row data and clears completion after edits.
- `toggleEntryComplete(employeeId, complete)`
  - Validates and updates employee completion state.
- `requestClosePayroll()` and `confirmClosePayroll()`
  - Gate and apply store-month close.
- `confirmUnlockPayroll(event)`
  - Applies reasoned unlock.
- `exportCurrentMonth()`
  - Builds and downloads CSV export.

### Payroll UI (`src/pages/PayrollPage.jsx`)

- Renders command state, stats, filters, payroll table, mobile cards, employee detail panel, adjustment tab, and close/unlock controls.
- Uses local UI state for active subview, search term, and filter.
- Delegates all persistent changes through props from `App.jsx`.

### Attendance UI (`src/pages/AttendancePage.jsx`)

- Renders focused attendance entry for the same monthly rows.
- Uses `patchEntry` and `toggleComplete` props from `App.jsx`.

### Business Logic (`src/payrollLogic.js`, `src/workspaceOperations.js`)

- `getStorePayrollRows()`, `getPayrollStageSummary()`, `getPayrollCloseBlockers()`, `getPayrollMonthCloseReadiness()`, and related helpers derive row and all-store preview state.
- `buildPayrollExportMetadata()` derives draft/formal export handoff metadata from the same rows and monthly store record without mutating close state.
- `closeStoreMonth()` and `unlockStoreMonth()` apply close/unlock mutations.

## Integration Points

- `docs/Payroll-Logic/*`
  - Calculation and validation reference.
- `docs/Workspace-Operations/*`
  - Close/unlock operation reference.
- `docs/Reports-And-Exports/*`
  - Reporting and export workflow reference.
- `src/workspaceOperations.test.js`
  - Tests close/unlock behavior.
- `src/payrollLogic.test.js`
  - Tests stage totals, export safety, and validation.

## Current Limitations

- Payroll has no batch import from attendance systems or spreadsheets.
- CSV export is single active store/month only from the payroll page.
- Export metadata is available at the logic layer, but the payroll UI still downloads only the existing CSV file.
- Payroll UI entry for special adjustments now supports per-employee structured records, but there is no import workflow, bulk editing, export manifest, or electronic approval workflow yet.
- Open historical months recalculate from current employee salary and store config unless already closed.
- Calculation trace and formula version metadata exist for newly closed snapshots, but legacy closed snapshots may not include that metadata.
- Review-only exception items are still display strings rather than structured issue objects.
- No electronic approval, payment status, payslip generation, or employee-facing acknowledgement.
- Close/unlock audit is per store-month only; there is no global payroll audit log.
- All-store readiness is preview-only; no batch close, shared close confirmation, automatic recovery point, or multi-store export is implemented.

## Future Directions

- Add attendance import and validation preview.
- Add multi-store month close workflow from the overview.
- Add payroll export packages that connect CSV, metadata sidecars, and snapshot hashes.
- Add bulk/import/export-manifest support for categorized payroll adjustments.
- Add payment status tracking after formal export.
