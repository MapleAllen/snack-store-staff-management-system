# Operation-Audit Module Description

## Purpose

`src/operationAudit.js` provides a privacy-minimized audit timeline for payroll workspace changes.

## Current Implementation

The operation allowlist covers store create/rename/archive/restore, salary adjustment, employee resignation/restore/transfer, payroll-rule update, payroll close, and payroll unlock. `appendOperationLog()` prepends a successful operation event without copying salary amounts, names, notes, or personal data.

During workspace migration, unknown and retired non-payroll event types are discarded from the visible operation log. This prevents old product or sales events from reappearing in the payroll settings timeline.

## Limitations

- The timeline is an audit aid, not a replacement for frozen payroll snapshots.
- It does not provide undo or a per-event detail view.
