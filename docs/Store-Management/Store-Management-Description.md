# Store-Management Module Description

## Module Name

Store-Management

## Purpose

Store-Management controls the local multi-store workspace. It lets owners create stores, rename stores, archive stores without deleting history, restore archived stores, and configure per-store payroll rules that feed payroll calculation.

## Current Implementation

Store management is implemented through `src/pages/SettingsPage.jsx`, store handlers in `src/App.jsx`, store operations in `src/workspaceOperations.js`, and store config validation in `src/payrollLogic.js`. Active store selection is shown in the top bar in `src/App.jsx` and drives all major pages.

### Capabilities

**Store lifecycle**

- Stores are stored in `workspace.stores` with `id`, `name`, `config`, `status`, `createdAt`, and `archivedAt`.
- `createStore()` creates a new active store and copies payroll config from the current source store.
- `renameStore()` changes store name with duplicate-name validation.
- `archiveStore()` changes status to `archived` and preserves all historical data.
- `restoreStore()` changes status back to `active`.
- The final active store cannot be archived.
- Stores with active current or future employee assignments cannot be archived until employees are transferred or resigned.

**Active store selection**

- `App.jsx` derives `activeStores` from `workspace.stores.filter(status === "active")`.
- Topbar store selector only includes active stores.
- Most pages operate on the active store and active month.
- Archived stores are hidden from daily payroll entry but can appear in reports when the user enables `includeArchived`.

**Payroll rule configuration**

- `SettingsPage.jsx` exposes store-specific payroll config fields: social insurance base, meal allowance base, audit passed bonus, audit fallback bonus, night shift rate, leave days divisor, and leave hours divisor.
- `patchStoreConfig(key, value)` in `App.jsx` validates config using `validateStoreConfig()`.
- Successful config changes append a rule-history record to `workspace.ruleHistory`.
- Closed payroll snapshots are not recalculated after config changes.

**Backup and settings context**

- Store management lives on the same Settings page as backup, automatic recovery point, PIN, and demo reset controls.
- Store create/edit/archive/restore actions are exposed as Settings page callbacks from `App.jsx`.

## Architecture

Store-Management is split between UI, App-level orchestration, and pure operations.

### UI (`src/pages/SettingsPage.jsx`, `src/App.jsx`)

- `SettingsPage.jsx`
  - Renders store management cards and payroll rule inputs.
  - Maintains local draft values and field errors for config inputs.
  - Calls store lifecycle and config callbacks from `App.jsx`.
- `App.jsx`
  - Owns active store selection, store modals, archive confirmation, and rule history updates.
  - Renders the topbar active store selector.

### Operations (`src/workspaceOperations.js`)

- `createStore(workspace, options)`
  - Creates stores by copying source config.
- `renameStore(workspace, options)`
  - Renames stores.
- `archiveStore(workspace, options)`
  - Applies archive guard rules.
- `restoreStore(workspace, storeId)`
  - Restores archived stores.

### Validation (`src/payrollLogic.js`)

- `validateStoreConfig(config)`
  - Ensures allowance/bonus/rate values are non-negative and divisors are positive.

## Integration Points

- `src/payrollData.js`
  - Provides `DEFAULT_STORE_CONFIG` and generic `STORE_TEMPLATES`.
- `src/payrollLogic.js`
  - Uses each store's config to calculate payroll rows.
- `src/pages/HomePage.jsx`
  - Summarizes active stores only.
- `src/pages/ReportsPage.jsx`
  - Can include archived stores in report view.
- `src/workspaceOperations.test.js`
  - Tests store creation, archive, and restore.

## Current Limitations

- New stores can only clone config from an existing store; there is no user-defined store template library.
- Store metadata is limited to name, status, timestamps, and config.
- Archive reason is not recorded.
- Restoring a store does not require a reason and does not validate future business constraints.
- Config changes are immediate; there is no impact preview for open payroll rows.
- Rule history records are created in `App.jsx`, not in a tested operation function.
- No batch config propagation across stores.
- No support for store groups, regions, owners, payroll contacts, or business identifiers.

## Future Directions

- Add archive and restore reason tracking.
- Move config updates and rule history into `workspaceOperations.js`.
- Add store metadata for commercial administration.
- Add user-defined payroll rule templates.
- Add config impact preview before saving rule changes.
- Add batch config propagation across selected stores.
- Add store-level audit timeline.
