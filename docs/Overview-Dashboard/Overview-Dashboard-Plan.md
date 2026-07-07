# Overview-Dashboard Plan

## Objective

Turn the overview into a commercial-grade payroll command center that helps owners complete month-end payroll across stores with confidence, minimal clicks, and clear exception handling before they enter detailed workbenches.

## Design Principles

- The dashboard shows next action before raw data.
- Blockers are distinct from review-only exceptions.
- Active operational views exclude archived stores by default.
- Totals must preserve estimated, confirmed, and closed meanings.
- Dashboard actions should route to the exact store and workflow that needs attention.
- Batch actions must still use the same validation rules as individual store workflows.

## Phase 1: Current Owner Command Center — DONE

Status: **Done**

Goals:

- Summarize active store payroll status and route owners to the next task.

Completed work:

- Active stores are summarized for the active month.
- Recommended action priority exists.
- Store cards show status, amount, confirmation, blockers, and review alerts.
- Priority employee blockers route to payroll.
- Structured payroll blockers are converted through their Chinese `message` for dashboard summaries.
- Owner workflow guidance is displayed.

## Phase 2: Month Navigation and Context — NOT STARTED

Status: **Not Started**

Goals:

- Let owners compare and switch payroll months from the command center.

Remaining features:

- Add month picker and previous/next month controls.
- Add month status summary: not started, in progress, partially closed, fully closed.
- Add previous-month comparison for total payroll and blocker count.
- Add tests for month-level aggregate derivation.

## Phase 3: Batch Readiness and Action Panel — NOT STARTED

Status: **Not Started**

Goals:

- Support all-store month-end workflows from the dashboard.

Remaining features:

- Add all-store close readiness report.
- Add batch close preview with per-store blockers.
- Add shortcut to export all closed stores for the selected month.
- Add dashboard confirmation modal for batch operations.

## Phase 4: Exception Intelligence — NOT STARTED

Status: **Not Started**

Goals:

- Help owners focus on unusual payroll conditions, not just blocking tasks.

Remaining features:

- Add thresholds for high leave, high special adjustment, high overtime, and unusual total changes.
- Add exception trend compared to previous month.
- Add dismiss or mark-reviewed state for non-blocking exceptions.
- Add task history for reviewed exceptions.

## Phase 5: Owner Summary Output — NOT STARTED

Status: **Not Started**

Goals:

- Produce a simple month-end management summary outside the app UI.

Remaining features:

- Add printable dashboard summary.
- Add CSV/JSON dashboard summary export.
- Include store status, blockers, exceptions, confirmed totals, closed totals, and export status.

## Phase 6: Testing Strategy — NOT STARTED

Status: **Not Started**

Goals:

- Keep overview recommendations reliable as payroll workflows expand.

Remaining features:

- Add tests for recommended action priority order.
- Add tests for active-store filtering.
- Add tests for ready-to-close store count.
- Add tests for batch readiness once implemented.

## Implementation Rules

- Do not include archived stores in active dashboard counts unless explicitly requested.
- Do not mark a store ready to close if any close blocker exists.
- Do not provide batch close without previewing blockers.
- Do not collapse estimated, confirmed, and closed totals into one label.
- Do not make dashboard alerts depend on untested string parsing once issue codes exist.

## Open Questions

- Should the dashboard default to the current calendar month or the last active payroll month?
- Should non-blocking exceptions require explicit review before batch close?
- Should owner summary exports include employee names or only store-level totals by default?
- Should dashboard thresholds be global or per store?
