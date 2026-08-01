# Payroll-Data Module Description

## Module Name

Payroll-Data

## Purpose

Payroll-Data defines the local workspace data model for 门店工资助手. It gives the app a canonical shape for stores, employees, month-based assignments, salary adjustment records, payroll rows, close snapshots, and demo data so the renderer, storage layer, backup layer, and business operations can read and mutate the same local workspace safely.

## Current Implementation

The module is implemented in `src/payrollData.js`. It exports schema constants, generic demonstration templates, default row factories, workspace creation, migration, and UI metadata. It does not persist data directly and does not validate backup envelopes; persistence is handled by `src/storageAdapter.js` and Electron stores, while backup envelope validation is handled by `shared/backup-format.js`.

### Capabilities

**Workspace identity and versioning**

- Exports `WORKSPACE_VERSION = 28` as the current workspace schema version.
- Exports `INITIAL_ASSIGNMENT_MONTH = "2000-01"` for seed assignment history.
- Provides `createDefaultMonthValue(date = new Date())`, returning `YYYY-MM` for UI month selectors.

**Default store and payroll row shape**

- Defines `DEFAULT_STORE_CONFIG` with `socialInsuranceBase: 800`, `mealAllowanceBase: 200`, `auditPassedBonus: 200`, `auditFallbackBonus: 100`, `nightShiftRate: 0`, `leaveDaysDivisor: 30`, `leaveHoursDivisor: 270`, and `monthDays: 30`.
- Provides `defaultMonthlyEntry()` with string input fields for overtime, leave, night shift and legacy special adjustment, plus structured payroll adjustments, controlled attendance reason, completion, and confirmation time.
- Provides `createOpenMonthlyStoreRecord(record = {})` to normalize month-store records with `rows`, close state, frozen snapshot, close history, and the optional payout batch.

**Generic demo workspace**

- Defines four generic demo stores in `STORE_TEMPLATES`: `demo-store-1` through `demo-store-4`.
- Uses fictional store names, fictional employee names, and demonstration amounts only.
- Keeps legacy ID mappings (`erz`, `gcb`, `hns`, `jdz-ch`) for old backup migration without reintroducing real-store branding.
- `createInitialWorkspace()` builds stores, employees, assignments, empty `adjustments`, empty `ruleHistory`, and empty `monthlyRecords` from those templates.

**Migration and normalization**

- `migrateWorkspace(workspace)` returns the current v28 workspace shape and normalizes stores, employees, assignments, adjustments, rule history, operation logs, monthly records, optional payout rows, and legacy operating records.
- `migrateLegacyWorkspace(workspace)` handles older workspaces that do not have `assignments` by reconstructing employees and initial store assignments from legacy nested store data.
- `normalizeEmployee(employee)` sets `salaryConfigured` to true unless the existing record explicitly has `salaryConfigured: false`.
- `normalizeStore(store)` merges every store config with `DEFAULT_STORE_CONFIG` and normalizes `status`, `createdAt`, and `archivedAt`.
- `normalizeMonthlyRecords(monthlyRecords)` applies `createOpenMonthlyStoreRecord()` to every month-store record.

**UI metadata**

- `VIEW_OPTIONS` defines the three payroll workbench tabs: `payroll`, `employees`, and `adjustments`.
- `EMPLOYEE_FIELDS` defines salary component metadata for base salary, overtime rate, and attendance bonus, including input step values.

## Architecture

Payroll-Data is a single-file data contract and migration module. It is intentionally free of React state, IPC, filesystem access, and DOM behavior.

### Data Contract (`src/payrollData.js`)

- `WORKSPACE_VERSION`
  - Numeric schema version used by workspace creation and migration.
- `DEFAULT_STORE_CONFIG`
  - Default payroll calculation parameters used by stores and settings.
- `STORE_TEMPLATES`
  - Generic demo data and legacy ID mappings.
- `createInitialWorkspace()`
  - Builds the default local workspace.
- `defaultMonthlyEntry()`
  - Produces the blank editable row state for an employee-month.
- `createOpenMonthlyStoreRecord(record)`
  - Normalizes open and closed store-month records.
- `migrateWorkspace(workspace)`
  - Converts old and current workspace-like input into the current versioned shape.
- `mergeWorkspaceWithTemplates`
  - Alias of `migrateWorkspace`; retained for compatibility with older import names.
- `VIEW_OPTIONS` and `EMPLOYEE_FIELDS`
  - UI-facing metadata consumed by payroll and adjustment forms.

### Workspace Schema

```js
{
  version: 28,
  stores: [{ id, name, config, status, createdAt, archivedAt }],
  employees: [{
    id, name, baseSalary, overtimeRate, attendanceBonus,
    salaryConfigured, isResigned, resignationDate
  }],
  assignments: [{ id, employeeId, storeId, startMonth, endMonth, createdAt, reason }],
  adjustments: [{
    id, employeeId, employeeName, storeId, item, itemLabel,
    previousValue, newValue, changes, date, reason
  }],
  ruleHistory: [{ id, storeId, key, label, previousValue, newValue, at }],
  operationLog: [{ id, type, storeId, employeeId, memberCode, month, businessDate, key, at }],
  monthlyRecords: {
    [month]: {
      [storeId]: {
        rows, savedAt, status, closedAt, snapshot, closeHistory,
        payout: {
          id, status, plannedPayDate, method, reference, createdAt, completedAt,
          rows: { [employeeId]: { paymentStatus, paymentUpdatedAt, payslipStatus, payslipUpdatedAt } }
        } | null
      }
    }
  }
}
```

## Integration Points

- `src/payrollLogic.js`
  - Reads employee, store config, assignment, and monthly record shapes to calculate rows and summaries.
- `src/workspaceOperations.js`
  - Uses monthly record normalization when transferring employees, closing months, and unlocking months.
- `src/App.jsx`
  - Uses `createInitialWorkspace()`, `migrateWorkspace()`, `createOpenMonthlyStoreRecord()`, `defaultMonthlyEntry()`, `EMPLOYEE_FIELDS`, and UI metadata.
- `src/storageAdapter.js`
  - Calls `createInitialWorkspace()` for missing local data and `migrateWorkspace()` after desktop or browser load.
- `shared/backup-format.js`
  - Validates the outer backup/workspace envelope and basic workspace structure before migration.

## Current Limitations

- Workspace migration is still a broad normalization function rather than an explicit version-by-version migration chain.
- Structural validation is split: `shared/backup-format.js` validates basic top-level shape, while `migrateWorkspace()` normalizes deeper structures.
- Employee profiles store payroll-critical fields plus profile fields: name, phone, employee number, role, and hire date; there is no bank account, contract status, or document attachment model.
- Salary component mutation is enforced by UI flow and adjustment records in `App.jsx`, not by the data module itself.
- Legacy migration depends on template legacy ID mappings for known old stores; unknown legacy stores are carried forward with default config normalization only.
- `mergeWorkspaceWithTemplates` is a compatibility alias and does not add behavior beyond `migrateWorkspace()`.
- There is no immutable TypeScript or JSON Schema contract; workspace shape is documented and tested but not compile-time enforced.

## Future Directions

- Add explicit version-step migrations for every future `WORKSPACE_VERSION` change.
- Add a shared `validateWorkspaceStructure(workspace)` result with warnings and fatal errors.
- Add richer employee profile fields required for commercial payroll administration.
- Add workspace metadata such as created version, last migrated version, and last saved app version.
- Replace `mergeWorkspaceWithTemplates` with a single canonical import path after confirming no consumers remain.
- Add schema fixtures for current, previous, and legacy workspace versions.
