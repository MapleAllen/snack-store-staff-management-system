# Employee and Store Operations

## Ownership

Owner: UNASSIGNED
Dependencies: Core payroll blockers and issue codes stable
Working branch: `main`
Status: NOT STARTED

## Goal

补齐人员和门店商业运营能力，并把关键 workspace mutation 从 `App.jsx` 下沉到可测试、可预览、可审计的 operation 层。

## Allowed Files

- `src/payrollData.js`
- `src/workspaceOperations.js`
- `src/payrollLogic.js`
- `src/App.jsx`
- `src/pages/EmployeesPage.jsx`
- `src/pages/SettingsPage.jsx`
- `src/workspaceOperations.test.js`
- `src/payrollLogic.test.js`
- Related docs under `docs/Employee-Management/`, `docs/Store-Management/`, `docs/Workspace-Operations/`, `docs/Payroll-Data/`

## Do Not Modify Without Re-Planning

- Backup envelope compatibility.
- Closed snapshot semantics.
- Public release or signing workflow.

## Subgoals

- Add commercial employee fields with safe migration defaults.
- Add employment lifecycle records for hire, resignation, restore, and rehire.
- Add store metadata, archive reason, restore reason, and store lifecycle timeline.
- Move resignation, salary adjustment, and store config changes into `workspaceOperations.js`.
- Add operation previews for transfer, archive, close, config change, and restore.
- Add bulk roster import/export and store rule propagation after operation layer is stable.

## Acceptance Criteria

- Existing workspaces migrate without invented real-world employee data.
- Resigned employees remain excluded from active payroll, reports, exports, and completion rates.
- Salary changes still create adjustment records.
- Store rule changes create rule history inside an operation function.
- Operation previews report blockers without mutating workspace.
- Tests cover employee lifecycle, store lifecycle, config update, and operation previews.

## Verification

- `npm run check`
- Migration fixture tests for old and current workspaces.
- Manual Web preview for employee cards, transfer modal, resignation modal, settings store cards, and payroll eligibility.
- Windows desktop regression if migration or backup restore data shape changes.

## Open Questions

- Which employee fields are required before commercial launch?
- Should bank or identity data be stored locally, or tracked only as external checklist state?
- Should store config templates be workspace-global or copied into each store?
- Should rehire preserve the same employee ID in all cases?
