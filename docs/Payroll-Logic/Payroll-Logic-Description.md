# Payroll-Logic Module Description

## Module Name

Payroll-Logic

## Purpose

Payroll-Logic implements the deterministic payroll calculation and review layer for 门店工资助手. It converts workspace data into per-employee payroll rows, validates input, separates estimated/confirmed/closed totals, identifies month-close blockers, and produces safe export rows and metadata for payroll handoff.

## Current Implementation

The module is implemented in `src/payrollLogic.js` as a collection of pure functions. It does not store state and does not mutate the workspace. UI components call these functions after `App.jsx` changes workspace state through local React state and workspace operations.

### Capabilities

**Calculation engine**

- `calculatePayroll(employee, entry, config)` computes a flat breakdown for one employee in one store-month.
- `calculatePayrollDetailed(employee, entry, config)` returns the same flat `breakdown` plus calculation `steps` with source fields, formula text, raw values, rounded amounts, and rounding metadata.
- Computes overtime pay, leave-day deduction, leave-hour deduction, night shift pay, attendance bonus, audit pay, fixed social insurance contribution, prorated meal allowance, special adjustment, and net salary.
- `specialAdjustment` combines the legacy free numeric `entry.specialAdjustment` value with optional approved structured `entry.payrollAdjustments` records entered from the payroll employee detail panel or future import flows.
- Structured monthly payroll adjustments use `{ id, category, amount, reason, status }`, with categories `bonus`, `deduction`, `reimbursement`, and `correction`; only `approved` records affect pay.
- Treats social insurance as fixed from `config.socialInsuranceBase`; it is not prorated by leave.
- Prorates meal allowance from `config.mealAllowanceBase` by leave days and `config.monthDays`.
- Grants attendance bonus only when both leave days and leave hours are zero.
- Uses `auditPassedBonus` when `entry.auditPassed` is true and `auditFallbackBonus` otherwise.
- Uses `round2(value)` for two-decimal monetary rounding.
- Defines `PAYROLL_FORMULA_METADATA` for the current flat store-month payroll formula: `core-payroll-v1`, `flat-store-month-payroll`, `round2`, and fixed social insurance contribution.

**Validation**

- `validateStoreConfig(config)` enforces non-negative store parameters for allowances/bonuses/rates and positive divisors for leave and month days.
- `validateEmployeeSalary(employee)` requires `salaryConfigured` and validates positive base salary, non-negative overtime rate, and non-negative attendance bonus.
- `validatePayrollEntry(entry, config)` validates numeric payroll entry fields, prevents negative overtime/leave/night shift values, allows positive or negative special adjustments, enforces leave upper bounds, and validates optional structured payroll adjustment records.
- Pending or invalid structured payroll adjustments are returned as structured validation issues and therefore block close through the existing close blocker flow.
- Validation functions return structured payroll issues shaped as `{ code, severity, field, message }`; Chinese `message` values remain the UI and CSV display text.

**Assignment and employee queries**

- `isAssignmentActive(assignment, month)` checks whether a month falls within assignment bounds.
- `getAssignmentAtMonth(workspace, employeeId, month)` returns the employee assignment active in a month.
- `getEmployeeAssignments(workspace, employeeId)` returns assignment history sorted by `startMonth`.
- `getEmployeesForStore(workspace, storeId, month, options)` returns employees assigned to a store-month, excluding resigned employees unless `includeResigned` is true.
- `getEmployeesWithStoreHistory(workspace, storeId)` returns all employees ever assigned to a store.

**Payroll rows and monthly records**

- `getMonthlyStoreRecord(workspace, month, storeId)` returns a normalized month-store record using `createOpenMonthlyStoreRecord()`.
- `getStorePayrollRows(workspace, month, store, options)` returns rows containing `employee`, `entry`, `breakdown`, `calculationTrace`, structured `validationIssues`, and `recordStatus` for open months.
- Closed months with a stored `snapshot` return frozen snapshot rows and do not recalculate from live employee or store config.
- Closed snapshot rows preserve stored `calculationTrace` when it exists; older snapshot rows without trace remain valid and do not get recalculated from live data.
- Closed snapshot rows preserve stored `formulaMetadata` when it exists; older snapshot rows without formula metadata remain valid and are not backfilled from live formula constants.
- Closed snapshot rows return empty `validationIssues`; old frozen rows are not revalidated against current rules.
- Open months calculate rows from current employees, current store config, and saved monthly entries.

**Stage summary and review status**

- `getPayrollStageSummary(rows, monthlyStore)` computes forecast, confirmed, and closed totals and counts for confirmed, pending, unconfigured, invalid, review, draft, and not-started rows.
- `getPayrollCloseBlockers(row)` returns structured issues for reasons that prevent closing: unconfigured salary, validation errors, or missing explicit employee confirmation.
- `getPayrollCloseSummary(rows)` groups a store-month into blocker rows, review-only rows, and clean rows for the close confirmation modal.
- `getPayrollIssueItems(row)` identifies Chinese display strings for non-blocking review items such as leave, special adjustments, and audit fallback.
- `getPayrollChangeItems(row, storeConfig)` lists notable changes for the owner review panel.
- `getPayrollReviewStatus(row)` converts row state into UI badge data with `tone`, `label`, and `summary`.

**Exports and formatting**

- `buildExportRows(store, rows, exportStatus)` creates Chinese-labeled CSV-ready objects and includes validation status per row.
- `buildPayrollExportMetadata(store, month, rows, monthlyStore, options)` creates machine-readable export handoff metadata without changing CSV output.
- Export metadata includes store ID/name, month, draft/formal status, row count, confirmed count, blocker/review/clean counts, estimated/confirmed/closed totals, generated time supplied by the caller, current formula metadata, row formula version counts, and missing row formula metadata count.
- Open store-month records produce `draft` metadata; closed records or closed snapshot rows produce `formal` metadata.
- Invalid rows export an empty `实发工资` value and carry joined Chinese validation messages in `数据校验`.
- `csvEscape(value)` escapes CSV text and neutralizes spreadsheet formula prefixes (`=`, `+`, `-`, `@`, tab, carriage return) for string values.
- `sanitizeDownloadFileName(value, fallback)` removes unsafe filename characters and trims trailing spaces/dots.
- `formatCurrency(value)` formats CNY amounts with two decimals.
- `formatTimestamp(value)` formats short Chinese timestamps or returns `未保存` for missing values.

**Draft helpers**

- `cloneDefaultEntry(currentEntry)` overlays stored row data on top of default blank monthly entry fields.
- `entryHasInput(entry)` treats `isComplete` as the confirmation signal.
- `entryHasDraftChanges(entry)` detects unconfirmed rows with edited values, notes, or audit state.
- `createEmployeeDraft(employee)` and `createAdjustmentDraft(employee)` prepare form drafts for UI modals.

## Architecture

Payroll-Logic is a pure business-logic module. It consumes workspace-shaped objects and returns derived values for pages, reports, and exports.

### Business Logic (`src/payrollLogic.js`)

- `calculatePayroll(employee, entry, config)`
  - Produces the payroll breakdown used by payroll, attendance, reports, and export views.
- `calculatePayrollDetailed(employee, entry, config)`
  - Produces the same payroll breakdown plus trace steps used by the payroll employee detail panel.
- `PAYROLL_FORMULA_METADATA` and `clonePayrollFormulaMetadata()`
  - Provide stable formula version metadata for newly closed snapshot rows.
- `createPayrollIssue()` and `getPayrollIssueMessage()`
  - Create structured payroll issues and extract the Chinese display message for UI/export compatibility.
- `validateStoreConfig(config)`, `validateEmployeeSalary(employee)`, `validatePayrollEntry(entry, config)`
  - Produce structured validation issues with stable codes, severity, source field, and Chinese message.
- `getStorePayrollRows(workspace, month, store, options)`
  - Central row constructor; handles closed snapshot vs open live calculation.
- `getPayrollStageSummary(rows, monthlyStore)`
  - Central aggregate for overview, payroll, and reports.
- `getPayrollCloseBlockers(row)`, `getPayrollCloseSummary(rows)`, and `getPayrollIssueItems(row)`
  - Owner-first status classification and grouped close readiness summaries.
- `buildExportRows(store, rows, exportStatus)`
  - Converts derived rows into export objects.
- `buildPayrollExportMetadata(store, month, rows, monthlyStore, options)`
  - Builds Phase 4 export handoff metadata from existing row summaries and close summaries.

## Integration Points

- `src/payrollData.js`
  - Provides `createOpenMonthlyStoreRecord()` and `defaultMonthlyEntry()`.
- `src/workspaceOperations.js`
  - Uses `getAssignmentAtMonth()`, `getMonthlyStoreRecord()`, and `previousMonth()` during employee transfer and month operations.
- `src/App.jsx`
  - Computes active store employees, payroll rows, selected row, totals, completion rate, exceptions, CSV export, and modal defaults.
- `src/pages/HomePage.jsx`
  - Uses summaries, blockers, and issue items for the owner command center.
- `src/pages/PayrollPage.jsx`
  - Uses review status, blockers, issue items, change items, formatting, draft helpers, and structured adjustment validation messages in the employee detail panel.
- `src/pages/AttendancePage.jsx`
  - Uses computed row breakdowns passed by `App.jsx` for attendance totals.
- `src/pages/ReportsPage.jsx`
  - Uses summaries, blockers, issue items, and row breakdowns for monthly reports.

## Current Limitations

- Payroll calculation is a fixed `core-payroll-v1` formula; there is no per-store formula plug-in, tax calculation, statutory minimum wage guard, or configurable overtime tiers.
- Employee salary components are current values only; there is no automatic effective-date lookup for historical salary changes beyond frozen closed snapshots.
- Export is CSV-only from the UI; the module has metadata handoff data but no structured JSON download, XLSX, PDF, multi-store export package, or export manifest.
- Review-only payroll issue items are still Chinese display strings rather than structured issue objects.
- The UI still exposes the legacy free numeric special adjustment field alongside structured monthly payroll adjustment records; there is no import workflow or export manifest for structured adjustments yet.
- `entryHasInput()` intentionally maps to explicit confirmation only, so entered-but-unconfirmed rows require separate handling through `entryHasDraftChanges()`.
- Open-month rows are recalculated from current config and employee fields, so only closed snapshots provide historical immutability.
- The module has no incremental memoization; pages recalculate row arrays in render flow.
- Older closed snapshots created before trace and formula metadata storage do not have source fields, formula text, rounding metadata, or formula version metadata; they still display frozen payroll amounts.

## Future Directions

- Use formula version metadata in future export manifests, snapshot hashes, and formula migration decisions.
- Structure review-only exception items if future support tooling needs codes beyond close blockers and validation issues.
- Connect export metadata to future structured export formats with workspace version and snapshot hash.
- Add import workflows for categorized bonuses, deductions, reimbursements, and tax placeholders.
- Add effective-date salary lookup for open historical months that are not closed.
