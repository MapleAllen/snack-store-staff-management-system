# Payroll-Logic - Description

## Module Name

Payroll-Logic

## Purpose

Implements the payroll calculation engine, input validation, employee-store assignment queries, payroll row construction, stage summary computation, and CSV/export formatting for the payroll system.

## Current Implementation

### Capabilities

**Core calculation**
- `calculatePayroll(employee, entry, config)` computes a full salary breakdown for one employee-month-store combination.
- Computes: overtime pay, leave deductions (days + hours), night shift pay, attendance bonus, audit bonus, social insurance, meal allowance, special adjustment, and net salary.
- Uses `round2()` for consistent two-decimal rounding throughout.
- Leave deduction divisors, month days divisor, and night shift rate come from store config.
- Night shift pay and meal allowance are only meaningful when config divisors are > 0.

**Input validation**
- `validateStoreConfig(config)`: checks non-negative constraints (socialInsuranceBase, mealAllowanceBase, auditPassedBonus, auditFallbackBonus, nightShiftRate) and positive constraints (leaveDaysDivisor, leaveHoursDivisor, monthDays).
- `validateEmployeeSalary(employee)`: checks salaryConfigured, positive baseSalary, non-negative overtimeRate and attendanceBonus.
- `validatePayrollEntry(entry, config)`: validates numeric fields, range constraints (leaveDays <= monthDays, leaveHours <= leaveHoursDivisor), and special adjustment format.

**Employee-store assignment queries**
- `isAssignmentActive(assignment, month)`: checks month falls within assignment start/end range.
- `getAssignmentAtMonth(workspace, employeeId, month)`: finds active assignment for given month.
- `getEmployeeAssignments(workspace, employeeId)`: all assignments for an employee, sorted by startMonth.
- `getEmployeesForStore(workspace, storeId, month, options)`: active employees at a store for a month; supports `includeResigned` flag.
- `getEmployeesWithStoreHistory(workspace, storeId)`: all employees ever assigned to a store.

**Payroll row construction**
- `getStorePayrollRows(workspace, month, store, options)`: returns per-employee rows with employee, entry, breakdown, validationIssues, and recordStatus.
- For closed months: returns frozen snapshot rows directly.
- For open months: computes live rows from stored entries and current employee/store config.
- `cloneDefaultEntry(currentEntry)`: merges current entry over default blank entry.
- `entryHasInput(entry)`: returns true if isComplete is truthy.
- `entryHasDraftChanges(entry)`: returns true if any input fields have non-empty/truthy values but entry is not yet complete.

**Payroll stage summary**
- `getPayrollStageSummary(rows, monthlyStore)`: computes forecastTotal, confirmedTotal, closedTotal, employee counts by status (confirmed, pending, unconfigured, invalid, review, draft, notStarted).
- Distinguishes three total stages: forecast, confirmed, and closed.

**Status and blocker classification**
- `getPayrollReviewStatus(row)`: returns `{ tone, label, summary }` for UI badges — danger (input error), warning (salary pending / needs review), success (confirmed / closed), idle (pending confirmation).
- `getPayrollCloseBlockers(row)`: lists blocking reasons preventing month close: salary not configured, validation errors, not yet confirmed.
- `getPayrollIssueItems(row)`: surfaces notable entries: leave days/hours, special adjustments, audit not passed.
- `getPayrollChangeItems(row, storeConfig)`: lists changes from defaults: overtime, leave, night shift, special adjustment, audit pass.

**Export and formatting**
- `buildExportRows(store, rows, exportStatus)`: flattens payroll rows into Chinese-labeled CSV-ready objects with 工资表状态, 门店, 姓名, 基础工资, etc.
- `csvEscape(value)`: escapes CSV special characters and formula injection prefixes.
- `sanitizeDownloadFileName(value, fallback)`: removes invalid filename characters for cross-platform download safety.
- `formatCurrency(value)`: zh-CN CNY formatting with 2 decimal places.
- `formatTimestamp(value)`: zh-CN short datetime formatting.
- `previousMonth(month)`: returns YYYY-MM of previous month.
- `toNumber(value)`, `round2(value)`: numeric conversion utilities.

**Draft helpers**
- `createEmployeeDraft(employee)`: provides default string values for employee creation form fields.
- `createAdjustmentDraft(employee)`: provides default adjustment record with today's date and current salary values.

### Architecture

| File | Role |
|---|---|
| `src/payrollLogic.js` | Single-file module containing all payroll calculation, validation, row construction, summary, export, and formatting functions. |

**Key exports**

| Export | Type | Description |
|---|---|---|
| `calculatePayroll(emp, entry, config)` | function | Full salary breakdown |
| `validateStoreConfig(config)` | function | Config constraint validation |
| `validateEmployeeSalary(emp)` | function | Salary setup validation |
| `validatePayrollEntry(entry, config)` | function | Entry numeric/range validation |
| `getEmployeesForStore(ws, storeId, month, opts)` | function | Active employees query |
| `getStorePayrollRows(ws, month, store, opts)` | function | Payroll row array |
| `getPayrollStageSummary(rows, monthlyStore)` | function | Stage totals and counts |
| `getPayrollReviewStatus(row)` | function | UI review status badge |
| `getPayrollCloseBlockers(row)` | function | Month-close blocking reasons |
| `getPayrollIssueItems(row)` | function | Notable entry items |
| `getMonthlyStoreRecord(ws, month, storeId)` | function | Normalized month record |
| `buildExportRows(store, rows, status)` | function | Export-ready row array |
| `csvEscape(value)` | function | CSV safe string |
| `sanitizeDownloadFileName(value, fb)` | function | Safe filename |
| `formatCurrency(value)` | function | CNY formatter |
| `entryHasInput(entry)` | function | Completion check |
| `createAdjustmentDraft(emp)` | function | Adjustment form defaults |

### Integration Points

- **payrollData.js**: Imports `createOpenMonthlyStoreRecord`, `defaultMonthlyEntry` for monthly record handling and entry cloning.
- **workspaceOperations.js**: Called by store-month close to validate rows before freezing; `getMonthlyStoreRecord()` used for reading source records during transfers.
- **App.jsx / pages**: Primary consumer — calls row computation, summary, review status, blockers, export, and validation for UI rendering.
- **Settings / Backup flows**: Uses `buildExportRows()` and `csvEscape()` for CSV export; `sanitizeDownloadFileName()` for download naming.

### Current Limitations

- Calculation is purely front-end synchronous; no server-side re-computation or multi-pass validation.
- Leave deduction uses linear proportional formula; does not support tiered or capped leave policies.
- Social insurance base is a flat config value, not prorated by leave or partial-month employment.
- Audit bonus is binary (passed/not) without support for graded audit scores.
- Export rows embed validation issues as joined Chinese strings; downstream consumers must parse them from CSV text.
- `entryHasInput` treats `isComplete` as the sole signal; incomplete entries with data are detected separately by `entryHasDraftChanges`.
- No lazy/incremental recalculation; every row update recomputes the full row array.

### Future Directions

- Add parameterized calculation with pluggable deduction/allowance formula functions.
- Add export format extensibility (JSON, XLSX, structured PDF) beyond CSV.
- Add filtered row subsets (only confirmed, only invalid, only draft) for targeted review.
- Add per-employee history view showing payroll breakdown changes month-over-month.
- Add overtime-rate tiers, progressive leave deduction caps.
- Add localization support for currency formatting beyond CNY.
