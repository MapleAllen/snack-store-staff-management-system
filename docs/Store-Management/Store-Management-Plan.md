# Store-Management Plan

## Objective

Make store management robust enough for commercial multi-store payroll operation: stores can be opened, renamed, archived, restored, configured, audited, and compared without losing payroll history or accidentally changing closed results.

## Design Principles

- Stores are archived, not deleted.
- At least one active store must remain available.
- Active payroll views exclude archived stores by default.
- Historical reports may include archived stores explicitly.
- Payroll rule changes affect open calculations only; closed snapshots remain frozen.
- Store lifecycle and config changes should be operation-layer mutations with audit records.

## Phase 1: Current Store Lifecycle — DONE

Status: **Done**

Goals:

- Support basic multi-store management without deleting history.

Completed work:

- Store create, rename, archive, and restore exist.
- New stores clone config from an existing store.
- Archive protects the final active store and stores with active current/future staff.
- Archived stores are hidden from active topbar selection.
- Reports can optionally include archived stores.

## Phase 2: Store Metadata and Lifecycle Reasons — NOT STARTED

Status: **Not Started**

Goals:

- Track enough store context for commercial operations and support.

Remaining features:

- Add store metadata fields for business label, payroll contact, operating note, and optional internal code.
- Add archive reason and restore reason.
- Add opened/closed lifecycle timeline.
- Add migration defaults for existing stores.

## Phase 3: Rule Change Safety — NOT STARTED

Status: **Not Started**

Goals:

- Prevent accidental payroll rule changes from surprising owners.

Remaining features:

- Move `patchStoreConfig()` logic into a tested operation function.
- Add rule-change impact preview for current open month.
- Show affected open payroll rows and estimated total change before saving.
- Require confirmation when changing high-impact fields such as social insurance base or leave divisors.

## Phase 4: Templates and Propagation — NOT STARTED

Status: **Not Started**

Goals:

- Reduce repeated setup for multi-store owners.

Remaining features:

- Add user-defined payroll rule templates.
- Add propagate config from source store to selected target stores.
- Add per-store override indicators when a store differs from a template.
- Add tests for propagation preserving closed snapshots.

## Phase 5: Store Audit and Reporting — NOT STARTED

Status: **Not Started**

Goals:

- Make store changes traceable over time.

Remaining features:

- Add store-level audit timeline for name changes, archive/restore, config changes, and major payroll events.
- Add store metadata export.
- Add filterable historical store reports.

## Phase 6: Testing Strategy — PARTIALLY COMPLETED

Status: **Partially Completed**

Goals:

- Preserve store lifecycle safety rules.

Completed work:

- Existing tests cover create, archive, and restore.

Remaining features:

- Add duplicate-name, empty-name, missing-source, and restore validation tests.
- Add rule history and config validation operation tests once config updates move into operations.
- Add archive reason and restore reason tests once implemented.

## Implementation Rules

- Do not delete store records or historical payroll data.
- Do not allow archiving the final active store.
- Do not include archived stores in daily payroll entry by default.
- Do not apply rule changes to closed snapshots.
- Do not create new store templates using real locations or third-party retailer branding.

## Open Questions

- What store metadata is required for the first commercial release?
- Should store rule templates be global within the workspace or copied per store?
- Should config propagation be all-or-nothing or per-store with conflict reports?
- Should archived stores be restorable without resolving old future assignments first?
