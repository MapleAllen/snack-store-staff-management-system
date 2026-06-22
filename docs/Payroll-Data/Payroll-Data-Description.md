# Payroll-Data - Description

## Module Name

Payroll-Data

## Purpose

Defines the workspace data model, version tracking, demo-store templates, employee schemas, monthly record structures, and migration logic for the payroll system. This module is the canonical source of truth for the shape and version of persisted workspace data.

## Current Implementation

### Capabilities

**Workspace version and constants**
- Exports `WORKSPACE_VERSION = 3` as the current data schema version.
- Defines `INITIAL_ASSIGNMENT_MONTH = "2000-01"` as the default start month for initial assignments.
- Exports `STORAGE_KEY`, `BACKUP_TYPE`, `BACKUP_REASONS` via re-export from `shared/backup-format.js`.

**Default store configuration**
- `DEFAULT_STORE_CONFIG` provides baseline salary rule values: `socialInsuranceBase: 800`, `mealAllowanceBase: 200`, `auditPassedBonus: 200`, `auditFallbackBonus: 100`, `nightShiftRate: 0`, `leaveDaysDivisor: 30`, `leaveHoursDivisor: 270`, `monthDays: 30`.

**Demo store templates**
- Four demo stores (`demo-store-1` through `demo-store-4`) with legacy ID mappings, distinct names, optional config overrides, and fictional employee rosters.
- Each employee template specifies `id`, `name`, `baseSalary`, `overtimeRate`, `attendanceBonus`.
- Templates drive initial workspace creation and legacy workspace migration.

**Workspace construction**
- `createInitialWorkspace()` generates a fresh workspace from `STORE_TEMPLATES` with stores, employees, assignments, adjustments, and monthlyRecords.
- `createOpenMonthlyStoreRecord(record)` normalizes a single month-store record, enforcing `open`/`closed` status, snapshot preservation, and closeHistory arrays.
- `defaultMonthlyEntry()` returns a blank payroll entry with empty string fields (overtimeHours, leaveDays, leaveHours, nightShiftHours, specialAdjustment, note) and `isComplete: false`.

**Migration and normalization**
- `migrateWorkspace(workspace)` normalizes an existing workspace to current `WORKSPACE_VERSION`, canonicalizing store configs, employee salaryConfigured flags, and monthly records.
- The migration path forks on `workspace.assignments` presence: if absent, `migrateLegacyWorkspace()` reconstructs stores, employees, and assignments from legacy store templates + existing data.
- `mergeWorkspaceWithTemplates` is an alias for `migrateWorkspace`.
- Individual normalizers: `normalizeStore()`, `normalizeEmployee()`, `normalizeMonthlyRecords()`.

**UI constants**
- `VIEW_OPTIONS` defines payroll/employees/adjustments view tabs.
- `EMPLOYEE_FIELDS` defines editable salary field metadata with step granularity.

### Architecture

**Files**

| File | Role |
|---|---|
| `src/payrollData.js` | Single-file module containing all workspace data definitions, templates, normalizers, and migration logic. |
| `shared/backup-format.js` | Referenced for `STORAGE_KEY`, `BACKUP_TYPE`, `BACKUP_REASONS` re-exports. |

**Key exports**

| Export | Type | Description |
|---|---|---|
| `WORKSPACE_VERSION` | number (3) | Current data schema version |
| `DEFAULT_STORE_CONFIG` | object | Baseline salary rule defaults |
| `STORE_TEMPLATES` | array | Demo stores with employees |
| `createInitialWorkspace()` | function | Fresh workspace from templates |
| `createOpenMonthlyStoreRecord(record)` | function | Normalized month-store record |
| `defaultMonthlyEntry()` | function | Blank payroll entry |
| `migrateWorkspace(workspace)` | function | Version-aware migration |
| `mergeWorkspaceWithTemplates` | alias | Same as migrateWorkspace |
| `createDefaultMonthValue(date?)` | function | YYYY-MM from Date |
| `VIEW_OPTIONS` | array | View tab configuration |
| `EMPLOYEE_FIELDS` | array | Salary field definitions |

**Workspace schema**

```
{
  version: WORKSPACE_VERSION,
  stores: [{ id, name, config, status, createdAt, archivedAt }],
  employees: [{ id, name, baseSalary, overtimeRate, attendanceBonus, salaryConfigured, isResigned? }],
  assignments: [{ id, employeeId, storeId, startMonth, endMonth, createdAt, note }],
  adjustments: [{ id, employeeId, storeId, date, values, notes }],
  ruleHistory: [{ ... }],
  monthlyRecords: { [month]: { [storeId]: { rows, savedAt, status, closedAt, snapshot, closeHistory } } }
}
```

### Integration Points

- **payrollLogic.js**: Consumes workspace shape (employees, config, monthlyRecords) for calculation, validation, and row construction.
- **workspaceOperations.js**: Mutates stores, assignments, and monthlyRecords; relies on `createOpenMonthlyStoreRecord()` for normalizing target records.
- **storageAdapter.js**: Calls `createInitialWorkspace()` for first-launch data and `migrateWorkspace()` on every load.
- **backup-format.js**: Re-exports `STORAGE_KEY`, `BACKUP_TYPE`, `BACKUP_REASONS` for use by backup validation and App.jsx backup flows.

### Current Limitations

- Legacy migration depends on matching legacy store IDs to `STORE_TEMPLATES`; stores not present in templates are carried forward as-is but may have incomplete config normalization.
- No mechanism for custom, non-demo store templates; all new stores clone config from an existing store via `workspaceOperations.createStore()`.
- Monthly record normalization does defensive defaulting with `record.rows ?? {}`, which may mask unexpectedly missing row data.
- `mergeWorkspaceWithTemplates` alias is vestigial and semantically identical to `migrateWorkspace`.

### Future Directions

- Add `WORKSPACE_VERSION` changelog and version-by-version migration steps.
- Support user-defined store templates beyond the demo set.
- Unify normalization and migration into a single canonical import path.
- Add structural validation for workspace shape that can be called independently of migration.
- Support read-only workspace access for audit or import preview.
- Remove or replace the `mergeWorkspaceWithTemplates` alias.
