# Payroll-Data Plan

## Objective

Make the workspace data model explicit, validated, and migration-safe enough to support a commercial local payroll product. When complete, every workspace load, restore, import, schema upgrade, and demo reset should produce a predictable data shape with clear warnings, no silent data loss, and enough employee/store metadata for real-world payroll administration.

## Design Principles

- Version changes are explicit: any schema change increments `WORKSPACE_VERSION` and adds a migration step.
- Migration is cumulative: old workspaces move forward through documented steps, not broad destructive rewrites.
- Normalization is idempotent: running migration twice should not change the workspace after the first pass.
- Demo data is only scaffolding: templates must not constrain user-created stores or employees.
- Legacy IDs remain stable: old backup imports must continue to map known legacy store IDs safely.
- Payroll history is preserved: closed snapshots, assignments, adjustments, and close history are never discarded during migration.
- Validation reports are actionable: unexpected structure should produce clear warnings or fatal errors before save.

## Phase 1: Current v3 Workspace Baseline — DONE

Status: **Done**

Goals:

- Establish a generic demo workspace and a normalized v3 data shape.

Completed work:

- `WORKSPACE_VERSION = 3` is defined in `src/payrollData.js`.
- `createInitialWorkspace()` creates generic stores, employees, assignments, adjustments, rule history, and empty monthly records.
- `createOpenMonthlyStoreRecord()` normalizes open/closed month-store records while preserving `snapshot` and `closeHistory`.
- `migrateWorkspace()` normalizes current and legacy workspace shapes.
- Tests in `src/payrollLogic.test.js` and `src/workspaceOperations.test.js` cover demo workspace creation, v2 salary migration, legacy nested employee migration, and frozen snapshot behavior.

## Phase 2: Structural Validation Layer — NOT STARTED

Status: **Not Started**

Goals:

- Detect malformed workspace data before migration masks important problems.
- Return structured validation results that can power import previews and recovery screens.

Remaining features:

- Add `validateWorkspaceStructure(workspace)` with fatal errors and warnings for stores, employees, assignments, adjustments, rule history, and monthly records.
- Validate required field types for `id`, `name`, `storeId`, `employeeId`, month keys, record status, and snapshot arrays.
- Integrate validation with `migrateWorkspace()` without silently dropping unknown fields.
- Add tests for missing stores, malformed employee arrays, invalid assignment month ranges, invalid monthly record statuses, and unknown-but-preserved fields.

## Phase 3: Version-by-Version Migration Registry — NOT STARTED

Status: **Not Started**

Goals:

- Replace broad migration branching with explicit schema upgrade steps.

Remaining features:

- Introduce migration functions such as `migrateV1ToV2`, `migrateV2ToV3`, and future `migrateV3ToV4`.
- Preserve current legacy nested-store reconstruction as the oldest migration step.
- Add migration metadata recording source version, target version, warnings, and changed fields.
- Add migration dry-run support for backup import preview.
- Add fixture tests for every supported historical workspace shape.

## Phase 4: Commercial Employee and Store Schema — NOT STARTED

Status: **Not Started**

Goals:

- Extend the workspace model from demo payroll data to real staff and store administration without introducing cloud sync.

Remaining features:

- Add optional employee fields for staff number, hire date, role, contact method, bank account notes, emergency contact, and document status.
- Add store metadata for business name, payroll contact, operating status notes, and archive reason.
- Add formal employment lifecycle fields separate from simple `isResigned` and `resignationDate`.
- Define which fields are included in payroll exports and which remain internal profile data.
- Add migration defaults that keep old workspaces valid without inventing false real-world data.

## Phase 5: Workspace Metadata and Audit Support — NOT STARTED

Status: **Not Started**

Goals:

- Make workspace provenance and migration state auditable.

Remaining features:

- Add workspace-level metadata: created app version, last saved app version, last migrated version, and workspace ID.
- Add read-only audit summary extraction for import/restore preview.
- Add workspace diff capability for comparing backups or recovery points.
- Add schema compatibility warnings before restoring a backup created by a newer app version.

## Phase 6: Testing Strategy — PARTIALLY COMPLETED

Status: **Partially Completed**

Goals:

- Keep schema changes safe across old backups, demo resets, and recovery flows.

Completed work:

- Existing tests cover generic demo data, v2 salary state, legacy nested employees, monthly records, transfer, close, and unlock.

Remaining features:

- Add current-version schema fixture tests.
- Add migration idempotency tests.
- Add validation warning tests for recoverable malformed data.
- Add import-preview tests once validation result objects exist.
- Add tests proving unknown future fields are preserved unless explicitly migrated.

## Implementation Rules

- Do not change `WORKSPACE_VERSION` without adding migration tests.
- Do not remove employee, assignment, adjustment, monthly record, or close snapshot fields during migration.
- Do not reintroduce third-party retailer branding, real store locations, or real employee data into templates.
- Do not make new commercial fields required unless migration can supply safe empty defaults.
- Do not fold salary component changes directly into employee records without creating adjustment history.

## Open Questions

- Which employee profile fields are required for the first commercial payroll release, and which should remain optional notes?
- Should workspace validation live only in `shared/backup-format.js`, only in `src/payrollData.js`, or be split into envelope validation and deep schema validation?
- Should future workspace schemas be documented as JSON Schema, TypeScript types, or executable validators?
- Should workspace metadata include a stable workspace ID for support and backup comparison?
