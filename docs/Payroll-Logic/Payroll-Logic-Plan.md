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
- `getPayrollCloseSummary()` groups blocker rows, review-only rows, and clean rows for the close confirmation modal.
- `getPayrollIssueItems()` identifies non-blocking review items.
- `getPayrollChangeItems()` summarizes notable row changes.
- `getPayrollReviewStatus()` powers UI badges in the payroll workbench and mobile cards.

## Phase 3: All-Store Close Readiness — DONE

Status: **Done**

Goals:

- Establish a tested, read-only contract describing which active stores can close in one month.

Completed work:

- Add `getPayrollMonthCloseReadiness(workspace, month)` with per-store `ready`, `blocked`, `closed`, and `empty` statuses.
- Deduplicate close blockers by employee row while retaining every structured issue on that row.
- Preserve review-only row counts without making them block a ready store.
- Exclude archived stores and use frozen snapshot rows for closed-store totals.
- Reuse the helper in the overview without adding a batch close mutation or UI action.

## Phase 4: Calculation Traceability — DONE

Status: **Done**

Goals:

- Let operators and support reviewers see exactly how each salary amount was derived.

Completed work:

- Add `calculatePayrollDetailed()` returning `{ breakdown, steps }` with source fields, formula text, intermediate values, and rounding results.
- Show calculation steps in the employee detail panel without changing the summary-first payroll workflow.
- Add tests proving the detailed trace totals match the existing flat breakdown.
- Add `PAYROLL_FORMULA_METADATA` and stamp newly closed snapshot rows with `core-payroll-v1` metadata.
- Preserve stored formula metadata for closed rows while leaving older snapshots without metadata untouched.

## Phase 5: Machine-Readable Validation — PARTIALLY COMPLETED

Status: **Partially Completed**

Goals:

- Make payroll blockers usable by UI filters, exports, tests, and future support tooling.

Completed work:

- Replace string-only validation output with `{ code, message, field, severity }` while preserving current Chinese messages.
- Return structured close blockers for unconfigured salary, invalid rows, and missing employee confirmation.
- Keep UI notices, blocker summaries, modal text, and CSV `数据校验` display based on the Chinese `message`.
- Preserve closed snapshot semantics by returning empty live validation issues for closed rows without revalidating old snapshots.

Remaining features:

- Classify review-only and informational items with structured issue objects when needed.
- Add structured export formats or metadata that expose issue codes outside the current Chinese CSV text.
- Add tests for every blocker and review status category.

## Phase 6: Commercial Rule Extensibility — PARTIALLY COMPLETED

Status: **Partially Completed**

Goals:

- Support realistic payroll variations while keeping historical results stable.

Completed work:

- Add logic-level support for optional structured one-time monthly payroll adjustments.
- Keep structured adjustments compatible with the legacy free numeric `specialAdjustment` field.
- Support approved `bonus`, `deduction`, `reimbursement`, and signed `correction` records in payroll totals and trace output.
- Validate structured adjustment category, status, amount, reason, and pending approval with stable issue codes.
- Wire structured adjustment data into the payroll employee detail panel so UI edits write optional `entry.payrollAdjustments` without schema migration.

Remaining features:

- Add import workflows for categorized one-time payroll adjustments.
- Add effective-date lookup for salary components and store rules in open historical months.
- Add optional overtime tiers and capped leave deduction policies.
- Add impact preview for store rule changes before committing settings.
- Keep all formula extensions behind versioned config and migration rules.

## Phase 7: Export and Audit Metadata — PARTIALLY COMPLETED

Status: **Partially Completed**

Goals:

- Make exported payroll data auditable and suitable for real payment handoff workflows.

Completed work:

- Add `buildPayrollExportMetadata()` as a logic-level handoff helper for Phase 4 reports and exports.
- Include store ID/name, month, draft/formal status, row count, confirmed count, blocker/review/clean counts, estimated/confirmed/closed totals, generated time, and formula metadata/version summary.
- Keep the helper read-only: it does not change CSV output, create JSON downloads, hash snapshots, recalculate closed snapshots, or mutate monthly records.

Remaining features:

- Add structured JSON export with metadata for workspace version, app version, store, month, export status, and generated time.
- Add CSV metadata sidecar or header block without breaking current CSV consumers.
- Add snapshot hash or row hash for closed exports.
- Add selective exports for confirmed rows, exception rows, and all stores in a month.
- Add export format versioning.

## Phase 8: Testing Strategy — PARTIALLY COMPLETED

Status: **Partially Completed**

Goals:

- Prevent payroll rule regressions from reaching user data.

Completed work:

- Existing tests cover generic workspace state, exports, validation, stage totals, and unconfigured salary exclusion.
- Formula trace parity tests prove detailed calculation totals match the existing flat breakdown.
- Closed snapshot tests cover stored trace preservation and old snapshot behavior without live recalculation.
- Closed snapshot tests cover formula metadata stamping, preservation, and legacy snapshot compatibility.
- Validation tests cover structured issue fields and close blocker message compatibility.
- Structured adjustment tests cover approved category impacts, pending/rejected behavior, invalid record issues, and legacy negative/large positive special adjustments.
- Close summary tests cover blocker grouping, review-only grouping, clean rows, and blocker-free close readiness.
- Export metadata tests cover open draft metadata, closed formal metadata, counts, totals, formula version summary, and closed snapshot immutability.
- All-store readiness tests cover ready/blocked/closed/empty status, archived-store exclusion, review-only readiness, deduplicated blocker rows, aggregate totals, and frozen closed snapshot totals.

Remaining features:

- Add tests for all review status categories.
- Add tests for closed snapshot stability after salary and rule changes.
- Add export metadata issue-code tests once review-only issue objects or structured export files exist.

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
