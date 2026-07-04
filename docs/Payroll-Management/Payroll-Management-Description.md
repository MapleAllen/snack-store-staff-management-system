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
- Shares row data with `AttendancePage.jsx`; edits on attendance and payroll pages update the same monthly row.
- Any edit made through `patchMonthlyEntry()` automatically clears `isComplete` unless the patch explicitly changes completion.

**Employee confirmation**

- Every employee must be explicitly confirmed with `toggleEntryComplete()` before store-month close.
- Confirmation is blocked when validation issues exist or salary is not configured.
- Confirmation records `completedAt`.
- Draft rows with edited values but no confirmation remain close blockers.

**Close and unlock**

- `requestClosePayroll()` blocks close when any row is invalid or unconfirmed.
- `closeStoreMonth()` freezes a deep-cloned snapshot and appends close history.
- `confirmClosePayroll()` creates an automatic recovery point after successful close in desktop mode.
- `unlockStoreMonth()` requires a non-empty reason and clears the frozen snapshot.

**Review and export**

- Uses owner-first blocker and exception summaries from `getPayrollCloseBlockers()`, `getPayrollIssueItems()`, `getPayrollReviewStatus()`, and `getPayrollChangeItems()`.
- Shows current employee wage components, calculated deductions/additions, recent salary adjustments, and close/unlock history.
- Shows formula trace steps in the employee detail panel with source fields, formula text, input values, raw values, rounded amounts, and rounding explanations when trace data is available.
- Older closed snapshots without stored trace show frozen payroll amounts and a short trace-unavailable message instead of recalculating from live data.
- `exportCurrentMonth()` exports CSV with either `草稿·未月结` or `正式·已月结` status.

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

- `getStorePayrollRows()`, `getPayrollStageSummary()`, `getPayrollCloseBlockers()`, and related helpers derive row state.
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
- Special adjustments are one free numeric field plus note, not categorized adjustment records.
- Open historical months recalculate from current employee salary and store config unless already closed.
- Calculation trace exists for newly generated rows and newly closed snapshots, but legacy closed snapshots may not include trace metadata.
- No electronic approval, payment status, payslip generation, or employee-facing acknowledgement.
- Close/unlock audit is per store-month only; there is no global payroll audit log.

## Future Directions

- Add categorized payroll adjustments with approval state.
- Add attendance import and validation preview.
- Add multi-store month close workflow from the overview.
- Add payroll export packages with CSV, JSON metadata, and snapshot hashes.
- Add payment status tracking after formal export.
