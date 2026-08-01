# Workspace-Operations Module Description

## Purpose

`src/workspaceOperations.js` is the pure mutation layer for the local payroll workspace. It manages store lifecycle, anonymous employee employment changes, salary adjustments, month-based transfers, payroll rule changes, close/unlock snapshots, and post-close payout handoff.

## Store Lifecycle

- Stores are created by copying payroll rules from an existing store.
- Names are trimmed and must be unique.
- Stores are archived instead of deleted; the final active store cannot be archived.
- A store with a current or future assignment for a non-resigned employee cannot be archived.
- Archiving is governed solely by payroll scope. Product, sales, procurement, inventory, expenses, and daily business close do not block it.

## Payroll Safety

- Salary changes create adjustment records with controlled reasons.
- Transfers preserve stable employee identities and move open-month records from the effective month.
- Close validates salary configuration, input validity, and explicit employee confirmation, then freezes a payroll snapshot.
- Unlock requires a reason and records the event in close history and the privacy-minimized operation log.
- `createPayoutBatch()` requires a non-empty frozen snapshot and creates one row for every closed employee.
- `updatePayoutRow()` records payment and payslip delivery state and derives store-month payout progress.
- A payroll month cannot be unlocked after any employee is recorded as paid; a future correction flow must preserve the original payment evidence.

## Integration

`App.jsx` generates IDs, updates React state, displays notices, and triggers local recovery points. `SettingsPage`, `EmployeesPage`, and `PayrollPage` invoke these operations through App callbacks.
