# Payroll-Management Plan

## Objective

Make monthly payroll complete enough for commercial store operations: fast to enter, difficult to close incorrectly, explainable during review, recoverable after mistakes, and exportable with audit metadata for payment handoff.

## Design Principles

- Every employee requires explicit completion confirmation before close.
- Blockers and next actions appear before formulas.
- Open-month exports are drafts; closed exports are formal.
- Closed snapshots are frozen and never recalculated.
- Salary components change through adjustment records, not direct silent edits.
- Payroll changes should be recoverable through backups and reasoned unlock history.

## Phase 1: Current Monthly Payroll Close Loop — DONE

Status: **Done**

Goals:

- Provide a usable single-store monthly payroll workflow.

Completed work:

- Payroll and attendance pages share monthly row data.
- Per-employee confirmation exists and is required before close.
- Close blockers cover salary-pending rows, validation issues, and unconfirmed rows.
- Close blockers and validation issues carry stable `code`, `severity`, `field`, and Chinese `message` values.
- Store-month close freezes snapshots and unlock requires a reason.
- Draft/formal CSV export status is explicit.

## Phase 2: Review Transparency — DONE

Status: **Done**

Goals:

- Make every payroll amount explainable without requiring code knowledge.

Completed work:

- Add formula trace steps to the employee detail panel.
- Add source field labels for every deduction and addition.
- Add rounding explanations for each monetary step.
- Add formula version metadata to newly closed snapshot rows without changing frozen payroll amounts.
- Add close confirmation summary grouped by blockers, review-only exceptions, and clean rows.

## Phase 3: Structured Adjustments and Attendance Import — PARTIALLY COMPLETED

Status: **Partially Completed**

Goals:

- Replace free-form payroll exceptions with structured commercial workflows.

Completed work:

- Add payroll logic support for optional categorized one-time monthly adjustments with reason, amount, and approval status.
- Preserve the existing free numeric special adjustment field while allowing future UI/import flows to pass structured records.
- Add validation issues for pending or invalid structured adjustment records so they block close through the existing validation flow.
- Add per-employee detail panel UI to add, edit, delete, and review structured one-time payroll adjustments.
- Route structured adjustment edits through `patchMonthlyEntry()` so prior employee confirmation is cleared and the employee must be confirmed again.
- Show pending or invalid structured adjustment records through the existing validation issue and close blocker messages.

Remaining features:

- Add attendance import preview for CSV or spreadsheet-like files.
- Add bulk/import/export-manifest workflows for categorized one-time payroll adjustments.
- Add duplicate employee and invalid date detection during import.
- Add tests for import validation without applying changes.

## Phase 4: Batch Close and Payment Handoff — PARTIALLY COMPLETED

Status: **Partially Completed**

Goals:

- Let owners close and hand off payroll across all stores efficiently.

Completed work:

- Add a pure all-active-store payroll close-readiness summary for the overview, including per-store statuses, structured blocker rows, review counts, and estimated/confirmed/closed totals.
- Keep the summary preview-only: archived stores are excluded, empty stores are not ready, and closed stores use frozen snapshot rows.

Remaining features:

- Add batch close operation with per-store blocker report.
- Add multi-store export package for closed months.
- Add payment status tracking: not exported, exported, paid, corrected.

## Phase 5: Payroll Audit Trail — PARTIALLY COMPLETED

Status: **Partially Completed**

Goals:

- Make payroll changes traceable for commercial support and owner review.

Completed work:

- Add a logic-level export metadata handoff helper with store/month scope, draft/formal status, row counts, close-review counts, totals, generated time, and formula version summary.
- Preserve the current CSV export behavior and closed snapshot semantics; metadata is not yet downloaded or persisted.

Remaining features:

- Add global payroll operation log for row edits, confirmations, close, unlock, export, and payment status changes.
- Add export manifest with row count, totals, generated time, app version, and snapshot hash.
- Add audit report screen for closed months.

## Phase 6: Testing Strategy — PARTIALLY COMPLETED

Status: **Partially Completed**

Goals:

- Prevent payroll workflow regressions.

Completed work:

- Existing tests cover validation, stage totals, close blockers, closed snapshots, and unlock.
- Tests cover structured validation issues, structured close blockers, and Chinese export message compatibility.
- Tests cover logic-level structured adjustment categories, pending/rejected behavior, invalid adjustment records, and legacy special adjustment compatibility.
- Tests cover close confirmation summary grouping and blocker-free close readiness.
- Tests cover draft/formal export metadata handoff, counts, totals, and closed snapshot source stability.
- Tests cover all-store readiness states, deduplicated blocker rows, review-only readiness, archived-store exclusion, aggregate totals, and frozen closed snapshot totals.
- Manual UI verification covers structured adjustment add/edit/delete, confirmation clearing, approval status impact, pending blockers, rejected no-impact behavior, and mobile layout.

Remaining features:

- Add automated UI-adjacent tests for edit-clears-confirmation behavior.
- Add tests for batch close once implemented.
- Add UI-level tests for structured adjustment categories.
- Add export manifest file/download tests once the metadata helper is connected to an export artifact.

## Implementation Rules

- Do not allow close while any active row is unconfirmed.
- Do not let row edits preserve a prior confirmation unless the user explicitly confirms again.
- Do not export open months without draft labeling.
- Do not modify closed snapshots during unlock; unlock should stop using the snapshot and require re-close.
- Do not add payment tracking without preserving the original formal export state.

## Open Questions

- Which attendance import format should be supported first?
- Should batch close be all-or-nothing or close eligible stores only?
- Should payment status be tracked per store-month or per employee row?
- Should structured adjustments replace or coexist with the current special adjustment field?
