# Employee-Management Module Description

## Module Name

Employee-Management

## Purpose

Employee-Management maintains employee identities, current store assignment, salary setup state, resignation state, transfer history, and salary adjustment history. It ensures payroll uses stable employee records while excluding resigned employees from active payroll and reports.

## Current Implementation

Employee management is implemented through `src/pages/EmployeesPage.jsx`, employee-related handlers in `src/App.jsx`, assignment helpers in `src/payrollLogic.js`, and transfer support in `src/workspaceOperations.js`. Employee records live in the workspace `employees` array and are linked to stores through month-based `assignments`.

### Capabilities

**Employee list and filters**

- `EmployeesPage.jsx` displays employees with current or historical assignment to the active store.
- Supports search by employee name.
- Supports filters for all employees, current active employees, salary-pending employees, and history employees.
- Shows salary status, current/historical store status, planned transfer notices, and assignment history.

**Employee creation and editing**

- `submitEmployee()` in `App.jsx` creates a new employee with `salaryConfigured: false`, zero salary components, and an assignment to the active store starting in the current month.
- New employee flow immediately opens the initial salary adjustment modal.
- Employee profile editing validates required name, phone format, and employee-number uniqueness, then calls `updateEmployeeProfile()` and records an audit event.
- Payroll salary fields are not edited directly in the employee form.

**Salary setup and adjustment**

- `openAdjustmentModal()` opens initial salary or adjustment mode.
- `submitAdjustment()` validates base salary, overtime rate, and attendance bonus.
- Adjustment submission updates current employee salary fields and prepends an adjustment record to workspace `adjustments`.
- Payroll views and employee pages show recent adjustment records.

**Resignation and restore**

- `submitResignation()` sets `isResigned` and `resignationDate` or clears them for restore.
- Resigned employees remain in history.
- `getEmployeesForStore()` excludes resigned employees by default from payroll rows and active reports.

**Employee transfers**

- `openTransferModal()` starts a transfer when another active store exists and the employee has no future transfer.
- `submitTransfer()` calls `transferEmployee()` to create a month-based assignment change and move existing open monthly row data.
- Assignment history is shown in employee cards.

## Architecture

Employee-Management is currently a combination of page UI, App-level form handlers, payroll query helpers, and workspace transfer operations.

### UI (`src/pages/EmployeesPage.jsx`)

- Uses `useState()` for search and status filter.
- Calls `getEmployeesWithStoreHistory()`, `getEmployeeAssignments()`, and `getAssignmentAtMonth()` to build employee cards.
- Delegates create, edit, transfer, and resignation actions to `App.jsx` via props.

### App Handlers (`src/App.jsx`)

- `submitEmployee(event)`
  - Creates employees and assignments with profile fields, or edits an existing employee profile via `updateEmployeeProfile()`.
- `submitAdjustment(event)`
  - Updates salary fields and records adjustment history.
- `handleToggleResignation(employee, shouldResign)` and `submitResignation(event)`
  - Manage resignation modal state and employee resignation fields.
- `openTransferModal(employee)` and `submitTransfer(event)`
  - Manage transfer modal state and call the transfer operation.

### Query and Operations (`src/payrollLogic.js`, `src/workspaceOperations.js`)

- `getEmployeesForStore()` excludes resigned employees by default.
- `getEmployeesWithStoreHistory()` includes historical employees for employee management.
- `transferEmployee()` updates assignments and future open monthly row data.

## Integration Points

- `docs/Payroll-Data/*`
  - Employee, assignment, and adjustment data model reference.
- `docs/Workspace-Operations/*`
  - Transfer and future operation-layer consolidation reference.
- `src/pages/PayrollPage.jsx`
  - Includes employee and adjustment tabs inside the payroll workbench.
- `src/pages/ReportsPage.jsx`
  - Uses payroll rows that exclude resigned employees by default.

## Current Limitations

- Employee profiles cover name, phone, employee number, role, and hire date plus three salary components; no contract status, bank information, document checklist, or free-text notes.
- Employee name is not globally validated for duplicates (employee numbers are).
- Resignation does not close or modify assignments; active payroll exclusion depends on `isResigned` filtering.
- Rehire history is represented by clearing resignation fields, not by a formal employment lifecycle record.
- Salary adjustment effective dates are recorded but current payroll uses current employee salary fields unless a month is closed.
- No bulk employee import/export or roster validation.

## Future Directions

- Add employment lifecycle records for hire, resignation, rehire, and status changes.
- Add duplicate-name warnings.
- Add bulk import with preview and rollback.
- Add employee detail history timeline covering assignments, salary adjustments, resignation, and payroll close participation.
