# Home-Page Module Description

## Purpose

`HomePage` is the payroll-first landing page. It tells an owner what blocks the current month's payroll, which action should be taken next, and which stores are ready for month close.

## Current Implementation

`src/pages/HomePage.jsx` obtains cross-store readiness from `getPayrollMonthCloseReadiness()`. It presents estimated, confirmed, and closed payroll totals, prioritizes salary configuration, attendance validation, employee confirmation, and payroll review in that order, then routes the user to the relevant employee and page.

The page contains no retail, product, inventory, procurement, sales, expense, or daily-close data.

## Integration

- `src/payrollLogic.js` supplies payroll readiness and issue messages.
- `src/App.jsx` changes the selected store, selected employee, and active page in response to page actions.

## Limitations

- Stores are closed one at a time; a bulk month-close action is not available.
- Trend comparison is limited to the previous month on this page; the six-month view is in Reports.
