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
- Store-month close freezes snapshots and unlock requires a reason.
- Draft/formal CSV export status is explicit.

## Phase 2: Review Transparency — NOT STARTED

Status: **Not Started**

Goals:

- Make every payroll amount explainable without requiring code knowledge.

Remaining features:

- Add formula trace steps to the employee detail panel.
- Add source field labels for every deduction and addition.
- Add rounding explanations for each monetary step.
- Add close confirmation summary grouped by blockers, review-only exceptions, and clean rows.

## Phase 3: Structured Adjustments and Attendance Import — NOT STARTED

Status: **Not Started**

Goals:

- Replace free-form payroll exceptions with structured commercial workflows.

Remaining features:

- Add categorized one-time payroll adjustments with reason, amount, and approval status.
- Add attendance import preview for CSV or spreadsheet-like files.
- Add duplicate employee and invalid date detection during import.
- Add tests for import validation without applying changes.

## Phase 4: Batch Close and Payment Handoff — NOT STARTED

Status: **Not Started**

Goals:

- Let owners close and hand off payroll across all stores efficiently.

Remaining features:

- Add all-store close readiness from the overview dashboard.
- Add batch close operation with per-store blocker report.
- Add multi-store export package for closed months.
- Add payment status tracking: not exported, exported, paid, corrected.

## Phase 5: Payroll Audit Trail — NOT STARTED

Status: **Not Started**

Goals:

- Make payroll changes traceable for commercial support and owner review.

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

Remaining features:

- Add UI-adjacent tests for edit-clears-confirmation behavior.
- Add tests for batch close once implemented.
- Add tests for structured adjustment categories.
- Add export manifest tests.

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
