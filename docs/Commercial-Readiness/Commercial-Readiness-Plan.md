# Commercial-Readiness Plan

## Objective

Guide 门店工资助手 from a capable local payroll desktop app toward a controlled commercial Windows release. The end state is a signed, verified, source-and-binary release process with clear product boundaries, robust local data safety, audit-friendly payroll workflows, and enough operational documentation for future implementation agents to proceed without rediscovering decisions.

## Design Principles

- Windows desktop is the commercial target platform.
- Public binary release requires a signed Windows channel and real-device regression evidence.
- Local-first remains the product boundary unless cloud sync or accounts are explicitly approved.
- Documentation describes current facts; plans describe future work.
- Payroll correctness and recoverability outrank visual redesign.
- No real employee, store, or payroll data appears in default content, tests, docs, screenshots, or exports.
- Security claims must state boundaries honestly.

## Phase 1: Documentation and Current-State Alignment — IN PROGRESS

Status: **In Progress**

Goals:

- Make docs up to date and establish commercial roadmap traceability.

Completed work:

- Existing technical module docs are updated to match current code boundaries.
- Product workflow module docs are introduced for payroll, employees, stores, overview, reports, and commercial readiness.
- This plan records commercial phases and guardrails.

Remaining features:

- Keep `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, and `CHANGELOG.md` aligned with final release state during future release tasks.
- Keep module plans updated as implementation completes.

## Phase 2: Core Payroll Commercial Hardening — NOT STARTED

Status: **Not Started**

Goals:

- Make payroll calculation, review, close, unlock, and export auditable enough for real store operations.

Remaining features:

- Add calculation traces and formula version metadata.
- Add machine-readable validation issue codes.
- Add structured payroll adjustments and import preview.
- Add export manifests and closed snapshot hashes.
- Add payment handoff status after formal export.

## Phase 3: Staff and Store Operations Maturity — NOT STARTED

Status: **Not Started**

Goals:

- Mature employee and store management without introducing cloud or multi-user scope.

Remaining features:

- Add commercial employee profile fields and lifecycle events.
- Add store metadata, lifecycle reasons, and store audit timeline.
- Move salary adjustment, resignation, and rule changes into `workspaceOperations.js`.
- Add operation previews for transfer, archive, restore, close, and backup restore.

## Phase 4: Reporting, Export, and Audit Trail — NOT STARTED

Status: **Not Started**

Goals:

- Support month-end reporting and external handoff with traceable artifacts.

Remaining features:

- Add multi-store monthly export packages.
- Add structured JSON report export and print-friendly owner summary.
- Add workspace-level operation log.
- Add employee, store, and payroll audit exports.

## Phase 5: Data Safety and Desktop Security — NOT STARTED

Status: **Not Started**

Goals:

- Improve local resilience and access protection before commercial release.

Remaining features:

- Add workspace and backup checksums.
- Add write-ahead journal or last-known-good recovery.
- Add multi-instance protection.
- Add optional workspace encryption after recovery policy is defined.
- Add persistent PIN lockout and recovery code.
- Add auto-lock on idle and system sleep/resume.

## Phase 6: Windows Release Channel — NOT STARTED

Status: **Not Started**

Goals:

- Establish a repeatable signed Windows release process.

Remaining features:

- Choose and document a code-signing strategy.
- Add signed Windows build pipeline.
- Add artifact manifest and checksum generation.
- Add install, upgrade, backup restore, PIN, migration, uninstall, and reinstall evidence templates.
- Create release evidence index mapped to final SHAs.

## Phase 7: Commercial Acceptance Gate — NOT STARTED

Status: **Not Started**

Goals:

- Prevent premature public commercial claims.

Remaining features:

- Define release blocker checklist across docs, tests, Windows evidence, signed artifacts, and data safety.
- Run final `npm run check`, `npm audit --audit-level=high`, Windows package/sign checks, and real-device regression.
- Verify all public docs match release reality.
- Archive completed plans and record residual risks.

## Implementation Rules

- Do not publish or imply a trusted Windows executable before signed channel and real-device regression exist.
- Do not add cloud sync, auto-update, or accounts without explicit product decision and plan update.
- Do not weaken local data recovery behavior to speed up release.
- Do not hide plaintext storage boundaries in commercial documentation.
- Do not implement commercial employee fields using real examples or real store names.
- Do not treat docs-only plans as completed implementation.

## Open Questions

- What is the target commercial minimum: paid local app, internal controlled deployment, or public signed installer?
- Which payroll components are legally or operationally required before real commercial use?
- Should workspace encryption be a commercial blocker or an optional advanced protection?
- Who owns Windows real-device regression evidence and signing credentials?
- What support process will handle lost PIN, corrupt workspace, and failed backup restores?
