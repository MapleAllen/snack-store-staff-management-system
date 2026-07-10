# Core Payroll Workflow

## Ownership

Owner: OpenCode / macOS host
Dependencies: Documentation Sync complete
Working branch: `main`
Starting main SHA: `1277f635ab9659efccf16f5c989413b0521eec2d`
Target OS: macOS
Status: IN PROGRESS

## Goal

将工资管理从当前“可录入、确认、月结、导出”升级为“可解释、可审计、可批量处理、可正式交付”的核心商业能力。

## Allowed Files

- `src/payrollLogic.js`
- `src/workspaceOperations.js`
- `src/App.jsx`
- `src/pages/PayrollPage.jsx`
- `src/pages/AttendancePage.jsx`
- `src/pages/HomePage.jsx`
- `src/payrollLogic.test.js`
- `src/workspaceOperations.test.js`
- Related docs under `docs/Payroll-Logic/`, `docs/Payroll-Management/`, `docs/Overview-Dashboard/`
- Related docs under `docs/Reports-And-Exports/` when export handoff work updates report/export facts.

## Do Not Modify Without Re-Planning

- Electron storage, backup, signing, or release workflow files.
- Public release boundary docs.
- Payroll formulas in a way that changes closed snapshot interpretation.

## Subgoals

- Add calculation trace output for each payroll row. Status: DONE.
- Add formula version metadata to closed snapshots. Status: DONE for newly closed snapshot rows; legacy closed snapshots remain unchanged.
- Add machine-readable validation issues while preserving Chinese UI messages. Status: DONE.
- Add close confirmation summary grouped by blockers, review-only exceptions, and clean rows. Status: DONE.
- Add structured payroll adjustment categories beyond the current free numeric special adjustment. Status: DONE.
- Add attendance import preview and validation report.
- Add batch close readiness from the overview without bypassing per-store blockers. Status: DONE for read-only all-store readiness and overview reuse; batch close execution remains deferred.
- Add export metadata handoff points for Phase 4. Status: DONE.

## Acceptance Criteria

- Every displayed salary total can be traced to source fields and formula steps.
- Close blockers are structured by code, severity, field, and message.
- Export metadata exposes draft/formal status, row/review counts, estimated/confirmed/closed totals, and formula version summary without changing CSV output.
- Existing closed snapshots remain stable after formula trace work.
- Payroll edits still clear employee confirmation unless explicitly confirming.
- Tests cover trace parity, validation issue codes, structured adjustments, and batch close blockers.
- All-store readiness returns active-store ready/blocked/closed/empty status, row-deduplicated structured blockers, review counts, and distinct estimated/confirmed/closed totals without changing close state.

## Verification

- `npm run check`
- Targeted tests for payroll logic and workspace operations.
- Manual Web preview for payroll table, mobile cards, close modal, unlock modal, and attendance sync.
- Windows desktop smoke only if storage, backup, or close recovery behavior changes.

## Task Lock Update

- Authorized start SHA updated to `1277f635ab9659efccf16f5c989413b0521eec2d`.
- This task adds only pure readiness and preview data; it does not call `closeStoreMonth()`, add a batch-close UI, alter CSV/export behavior, or change Electron, backup, or release boundaries.
- Acceptance evidence: `npm run check` passed (42 tests and production build); local overview preview passed at desktop and 390px mobile widths with no browser console errors.

## Open Questions

- Should structured adjustments replace `specialAdjustment` or coexist through migration?
- Should formula version live on monthly records, snapshots, or each row?
- Which attendance import format should be first: CSV with fixed columns or user-mapped CSV?
