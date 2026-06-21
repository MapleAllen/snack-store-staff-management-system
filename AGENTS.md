# Repository Instructions

Run the local server and open the preview in the in-app browser for UI verification. Do not ask the user to start it when it can be run locally.

Preserve the current desktop-first split payroll workspace and its mobile card layout unless a task explicitly requests a redesign. Default content must use generic stores, fictional employees, and demonstration amounts.

## Product contracts

- Product name: 门店工资助手. Do not introduce third-party retailer branding or real store locations.
- Scope: overview, employee management, attendance, payroll, reports, and store payroll settings share one local workspace.
- Payroll is owner-first: surface next actions, blockers, exceptions, and payout confidence before formulas.
- Every employee entry requires explicit completion confirmation before store/month close.
- Resigned employees remain in history but are excluded from active payroll, reports, exports, and completion rates.
- Salary components change only through payroll adjustment records.
- Social security contribution is fixed and is not prorated by leave or folded into base salary.
- Stores are archived, not deleted; the final active store cannot be archived.
- Employee transfers use stable identities and month-based store assignments.
- Closed payroll uses frozen snapshots; unlocking requires a recorded reason.
- Distinguish estimated, confirmed, and closed totals; open-month exports are drafts.
- New employees remain salary-pending until all salary components are recorded.
- Desktop recovery points are created at daily startup, before restore, and after payroll close.
- Data is local and unencrypted. Do not add cloud sync or auto-update without an explicit product decision.
- Public releases are source-only until a signed Windows channel and real-device regression process exist.
