# Payroll-Data - Plan

## Objective

Make workspace data management robust, version-transparent, and auditable so that every workspace load, save, migration, and import produces a predictable, validated structure regardless of data provenance.

## Design Principles

- **Version is always explicit**: `WORKSPACE_VERSION` increments on any schema change; every load path validates the version.
- **Migration is cumulative, never destructive**: Old data moves forward through each version step; no field is silently dropped.
- **Normalization is idempotent**: Called on file load, restore, import, and template init; always returns the canonical shape.
- **Templates are config-only scaffolds**: Templates seed initial data but do not constrain user-modified stores or employees.
- **demo-id / legacy-id mappings are stable**: Legacy store lookups must not regress for existing backup files.
- **No magic defaulting without logging**: If a field is missing and defaults, the recovery path is explicit.

## Phases

### Phase 1: Stabilize and Document Current Migration — DONE

Completed work:
- `migrateWorkspace()` normalizes stores, employees, assignments, adjustments, ruleHistory, monthlyRecords.
- Legacy migration path reconstructs stores from templates + existing data when assignments are absent: `payrollData.js:194-215`.
- Monthly record normalization via `createOpenMonthlyStoreRecord()` preserves snapshot and closeHistory: `payrollData.js:79-88`.
- `WORKSPACE_VERSION` is set to 3 as of v2.0.0 hardening.

### Phase 2: Add Structural Validation Layer — NOT STARTED

Goal: Separate structural validation from migration so that corrupt or unexpected workspace shapes can be detected without depending on the migration path alone.

Tasks:
- Add `validateWorkspaceStructure(workspace)` that checks required top-level keys, array types, and critical nested fields.
- Integrate validation into `migrateWorkspace()` — validate before migrating, warn on unexpected shapes.
- Export validation result alongside migration to surface warnings without blocking load.
- Add tests for missing stores, missing monthlyRecords, malformed configs, and unexpected extra fields.

### Phase 3: Version-by-Version Migration Steps — NOT STARTED

Goal: Replace the binary fork (`has assignments` vs `legacy`) with a chain of explicit version-step migrations.

Tasks:
- Define a version migration registry: `[v1→v2, v2→v3, ...]`.
- Each step takes a workspace at version N and returns version N+1.
- `migrateWorkspace()` walks the chain from the detected version to `WORKSPACE_VERSION`.
- Preserve the legacy template-based reconstruction as step `v0→v1`.
- Add migration-dry-run capability for backup preview.

### Phase 4: Workspace Read-Only / Audit Mode — NOT STARTED

Goal: Support loading workspaces without triggering side effects for audit, import preview, and comparison.

Tasks:
- Add `loadWorkspaceReadOnly(source)` that returns workspace + metadata without migration side effects.
- Add workspace diff capability: compare two workspace snapshots and list structural changes.
- Support workspace metadata extraction (store count, employee count, last save timestamp) without full parse.

### Phase 5: Validation Testing Strategy — NOT STARTED

Goal: Comprehensive test coverage for workspace migration, normalization, and structural validation.

Tasks:
- Test `migrateWorkspace()` with v1, v2, current-format workspaces, and empty/corrupt inputs.
- Test `createInitialWorkspace()` returns valid, parseable workspace with expected template data.
- Test `createOpenMonthlyStoreRecord()` with open records, closed records, snapshots, and malformed inputs.
- Test normalization idempotency: calling normalize twice produces the same result.
- Test legacy store ID matching for all `STORE_TEMPLATES` legacy IDs.

## Implementation Rules

- Do not change `WORKSPACE_VERSION` without adding a corresponding migration step.
- Do not remove fields from the workspace schema during migration — only add or normalize.
- Do not change `STORE_TEMPLATES` legacy ID mappings without ensuring old backup restore continues to work.
- Do not export demo stores or employees as default data without explicitly marking them as demo content.

## Open Questions

- Should `migrateWorkspace()` accept a `targetVersion` parameter to support partial upgrades for backup preview?
- Should structural validation be done in the renderer (before save) or in the main process (on load), or both?
- Is the `mergeWorkspaceWithTemplates` alias still needed by any caller?
