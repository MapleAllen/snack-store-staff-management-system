# Overview-Dashboard Module Description

## Module Name

Overview-Dashboard

## Purpose

Overview-Dashboard is the owner command center. It summarizes every active store for the selected month, identifies the next best payroll action, separates blockers from review-only exceptions, and routes the owner into the payroll or reports workflow.

## Current Implementation

The module is implemented in `src/pages/HomePage.jsx`. It receives `workspace`, `activeMonth`, `onNavigate`, and `onSelectStore` from `App.jsx`. It derives all data at render time using payroll logic helpers and does not mutate workspace state directly.

### Capabilities

**Active-store summary**

- Uses active stores only: `workspace.stores.filter((store) => store.status === "active")`.
- Builds `storeSummaries` by calculating rows, monthly store record, stage summary, review rows, and blocker rows for each store.
- Aggregates forecast, confirmed, closed, employee count, unconfigured count, pending count, invalid count, and exception count.

**Recommended next action**

- Prioritizes work in this order: salary setup, input errors, employee confirmation, review exceptions, month close, then view completed payroll.
- Shows a primary action button that selects the relevant store and navigates to payroll.
- Provides secondary navigation to reports.

**Payroll confidence and blockers**

- Shows pending employee count, ready-to-close store count, and review exception count.
- Shows blocker reason summary grouped by blocker text.
- Shows up to three priority employee blockers with store and employee names.

**Store cards**

- Displays each active store with status badge, confirmed/forecast amount, confirmation counts, pending counts, review counts, and first alert row.
- Clicking a store card selects that store and navigates to payroll.

**Workflow education**

- Shows an ordered owner workflow: set salary, confirm employees, review changes, close and export.

## Architecture

Overview-Dashboard is a pure page component that derives dashboard state from shared payroll logic.

### UI (`src/pages/HomePage.jsx`)

- `HomePage({ workspace, activeMonth, onNavigate, onSelectStore })`
  - Computes store summaries and aggregate counts.
  - Chooses the recommended action.
  - Renders command center, stats, store cards, blocker digest, and workflow list.
- `goToPayroll(storeId)`
  - Selects the relevant store and navigates to the payroll page.

### Logic Dependencies (`src/payrollLogic.js`)

- `getStorePayrollRows()`
  - Builds row state per store.
- `getMonthlyStoreRecord()`
  - Reads current store-month status.
- `getPayrollStageSummary()`
  - Provides totals and counts.
- `getPayrollCloseBlockers()`
  - Identifies blocking rows.
- `getPayrollIssueItems()`
  - Identifies review-only exceptions.

## Integration Points

- `src/App.jsx`
  - Renders HomePage when `activePage === "home"` and passes navigation callbacks.
- `src/pages/PayrollPage.jsx`
  - Receives users routed from store cards and recommended action.
- `src/pages/ReportsPage.jsx`
  - Receives users routed through secondary report action.

## Current Limitations

- Dashboard only summarizes active stores; archived stores are available from reports only.
- Active month is controlled elsewhere; HomePage does not provide a month picker.
- Recommended action uses static priority rules and does not learn from user behavior.
- No all-store batch action can be executed directly from the dashboard.
- No trend comparison against previous months.
- No persistent notification list or task completion history.
- No export, print, or owner summary report from the dashboard.

## Future Directions

- Add month selector or quick previous/next month controls.
- Add batch close readiness action for all stores.
- Add trend comparison versus previous month.
- Add dashboard task history after close/export actions.
- Add configurable alert thresholds for high adjustments, high leave, or unusual payroll totals.
- Add printable owner summary for the month.
