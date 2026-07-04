# Reports-And-Exports Plan

## Objective

Make reporting and export reliable enough for commercial payroll handoff: owners can understand monthly status across stores, export formal payroll with metadata, verify that files match frozen snapshots, and produce support/audit artifacts without exposing unnecessary personal data.

## Design Principles

- Report totals must preserve forecast, confirmed, and closed meanings.
- Open-month exports must be labeled as drafts.
- Closed-month exports must come from frozen snapshots.
- CSV compatibility matters for Windows users, but CSV should not be the only long-term format.
- Exports should carry enough metadata to prove scope, version, status, and generation time.
- Reports should avoid exposing employee-level detail unless the user intentionally drills down or exports payroll rows.

## Phase 1: Current Monthly Reports and CSV Export — DONE

Status: **Done**

Goals:

- Provide cross-store monthly status and a safe single-store CSV export.

Completed work:

- Report page summarizes active stores and optionally archived stores.
- Report page separates confirmed, forecast, and closed totals.
- Store report rows show blockers, review changes, overtime, deductions, and adjustments.
- Payroll CSV export labels draft vs formal status.
- CSV escaping protects against spreadsheet formula injection for string values.

## Phase 2: Export Metadata and Manifest — NOT STARTED

Status: **Not Started**

Goals:

- Make exported files auditable and easier to support.

Remaining features:

- Add export metadata including app version, workspace version, store ID/name, month, generated time, export status, row count, and totals.
- Add sidecar JSON manifest for CSV exports.
- Add closed snapshot hash for formal exports.
- Add tests that manifest totals match exported rows.

## Phase 3: Multi-Store Export Packages — NOT STARTED

Status: **Not Started**

Goals:

- Support month-end payroll handoff across all stores.

Remaining features:

- Add export all stores for a selected month.
- Include one CSV per store plus a summary manifest.
- Prevent formal multi-store export when any included store is not closed, or label mixed exports clearly.
- Add user confirmation for draft multi-store export.

## Phase 4: Structured and Print Formats — NOT STARTED

Status: **Not Started**

Goals:

- Provide formats beyond CSV for audit and owner review.

Remaining features:

- Add structured JSON report export.
- Add print-friendly monthly owner summary.
- Add optional PDF or browser print flow after print layout is stable.
- Add format versioning for future compatibility.

## Phase 5: Historical Reporting — NOT STARTED

Status: **Not Started**

Goals:

- Help owners compare payroll changes over time.

Remaining features:

- Add previous-month comparison for store totals.
- Add monthly trend view for payroll total, overtime, leave deductions, and special adjustments.
- Add closed-month report archive view.
- Add archived-store historical drill-down.

## Phase 6: Testing Strategy — PARTIALLY COMPLETED

Status: **Partially Completed**

Goals:

- Protect export correctness and safety.

Completed work:

- Existing tests cover `csvEscape()`, filename sanitization, export row validation behavior, and total stages.

Remaining features:

- Add tests for draft vs formal export filenames and metadata.
- Add tests for multi-store export package contents.
- Add tests for closed snapshot export immutability after config changes.
- Add Windows Excel smoke checks for CJK CSV rendering during release validation.

## Implementation Rules

- Do not export an open month as formal payroll.
- Do not calculate formal export rows from live data when a closed snapshot exists.
- Do not remove spreadsheet formula injection protection.
- Do not mix archived stores into operational reports without explicit user choice.
- Do not add binary export formats without round-trip or output validation.

## Open Questions

- Should multi-store exports include draft stores, or require all stores closed?
- Should export manifests be embedded in CSV comments, separate JSON sidecars, or both?
- Should employee-level details be included in owner summary exports by default?
- Which external payroll/accounting tools should shape future export formats?
