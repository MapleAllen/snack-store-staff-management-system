# Payroll-Logic - Plan

## Objective

Deliver a precise, auditable, and extensible payroll engine where every calculation step is transparent, validation is comprehensive, and export formats meet real-world compliance needs without introducing runtime dependencies beyond the current React/Vite bundle.

## Design Principles

- **Calculation traceability**: Every derived value must be traceable to a base input (employee field, entry field, config value).
- **Validation before calculation**: Input errors must be surfaced before partial results are displayed; no hiding errors behind zero or NaN defaults.
- **Snapshot immutability**: Closed-month payroll rows are served from frozen snapshots only; live recalculation is never applied to closed months.
- **Resigned employees are excluded by default**: Queries must filter resigned employees unless `includeResigned` is explicitly set.
- **Stage distinction is sacred**: Forecast, confirmed, and closed totals must never be conflated in UI or export.
- **Export status is explicit**: Open-month exports must carry a draft marker; closed-month exports must carry a frozen marker.

## Phases

### Phase 1: Core Payroll Engine — DONE

Completed work:
- `calculatePayroll()` computes full breakdown from employee + entry + store config: `payrollLogic.js:134-162`.
- Validators cover store config constraints, employee salary setup, and per-entry numeric/range checks: `payrollLogic.js:16-67`.
- Employee-store queries respect assignment temporal ranges and resigned status: `payrollLogic.js:94-128`.
- `getStorePayrollRows()` handles closed snapshots vs live rows: `payrollLogic.js:269-295`.
- Three-stage summary: forecast, confirmed, closed: `payrollLogic.js:297-321`.

### Phase 2: UI-Facing Status and Review — DONE

Completed work:
- `getPayrollReviewStatus()` drives per-row UI badges with tone/label/summary tuple: `payrollLogic.js:255-267`.
- `getPayrollCloseBlockers()` surfaces explicit blocking reasons for month-close: `payrollLogic.js:232-241`.
- `getPayrollIssueItems()` and `getPayrollChangeItems()` highlight notable entries for owner review: `payrollLogic.js:222-229`, `payrollLogic.js:243-253`.
- CSV export and filename sanitization: `payrollLogic.js:164-203`.

### Phase 3: Calculation Transparency — NOT STARTED

Goal: Expose an itemized breakdown so users can audit how each salary component was derived.

Tasks:
- Add `calculatePayrollDetailed()` returning `{ breakdown, steps[] }` where each step records input formula, values, and intermediate result.
- Show derivation in a drill-down panel: baseSalary → deductions → additions → net.
- Surfaces rounding decisions explicitly in each step.
- Add a boolean flag to `calculatePayroll()` for `{ detailed: true }`.
- Maintain backward compatibility: default mode returns the current flat breakdown object.

### Phase 4: Enhanced Export — NOT STARTED

Goal: Move beyond CSV to structured, versioned export formats and improve Chinese-character safety.

Tasks:
- Add JSON export option with the same field structuring as buildExportRows.
- Add export metadata header: workspace version, export timestamp, store name, month, status (draft/frozen), and SHA of payroll snapshot.
- Add BOM handling for CSV to improve CJK character rendering in Excel on Windows.
- Support selective export: only confirmed rows, only flagged rows, only employees with adjustments.
- Add export format versioning for forward compatibility.

### Phase 5: Configurable Payroll Rules — NOT STARTED

Goal: Allow store-specific overrides for deduction formulas, bonus tiers, and overtime calculations.

Tasks:
- Add tiered overtime rates (e.g., first 40h at rate1, beyond at rate2).
- Add progressive leave deduction caps (max deduction per leave type).
- Support per-store custom formula overrides via store config extension.
- Validate config extension structural integrity before use in calculation.
- Add rule-change impact preview: show how a config change affects current-month rows before committing.

### Phase 6: Testing Strategy — PARTIALLY COMPLETED

Completed work:
- Existing tests cover salary state, exports, validation, stage totals: `payrollLogic.test.js` — 7 tests.

Remaining tasks:
- Add tests for edge cases: zero config divisors, negative special adjustments, 0-hour months.
- Add tests for `getPayrollReviewStatus()` across all tone categories.
- Add tests for `csvEscape()` with formula injection prefixes, embedded quotes, and CJK characters.
- Add tests for `buildExportRows()` with draft and closed status markers.
- Add tests for `getEmployeesForStore()` with future-dated and past-dated assignments.

## Implementation Rules

- Do not change the closed-month behavior: snapshots are read-only and never recomputed.
- Do not change `round2()` rounding strategy without verifying that historical payroll totals remain stable.
- Do not remove `includeResigned` parameter from `getEmployeesForStore()` — it is the only mechanism for accessing resigned employee history.
- Do not add export formats that produce binary blobs without first adding validation.
- Do not alter the Chinese field labels in `buildExportRows()` without confirming downstream CSV consumers.

## Open Questions

- Should `calculatePayroll()` support async config loading for tenant-specific or localized rules?
- Should export metadata include a digital signature or hash for tamper evidence?
- Should overtime tier configuration live in store config or employee profile?
- Should leave deduction formulas support statutory minimum thresholds (e.g., minimum wage floor)?
