# Workspace-Operations - Description

## Module Name

Workspace-Operations

## Purpose

Implements store lifecycle management (create, rename, archive, restore), employee transfers across stores/months, and payroll month close/unlock with frozen snapshots and reasoned history tracking.

## Current Implementation

### Capabilities

**Store lifecycle**
- `createStore(workspace, { sourceStoreId, name, id, at })`: clones a new store from a source store's config, enforces name uniqueness, sets status to active, and records creation timestamp.
- `renameStore(workspace, { storeId, name })`: renames a store with uniqueness validation.
- `archiveStore(workspace, { storeId, month, at })`: archives a store. Refuses if it is the last active store, or if any active employee still has current or future assignments to it.
- `restoreStore(workspace, storeId)`: restores an archived store to active, clearing the archivedAt timestamp.

**Employee transfer**
- `transferEmployee(workspace, { employeeId, targetStoreId, effectiveMonth, currentMonth, at, assignmentId, note })`: moves an employee between stores starting from an effective month.
- Validates: effective month not before current month, target store is active and different from source, no conflicting future transfers, no closed months in the affected range, no duplicate employee data at target store for any affected month.
- Closes the current assignment at the month before the effective month, creates a new assignment for the target store.
- Moves the employee's monthly row data across all affected months from the source store to the target store.

**Month close and unlock**
- `closeStoreMonth(workspace, { storeId, month, rows, at, eventId, reason })`: freezes payroll for a store-month. Validates all employees confirmed, salaries set, and no validation errors. Writes a deep-cloned snapshot of rows, sets status to closed, and appends to closeHistory.
- `unlockStoreMonth(workspace, { storeId, month, at, eventId, reason })`: reopens a frozen month. Requires a non-empty reason string. Clears snapshot, sets status to open, and appends an unlock event to closeHistory.
- Both functions record event IDs, timestamps, and reasons in closeHistory for audit trail.

### Architecture

| File | Role |
|---|---|
| `src/workspaceOperations.js` | All store, transfer, close, and unlock functions in a single file. |

**Dependencies**

| Import | Source | Usage |
|---|---|---|
| `createOpenMonthlyStoreRecord` | `payrollData.js` | Normalizes month-store records during transfer and close/unlock |
| `getAssignmentAtMonth` | `payrollLogic.js` | Finds source assignment during transfer |
| `getMonthlyStoreRecord` | `payrollLogic.js` | Reads source/target records for transfer data movement |
| `previousMonth` | `payrollLogic.js` | Computes end month for old assignment during transfer |

**Key exports**

| Export | Type | Description |
|---|---|---|
| `createStore(ws, opts)` | function | Clone store from source |
| `renameStore(ws, opts)` | function | Rename existing store |
| `archiveStore(ws, opts)` | function | Archive store, guard last-active |
| `restoreStore(ws, id)` | function | Reactivate archived store |
| `transferEmployee(ws, opts)` | function | Move employee across stores/months |
| `closeStoreMonth(ws, opts)` | function | Freeze payroll month |
| `unlockStoreMonth(ws, opts)` | function | Unfreeze with reason |

**Workspace mutation pattern**

All operations follow an immutable pattern: they return a new workspace object with the mutated portion replaced, leaving the original workspace unmodified. Callers are responsible for saving the returned workspace.

**Store statuses**

- `active`: operational store, visible in payroll, accepts transfers and employees.
- `archived`: historical store, retains employees and history, excluded from active selection.

**Monthly record statuses**

- `open`: rows are editable, snapshot is null.
- `closed`: rows are frozen into snapshot, status is locked.

### Integration Points

- **App.jsx**: Calls all operations in response to user actions (create store, transfer, close/unlock).
- **payrollLogic.js**: Relies on workspace operations to produce the store/assignment/monthlyRecords state that payroll queries then read.
- **payrollData.js**: Uses `createOpenMonthlyStoreRecord()` for defensive normalization of records accessed during transfer and close/unlock.

### Current Limitations

- Employee transfers move all existing row data from all affected months; there is no selective or partial transfer.
- Transfer creates one new assignment; it does not support splitting an employee across multiple stores in the same month.
- Archive validation only checks active-employee assignments; resigned employees with historical assignments are not blocked.
- Close/unlock events use opaque `eventId` strings; there is no UUID generation or collision prevention in the operation itself.
- Transfer validation iterates all affected months' records synchronously; large monthly histories may impact performance.
- No undo/redo capability for any operation.

### Future Directions

- Support partial employee transfers (select specific months to move).
- Add operation-level UUID generation for event IDs.
- Support batch close for all stores in a month.
- Add undo/redo stack for workspace operations.
- Add transfer preview (dry-run) that shows affected months and data without committing.
- Add store config change propagation: bulk-update config across stores sharing a source config.
