# Backup-System - Plan

## Objective

Provide a reliable, verifiable, and user-controlled backup system where every recovery point is integrity-checked, retention is predictable, backups are portable, and protected backups offer meaningful confidentiality without hidden data-loss risks.

## Design Principles

- **Shared format, single source of truth**: The backup envelope format is defined once in `shared/backup-format.js` and consumed by every layer.
- **Validation at every boundary**: Backup data is validated on create, list, read, and import.
- **Atomic writes, never partial**: Every backup file is written via temp-file + rename.
- **Damaged backups are discoverable**: Damaged files must not silently disappear; the user must know what failed and why.
- **Encryption is opt-in, not opt-out**: Protected backups are an explicit user choice; plaintext remains the default for backward compatibility.
- **Retention is explicit and predictable**: Users must be able to understand why a backup was kept or removed.

## Phases

### Phase 1: Shared Format and Basic Auto Backups — DONE

Completed work:
- Canonical backup envelope with type, version, storageKey, exportedAt, reason, protected, and data fields: `shared/backup-format.js:1-20`.
- Five reason constants with Chinese labels: `shared/backup-format.js:6-20`.
- Structural validation of backup payloads and embedded workspace data: `shared/backup-format.js:26-54`.
- Auto recovery points with daily startup dedup and 10-file retention: `backup-store.cjs:54-76`.
- Atomic file writes and damaged file handling: `backup-store.cjs:47-49,69-72`.

### Phase 2: Protected Backups — DONE

Completed work:
- Manual passphrase-protected backup export with PBKDF2 + AES-256-GCM via WebCrypto: `App.jsx:68-112`.
- Protected backup import with correct-passphrase restore and wrong-passphrase safe rejection.
- `protected: boolean` flag in backup envelope to distinguish plaintext vs encrypted.

### Phase 3: Backup Integrity and Discovery — NOT STARTED

Goal: Add SHA256 checksums and surface damaged backup information to the user.

Tasks:
- Add `checksum` field (SHA256 of JSON-serialized data) to the backup envelope.
- Validate checksum on every read/list/import operation.
- Surface damaged backups in list results with error reason instead of silently excluding them.
- Add a "verify backup" action that checks integrity without loading into workspace.
- Add backup size warnings for approaching the 25 MB import limit.

### Phase 4: Retention Policy and Management — NOT STARTED

Goal: Allow configurable retention and provide backup management controls.

Tasks:
- Add configurable retention: by max count, max age (days), and per-reason quotas.
- Add backup metadata export: list all backups with dates, reasons, sizes, checksums.
- Add bulk backup deletion with confirmation.
- Add backup size tracking and storage quota awareness.
- Add backup import dry-run: validate format and structure without applying to workspace.

### Phase 5: Backup Comparison and Diff — NOT STARTED

Goal: Help users understand what changed between two recovery points.

Tasks:
- Add `diffBackups(backup1, backup2)` returning structural differences: stores added/removed, employee count change, payroll data changes.
- Surface diff in the recovery point list UI.
- Add time-range filtering for backup lists (last 7 days, last month, etc.).

### Phase 6: Backup Export Formats — NOT STARTED

Goal: Support non-JSON backup formats for external tooling and archival.

Tasks:
- Add CSV export of backup metadata and row-level payroll data.
- Add ZIP-compressed backup bundles for size reduction.
- Add backup export verification: re-import exported backup into a temporary workspace to confirm round-trip integrity.

### Phase 7: Testing Strategy — PARTIALLY COMPLETED

Completed work:
- `backupFormat.test.js` — 3 tests: current/legacy format, malformed, oversized.
- `backupStore.test.js` — 3 tests: daily dedup, invalid/damaged, legacy v1.
- `backupReason.test.js` — 3 tests: 5 reason constants, labels, before-demo-reset validation.

Remaining tasks:
- Add tests for protected backup export/import round-trip.
- Add tests for wrong-passphrase safe failure without workspace pollution.
- Add tests for retention policy enforcement (maxBackups limit).
- Add tests for daily startup dedup across same-day creates.
- Add tests for backup store concurrent create serialization.
- Add tests for backup integrity checksum validation.

## Implementation Rules

- Do not change the backup envelope format without a version bump and backward-compatible read support.
- Do not add encryption that makes it impossible to recover data if the passphrase is lost.
- Do not remove legacy backup type support (`LEGACY_BACKUP_TYPES`) without confirming that all old backup files can still be imported.
- Do not delete auto backup files during create without first verifying the create succeeded.
- Do not surface the backup passphrase or derived key in logs, errors, or UI state.

## Open Questions

- Should auto recovery points also support optional encryption, or should encryption remain manual-only?
- Should the retention policy be user-configurable in Settings, or remain fixed at 10?
- Should backup verification produce a machine-readable report for integration into release/audit processes?
- Should the backup system support scheduled exports to a user-specified external directory?
