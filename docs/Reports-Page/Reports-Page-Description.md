# Reports-Page Module Description

## Purpose

`ReportsPage` provides payroll-only reporting for the selected month and active stores.

## Current Implementation

`src/pages/ReportsPage.jsx` summarizes per-store payroll confirmation, estimated and confirmed payouts, monthly close state, overtime pay, and leave deductions. It also shows a six-month trend using closed totals for closed months and confirmed totals for open months. Archived stores are opt-in and cannot be opened for new payroll work.

The page never renders or exports sales, product, inventory, procurement, expense, margin, or business-day information.

## Integration

- `src/payrollLogic.js` supplies rows, close blockers, monthly records, and stage totals.
- `src/App.jsx` supplies the selected month and routes a store to the payroll page.

## Limitations

- The current report is an on-screen summary; payroll CSV and payroll-slip outputs remain in the payroll workflow.
- Trend values are confirmation-based for open months, not an accounting accrual report.
