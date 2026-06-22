# Workspace-Operations - Plan

## Objective

Provide reliable, auditable, and user-safe store/employee lifecycle operations where every mutation is validated, traceable, and reversible within a single-user local workspace context.

## Design Principles

- **Immutability**: Every operation returns a new workspace; the original is never mutated in place.
- **Validation-first**: All preconditions are checked before any data is modified.
- **Audit trail mandatory**: Every close and unlock writes a timestamped, reasoned event to closeHistory.
- **No silent data loss**: Employee transfer preserves all existing row data; archive preserves store history.
- **Guard the last active store**: At least one store must remain active at all times.
- **Snapshot integrity**: Frozen payroll snapshots are deep-cloned and never recomputed from live data.

## Phases

### Phase 1: Core Store Lifecycle — DONE

Completed work:
- Store create with name uniqueness and config cloning: `workspaceOperations.js:4-16`.
- Store rename with name uniqueness: `workspaceOperations.js:18-23`.
- Store archive with last-active guard and active-employee check: `workspaceOperations.js:25-34`.
- Store restore to active: `workspaceOperations.js:36-38`.

### Phase 2: Employee Transfers and Month Close — DONE

Completed work:
- Employee transfer with month-level validation, row relocation, and assignment management: `workspaceOperations.js:40-74`.
- Month close with completion/validation blockers and snapshot freezing: `workspaceOperations.js:76-96`.
- Month unlock with required reason: `workspaceOperations.js:98-115`.
- Close/unlock event recording in closeHistory: both operations.

### Phase 3: Operation Safety and Preview — NOT STARTED

Goal: Add dry-run preview and undo support for irreversible operations.

Tasks:
- Add `previewTransfer(ws, opts)` returning affected months, employee count, and data that would be moved.
- Add `previewClose(ws, opts)` returning blocker list before committing close.
- Add operation-level undo for the most recent close/unlock/transfer within a configurable window.
- Record undo eligibility in closeHistory and a dedicated undo log.
- Add confirmation dialogs with preview summaries before destructive operations.

### Phase 4: Batch and Bulk Operations — NOT STARTED

Goal: Support multi-store and multi-employee operations from the overview dashboard.

Tasks:
- Add `closeAllStoresForMonth(ws, month)` that closes all open stores in sequence, reporting per-store blockers.
- Add `bulkTransferEmployees(ws, transfers[])` that validates all transfers before applying any.
- Add partial transfer support: select specific months to transfer an employee rather than all future months.
- Add batch store config update: propagate a config change from one store to select others.

### Phase 5: Config Propagation and Store Templates — NOT STARTED

Goal: Allow operators to define and propagate salary rule changes across stores.

Tasks:
- Add `updateStoreConfig(ws, { storeId, configChanges })` with validation.
- Add `propagateConfig(ws, { sourceStoreId, targetStoreIds })` to clone config to target stores.
- Track config change history per store.
- Support user-defined store templates (beyond demo templates in payrollData.js).

### Phase 6: Testing Strategy — PARTIALLY COMPLETED

Completed work:
- Existing tests cover migration, store lifecycle, transfer, close/unlock: `workspaceOperations.test.js` — 7 tests.

Remaining tasks:
- Add tests for concurrent transfer conflicts.
- Add tests for archive with resigned-employee historical assignments.
- Add tests for close with edge-case rows (all empty, all invalid, some confirmed).
- Add tests for unlock with empty reason rejection.
- Add tests for multi-month transfer across partially closed months.
- Add tests for `createStore()` with duplicate name, missing source, empty name.

## Implementation Rules

- Do not remove `closeHistory` from the monthly record shape — it is the sole audit trail.
- Do not allow close if any employee row in the store has unconfigured salary, validation errors, or unconfirmed entry.
- Do not allow transfer across months that are already closed for either source or target store.
- Do not allow archive of the last active store.
- Do not change snapshot deep-clone strategy without verifying that existing frozen snapshots remain immutable.

## Open Questions

- Should undo be limited to the single most recent operation, or support a configurable undo depth?
- Should batch-close support partial success (some stores close, some fail with blockers)?
- Should config propagation apply to closed months (historical records) or only forward from the current month?
