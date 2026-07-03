# Reporting, Export, and Audit

## Ownership

Owner: UNASSIGNED
Dependencies: Core payroll workflow export metadata hooks available
Working branch: `main`
Status: NOT STARTED

## Goal

建立商业月结后的报表、导出和审计证据链，让老板能按门店、月份和历史变化检查工资，同时生成可追踪的正式交付文件。

## Allowed Files

- `src/payrollLogic.js`
- `src/App.jsx`
- `src/pages/ReportsPage.jsx`
- `src/pages/HomePage.jsx`
- `src/pages/PayrollPage.jsx`
- `src/payrollLogic.test.js`
- Related docs under `docs/Reports-And-Exports/`, `docs/Payroll-Management/`, `docs/Overview-Dashboard/`

## Do Not Modify Without Re-Planning

- Backup restore semantics.
- Signed release pipeline.
- Employee profile schema, unless coordinating with Phase 3.

## Subgoals

- Add export manifests with app version, workspace version, store/month, status, row count, totals, and generation time.
- Add snapshot hash or row hash for formal closed exports.
- Add multi-store export package for a month.
- Add JSON report export and print-friendly owner summary.
- Add previous-month trend reporting for totals, overtime, leave, and adjustments.
- Add audit views for operation history after operation log exists.

## Acceptance Criteria

- Formal exports can be matched back to a closed snapshot and generation metadata.
- Draft exports remain clearly labeled and cannot be mistaken for final payroll.
- Multi-store export either requires all stores closed or clearly labels mixed status.
- Reports can include archived stores only through explicit user choice.
- Tests cover manifest totals, export status, closed snapshot immutability, and formula-injection safety.

## Verification

- `npm run check`
- Export fixture tests.
- Manual Windows Excel smoke check for CJK CSV rendering before release.
- Manual Web preview for reports and export flows.

## Open Questions

- Should all-store export produce a ZIP bundle, a folder-like multi-download, or a single combined file?
- Should owner summary include employee names by default?
- Should hashes be visible in UI or only inside machine-readable metadata?
