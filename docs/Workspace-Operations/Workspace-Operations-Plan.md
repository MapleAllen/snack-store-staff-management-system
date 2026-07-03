# Workspace-Operations Plan

## Objective

Provide a complete, auditable operation layer for all local workspace mutations so commercial payroll workflows can be validated, previewed, applied, logged, and tested consistently outside of React UI event handlers.

## Design Principles

- Operations are immutable: every operation returns a new workspace and leaves the input untouched.
- Validation happens before mutation: operations either fail early or apply a complete valid change.
- Store history is preserved: stores are archived, never deleted.
- Employee identity is stable: transfers change assignments, not employee IDs.
- Payroll close is strict: unconfirmed, invalid, or salary-pending rows cannot close.
- Closed snapshots are immutable: unlock requires a reason and stops using the old snapshot.
- UI does not own business rules: commercial-grade mutations should live in the operation layer, not only in `App.jsx`.

## Phase 1: Store Lifecycle and Month Close Foundation — DONE

Status: **Done**

Goals:

- Provide safe store lifecycle and month close primitives.

Completed work:

- Store create, rename, archive, and restore are implemented.
- Archive refuses the final active store and stores with active current/future employee assignments.
- Month close validates completion, salary setup, and validation issues before snapshot freeze.
- Unlock requires a reason and records close history.

## Phase 2: Month-Based Employee Transfer — DONE

Status: **Done**

Goals:

- Preserve stable employee identities while moving employees between stores by month.

Completed work:

- `transferEmployee()` splits assignments at an effective month.
- Transfer blocks closed affected months and duplicate target monthly rows.
- Transfer relocates existing open monthly row data from source to target stores.
- Tests verify current-month data movement, assignment history preservation, and closed-month blocking.

## Phase 3: Consolidate Remaining Workspace Mutations — NOT STARTED

Status: **Not Started**

Goals:

- Move business-critical mutations out of `App.jsx` into tested operation functions.

Remaining features:

- Add `resignEmployee(workspace, options)` and `restoreEmployee(workspace, options)`.
- Add `recordSalaryAdjustment(workspace, options)` that updates employee salary fields and appends adjustment history atomically.
- Add `updateStoreConfig(workspace, options)` that validates config and appends rule history atomically.
- Add tests for resignation exclusion, salary-pending setup, adjustment records, and rule history creation.

## Phase 4: Preview and Dry-Run Operations — NOT STARTED

Status: **Not Started**

Goals:

- Let the UI show consequences before the user commits potentially disruptive changes.

Remaining features:

- Add `previewArchiveStore()` with affected employees and archive blockers.
- Add `previewTransferEmployee()` with affected months, rows to move, and closed-month blockers.
- Add `previewCloseStoreMonth()` with blockers grouped by employee and reason.
- Add `previewWorkspaceRestore()` comparing current and backup workspace metadata.
- Make preview outputs stable enough for tests and UI summaries.

## Phase 5: Batch Operations — NOT STARTED

Status: **Not Started**

Goals:

- Support efficient multi-store workflows without compromising validation.

Remaining features:

- Add `closeAllStoresForMonth(workspace, month)` with all-or-report behavior and per-store blocker output.
- Add `bulkTransferEmployees(workspace, transfers)` with full preflight validation before applying any transfer.
- Add batch store config propagation for selected stores.
- Add conflict reports for batch operations instead of partial silent failure.

## Phase 6: Operation Audit and Undo — NOT STARTED

Status: **Not Started**

Goals:

- Make critical changes traceable and recoverable inside the local workspace.

Remaining features:

- Add a workspace-level operation log for close, unlock, transfer, resignation, salary adjustment, config change, restore, and demo reset.
- Add optional undo for the most recent eligible operation, with snapshots or inverse operations.
- Add reason fields for archive, transfer, resignation, unlock, restore, and destructive reset operations.
- Add audit export for operation history.

## Phase 7: Testing Strategy — PARTIALLY COMPLETED

Status: **Partially Completed**

Goals:

- Make operation behavior regression-resistant.

Completed work:

- Existing tests cover store lifecycle, transfer, close, unlock, and migration interactions.

Remaining features:

- Add tests for duplicate store name, missing source store, and empty store name.
- Add tests for archive with planned future assignments and resigned historical employees.
- Add tests for planned transfer conflicts and edit/cancel behavior once implemented.
- Add tests for salary adjustment operation and rule history operation once moved from `App.jsx`.
- Add batch operation all-or-report tests.

## Implementation Rules

- Do not allow store deletion; use archive status only.
- Do not allow archive of the final active store.
- Do not close a store-month unless every active row is confirmed, salary-configured, and valid.
- Do not move monthly row data across closed source or target months.
- Do not mutate salary components without creating an adjustment record.
- Do not let UI-only logic become the sole enforcement point for commercial payroll rules.

## Open Questions

- Should batch close be all-or-nothing, or close eligible stores while reporting blocked stores?
- Should planned transfers be editable, cancelable, or superseded by a new transfer record?
- How deep should undo history be for a local payroll workspace?
- Should operation logs be included in backups and exports by default?
