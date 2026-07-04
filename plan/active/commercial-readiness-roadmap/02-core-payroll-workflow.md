# Core Payroll Workflow

## Ownership

Owner: OpenCode / macOS host
Dependencies: Documentation Sync complete
Working branch: `main`
Starting main SHA: `47b49fcedecca85d1d1938a3d4501b09b57d740c`
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

## Do Not Modify Without Re-Planning

- Electron storage, backup, signing, or release workflow files.
- Public release boundary docs.
- Payroll formulas in a way that changes closed snapshot interpretation.

## Subgoals

- Add calculation trace output for each payroll row.
- Add formula version metadata to closed snapshots. Status: DONE for newly closed snapshot rows; legacy closed snapshots remain unchanged.
- Add machine-readable validation issues while preserving Chinese UI messages.
- Add structured payroll adjustment categories beyond the current free numeric special adjustment.
- Add attendance import preview and validation report.
- Add batch close readiness from the overview without bypassing per-store blockers.
- Add export metadata handoff points for Phase 4.

## Acceptance Criteria

- Every displayed salary total can be traced to source fields and formula steps.
- Close blockers are structured by code, severity, field, and message.
- Existing closed snapshots remain stable after formula trace work.
- Payroll edits still clear employee confirmation unless explicitly confirming.
- Tests cover trace parity, validation issue codes, structured adjustments, and batch close blockers.

## Verification

- `npm run check`
- Targeted tests for payroll logic and workspace operations.
- Manual Web preview for payroll table, mobile cards, close modal, unlock modal, and attendance sync.
- Windows desktop smoke only if storage, backup, or close recovery behavior changes.

## Open Questions

- Should structured adjustments replace `specialAdjustment` or coexist through migration?
- Should formula version live on monthly records, snapshots, or each row?
- Which attendance import format should be first: CSV with fixed columns or user-mapped CSV?
