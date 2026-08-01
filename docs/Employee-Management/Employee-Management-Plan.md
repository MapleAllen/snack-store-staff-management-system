# Employee-Management Plan

## Objective

Evolve employee management from a lightweight payroll roster into a commercial staff administration module that supports reliable onboarding, salary setup, transfers, resignation history, payroll eligibility, and auditable employee changes without adding cloud accounts or multi-user collaboration.

## Design Principles

- Employee IDs remain stable across stores and months.
- Resigned employees stay in history but are excluded from active payroll by default.
- Salary component changes require adjustment records.
- Employee onboarding is not complete until initial salary is configured.
- Assignment changes are month-based and must not rewrite closed payroll history.
- Member records use generated anonymous codes and must not collect personal-identifying profile fields.

## Phase 1: Current Payroll Roster — DONE

Status: **Done**

Goals:

- Support active employee payroll eligibility, salary setup, resignation, and transfer basics.

Completed work:

- Employee records and assignment arrays exist in the workspace.
- New employees start salary-pending and are assigned to the active store.
- Salary setup and changes create adjustment records.
- Resigned employees remain in history and are excluded from active payroll rows.
- Month-based transfer preserves employee identity and assignment history.

## Phase 2: Commercial Employee Profiles — NOT STARTED

Status: **Not Started**

Goals:

- Improve operational member administration while preserving the no-personal-information boundary.

Remaining features:

- Keep only generated member code, payroll status, salary-component state, assignment, and employment lifecycle data.
- Add controlled, non-identifying operational classifications only where they affect payroll or scheduling.
- Reject or remove legacy names, contact details, bank data, document status, and free-text member notes during migration.
- Add migration coverage proving all existing members receive stable anonymous codes.

## Phase 3: Employment Lifecycle — NOT STARTED

Status: **Not Started**

Goals:

- Track hire, resignation, restore, and rehire as auditable events.

Remaining features:

- Replace simple `isResigned` toggling with employment lifecycle records.
- Add resignation reason and last working date.
- Add rehire flow that preserves prior history.
- Add tests proving resigned employees remain excluded from payroll, reports, exports, and completion rates.

## Phase 4: Operation-Layer Consolidation — NOT STARTED

Status: **Not Started**

Goals:

- Move employee mutations into tested operation functions.

Remaining features:

- Add `createEmployee()`, `recordSalaryAdjustment()`, `resignEmployee()`, and `restoreEmployee()` operations.
- Add validation and preview results for each operation.
- Add tests for onboarding, salary-pending state, salary adjustment history, resignation, restore, and transfer interactions.

## Phase 5: Bulk Roster Tools — NOT STARTED

Status: **Not Started**

Goals:

- Reduce setup friction for real stores with existing rosters.

Remaining features:

- Add anonymous member-code import with preview and error report.
- Add roster export using anonymous member codes for active and historical members.
- Add import rollback before save.
- Reject mappings for names, contact details, IDs, bank data, and other personal fields.

## Phase 6: Employee Timeline and Audit — NOT STARTED

Status: **Not Started**

Goals:

- Make employee history easy to inspect before payroll close and during support.

Remaining features:

- Add employee detail timeline combining assignment changes, salary adjustments, resignation events, and monthly close participation.
- Add employee-level audit export.
- Add filters for salary-pending, planned transfer, recently adjusted, and recently resigned employees.

## Phase 7: Testing Strategy — PARTIALLY COMPLETED

Status: **Partially Completed**

Goals:

- Protect payroll eligibility and employee history rules.

Completed work:

- Existing tests cover assignment migration and employee transfer.

Remaining features:

- Add tests for resignation exclusion from payroll rows and reports.
- Add tests for salary-pending onboarding flow.
- Add tests proving legacy personal fields are removed during migration.
- Add tests for bulk import validation once implemented.

## Implementation Rules

- Do not delete employees to remove them from payroll; use lifecycle state.
- Do not include resigned employees in active payroll, reports, exports, or completion rates unless explicitly viewing history.
- Do not change salary fields without appending an adjustment record.
- Do not create real-person demo data in templates or docs.
- Do not collect member names, contact details, identity documents, bank data, or free-text personal notes.
- Do not make new operational fields mandatory without safe migration defaults.

## Open Questions

- Which non-identifying operational classifications are required for the first commercial release?
- Should employee roster import be CSV-only first, or support Excel-compatible formats later?
- Should rehire create a new employment lifecycle record under the same employee ID or require a new employee ID?
