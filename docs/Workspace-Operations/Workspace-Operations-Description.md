# Workspace-Operations Module Description

## Module Name

Workspace-Operations

## Purpose

Workspace-Operations contains the pure workspace mutation functions for store lifecycle, employee transfers, and payroll month close/unlock. It protects the local payroll workspace from destructive store deletion, invalid transfer plans, and accidental modification of closed payroll results.

## Current Implementation

The module is implemented in `src/workspaceOperations.js`. Every exported function accepts a workspace object and options, validates preconditions, and returns a new workspace object. It does not generate IDs, show UI, save files, or mutate React state directly; `src/App.jsx` handles those responsibilities.

### Capabilities

**Store lifecycle**

- `createStore(workspace, { sourceStoreId, name, id, at })` trims and validates the store name, prevents duplicate names, copies payroll config from an existing source store, and creates an active store.
- `renameStore(workspace, { storeId, name })` trims and validates the new name and prevents duplicates.
- `archiveStore(workspace, { storeId, month, at })` archives a store instead of deleting it.
- `archiveStore()` refuses to archive the last active store.
- `archiveStore()` refuses to archive a store that still has current or future assignments for non-resigned employees.
- `restoreStore(workspace, storeId)` marks a store active again and clears `archivedAt`.

**Employee transfer**

- `transferEmployee(workspace, { employeeId, targetStoreId, effectiveMonth, currentMonth, at, assignmentId, note })` creates a month-based transfer from the employee's source assignment to an active target store.
- Refuses transfers with an effective month before the current month.
- Refuses transfers to inactive, missing, or same-source stores.
- Refuses transfer when the employee already has a future assignment after `currentMonth`.
- Refuses transfer if any affected source or target month is closed.
- Refuses transfer if target monthly data already contains the employee row.
- Moves existing monthly row data from source store to target store for every affected open month at or after the effective month.
- Ends the previous assignment at `previousMonth(effectiveMonth)` and appends a new assignment with the provided ID and note.

**Payroll close and unlock**

- `closeStoreMonth(workspace, { storeId, month, rows, at, eventId, reason })` closes one store-month.
- Refuses close when any row lacks `entry.isComplete`, has unconfigured salary, or has validation issues.
- Writes a deep-cloned `snapshot` of the passed rows, stamps each row with current formula version metadata, and sets `status: "closed"`, `closedAt`, and `savedAt`.
- Appends a `{ id, type: "closed", at, reason }` event to `closeHistory`.
- `unlockStoreMonth(workspace, { storeId, month, at, eventId, reason })` requires a non-empty reason, sets the record back to `open`, clears `closedAt` and `snapshot`, and appends an unlock event.

## Architecture

Workspace-Operations is a pure operation layer over the workspace object. It depends on Payroll-Data for record normalization and Payroll-Logic for assignment/month helpers.

### Operation Layer (`src/workspaceOperations.js`)

- `createStore(workspace, options)`
  - Store creation and config cloning.
- `renameStore(workspace, options)`
  - Store name update.
- `archiveStore(workspace, options)`
  - Store archive guard and archive state update.
- `restoreStore(workspace, storeId)`
  - Archived store reactivation.
- `transferEmployee(workspace, options)`
  - Month-based assignment split and monthly row relocation.
- `closeStoreMonth(workspace, options)`
  - Month close validation, formula metadata stamping, and snapshot freezing.
- `unlockStoreMonth(workspace, options)`
  - Reasoned unlock and close history update.

### Dependencies

- `src/payrollData.js`
  - `createOpenMonthlyStoreRecord()` normalizes records before transfer, close, and unlock writes.
- `src/payrollLogic.js`
  - `getAssignmentAtMonth()` identifies the source assignment for transfer.
  - `getMonthlyStoreRecord()` reads existing month-store rows safely.
  - `previousMonth()` calculates assignment end months.

## Integration Points

- `src/App.jsx`
  - Generates IDs via `makeId()`, calls operations in event handlers, sets React state, shows notices, and creates automatic backups after month close.
- `src/pages/SettingsPage.jsx`
  - Triggers create, rename, archive, and restore through props from `App.jsx`.
- `src/pages/EmployeesPage.jsx`
  - Triggers transfer and resignation modals through props from `App.jsx`.
- `src/pages/PayrollPage.jsx`
  - Triggers close and unlock through props from `App.jsx`.
- `src/workspaceOperations.test.js`
  - Covers migration, store lifecycle, transfer, close, and unlock behavior.

## Current Limitations

- Employee resignation and restore are implemented directly in `App.jsx`, not in `workspaceOperations.js`.
- Salary adjustment creation is implemented directly in `App.jsx`, not in `workspaceOperations.js`.
- Store config changes and rule history creation are implemented directly in `App.jsx`, not in `workspaceOperations.js`.
- Operations depend on caller-provided IDs and do not prevent ID collisions internally.
- `restoreStore()` does not validate whether the store exists or whether restoring it conflicts with any future business rule.
- Transfers are all-or-future from the effective month; there is no partial-month, split-store, or selected-month transfer.
- A transfer is blocked if any future assignment exists after `currentMonth`; there is no edit/cancel flow for planned transfers.
- Close/unlock history is stored per month-store record, but there is no global operation log or undo stack.
- Batch close, batch transfer, and batch config propagation are not implemented.

## Future Directions

- Move resignation, salary adjustment, and store config updates into this operation layer.
- Add dry-run preview functions for archive, transfer, close, unlock, and restore.
- Add operation IDs and collision-safe ID generation or validation.
- Add batch close for all eligible stores in a month.
- Add planned transfer edit/cancel operations.
- Add global operation history for audit and optional undo.
