# Payroll-Logic Plan

## Objective

Build a transparent and extensible payroll engine where every displayed amount can be traced to source inputs, every blocker is machine- and human-readable, exports carry enough metadata for audit, and future payroll rules can evolve without breaking frozen historical results.

## Design Principles

- Closed snapshots are immutable: never recalculate a closed month from live employee or store config.
- Stage separation is mandatory: estimated, confirmed, and closed totals must remain visually and structurally distinct.
- Validation precedes close: rows with unconfigured salary, invalid entry values, or missing confirmation cannot close.
- Social insurance remains fixed unless a product decision changes the rule.
- Open exports are drafts: every open-month export must carry an explicit draft status.
- Formula changes are versioned: future calculation changes must not reinterpret historical payroll silently.
- Owner-first review stays primary: blockers, exceptions, and payout confidence come before formula details.

## Phase 1: Current Payroll Engine — DONE

Status: **Done**

Goals:

- Provide deterministic calculation, validation, row construction, and stage summaries for the current local payroll workflow.

Completed work:

- `calculatePayroll()` computes the current salary breakdown.
- Store, employee salary, and payroll entry validators exist.
- Assignment queries exclude resigned employees by default.
- `getStorePayrollRows()` respects frozen snapshots for closed months.
- `getPayrollStageSummary()` separates forecast, confirmed, and closed totals.
- CSV export helpers include filename sanitization and spreadsheet formula injection protection.

## Phase 2: Owner Review and Close Readiness — DONE

Status: **Done**

Goals:

- Surface next actions, blockers, and exceptions before formulas.

Completed work:

- `getPayrollCloseBlockers()` identifies month-close blockers.
- `getPayrollIssueItems()` identifies non-blocking review items.
- `getPayrollChangeItems()` summarizes notable row changes.
- `getPayrollReviewStatus()` powers UI badges in the payroll workbench and mobile cards.

## Phase 3: Calculation Traceability — DONE

Status: **Done**

Goals:

- Let operators and support reviewers see exactly how each salary amount was derived.

Completed work:

- Add `calculatePayrollDetailed()` returning `{ breakdown, steps }` with source fields, formula text, intermediate values, and rounding results.
- Show calculation steps in the employee detail panel without changing the summary-first payroll workflow.
- Add tests proving the detailed trace totals match the existing flat breakdown.
- Add `PAYROLL_FORMULA_METADATA` and stamp newly closed snapshot rows with `core-payroll-v1` metadata.
- Preserve stored formula metadata for closed rows while leaving older snapshots without metadata untouched.

## Phase 4: Machine-Readable Validation — NOT STARTED

Status: **Not Started**

Goals:

- Make payroll blockers usable by UI filters, exports, tests, and future support tooling.

Remaining features:

- Replace string-only validation output with `{ code, message, field, severity }` while preserving current Chinese messages.
- Classify issues as blocking, review-only, or informational.
- Update close blockers and export rows to include stable issue codes.
- Add tests for every blocker and review status category.

## Phase 5: Commercial Rule Extensibility — NOT STARTED

Status: **Not Started**

Goals:

- Support realistic payroll variations while keeping historical results stable.

Remaining features:

- Add categorized salary components for bonuses, deductions, reimbursements, and one-time payroll adjustments.
- Add effective-date lookup for salary components and store rules in open historical months.
- Add optional overtime tiers and capped leave deduction policies.
- Add impact preview for store rule changes before committing settings.
- Keep all formula extensions behind versioned config and migration rules.

## Phase 6: Export and Audit Metadata — NOT STARTED

Status: **Not Started**

Goals:

- Make exported payroll data auditable and suitable for real payment handoff workflows.

Remaining features:

- Add structured JSON export with metadata for workspace version, app version, store, month, export status, and generated time.
- Add CSV metadata sidecar or header block without breaking current CSV consumers.
- Add snapshot hash or row hash for closed exports.
- Add selective exports for confirmed rows, exception rows, and all stores in a month.
- Add export format versioning.

## Phase 7: Testing Strategy — PARTIALLY COMPLETED

Status: **Partially Completed**

Goals:

- Prevent payroll rule regressions from reaching user data.

Completed work:

- Existing tests cover generic workspace state, exports, validation, stage totals, and unconfigured salary exclusion.
- Formula trace parity tests prove detailed calculation totals match the existing flat breakdown.
- Closed snapshot tests cover stored trace preservation and old snapshot behavior without live recalculation.
- Closed snapshot tests cover formula metadata stamping, preservation, and legacy snapshot compatibility.

Remaining features:

- Add tests for all review status categories.
- Add tests for negative special adjustments and large positive adjustments.
- Add tests for closed snapshot stability after salary and rule changes.
- Add export metadata and issue-code tests once structured export exists.

## Implementation Rules

- Do not recalculate closed snapshots from live data.
- Do not merge forecast, confirmed, and closed totals into a single ambiguous amount.
- Do not allow close when any row has unconfigured salary, invalid data, or no explicit completion confirmation.
- Do not change rounding behavior without snapshot compatibility tests.
- Do not add new payroll components without defining how they appear in export and close snapshots.
- Do not remove the current Chinese export labels without a migration or compatibility decision.

## Open Questions

- Which commercial payroll components are required for the first paid release: tax, deductions, reimbursements, performance bonus, or only categorized manual adjustments?
- Should formula version metadata live on store config, monthly record, or every closed snapshot row?
- Should open historical months use current salary values, salary adjustment effective dates, or require close before salary changes?
- Should export hashes be user-visible, machine-readable only, or both?
