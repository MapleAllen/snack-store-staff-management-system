# Backup-System Plan

## Objective

Provide a reliable, verifiable, and user-controlled backup system where every backup can be validated before restore, recovery points are understandable, protected backups offer meaningful confidentiality, and commercial support can diagnose backup state without exposing payroll data publicly.

## Design Principles

- The backup envelope is defined once in `shared/backup-format.js`.
- Imports are validated before workspace state is replaced.
- Recovery points are local safeguards, not a substitute for off-device backup.
- Protected backups are explicit user choices and must not hide passphrase-loss risk.
- Backup writes are atomic and must not delete older backups before the new backup succeeds.
- Backup status must be explainable to non-technical store owners.
- Legacy backup compatibility remains unless a migration policy explicitly ends support.

## Phase 1: Shared Format and Automatic Recovery Points — DONE

Status: **Done**

Goals:

- Establish a single backup envelope and desktop automatic recovery point store.

Completed work:

- `shared/backup-format.js` defines current and legacy backup identifiers, `STORAGE_KEY`, size limit, reason constants, labels, and validation helpers.
- `electron/backup-store.cjs` creates, lists, reads, deduplicates, and retains automatic recovery points.
- Electron IPC exposes create/list/read backup APIs through `window.payrollDesktop`.
- Automatic backup triggers exist for daily startup, before restore, after month close, and before demo reset.

## Phase 2: Protected Manual Backups — DONE

Status: **Done**

Goals:

- Let users export backups that require a passphrase to restore.

Completed work:

- Manual plaintext JSON export exists.
- Manual protected export encrypts the plaintext backup payload with WebCrypto PBKDF2 and AES-GCM.
- Protected import decrypts with the provided passphrase and validates the decrypted payload before restore.
- Wrong passphrases are rejected without replacing the current workspace.

## Phase 3: Backup Integrity and Visibility — NOT STARTED

Status: **Not Started**

Goals:

- Detect damaged backups and show users which recovery points are usable.

Remaining features:

- Add SHA256 checksum metadata to plaintext backup envelopes.
- Validate checksum on create, list, read, import, and workspace-store load where applicable.
- Return damaged backup metadata from `list()` with error reason instead of silently excluding damaged files.
- Add a settings action to verify a backup without restoring it.
- Add tests for checksum mismatch, damaged list entries, and verify-only behavior.

## Phase 4: Restore Preview and Backup Diff — NOT STARTED

Status: **Not Started**

Goals:

- Help users understand what will change before replacing their workspace.

Remaining features:

- Add backup import dry-run that reports app version, store count, employee count, latest month, and close status counts.
- Add diff between current workspace and backup: stores added/removed, employees added/removed, closed months changed, and payroll records present.
- Show diff in restore confirmation modal.
- Add tests for restore preview and diff output.

## Phase 5: Retention and Backup Management — NOT STARTED

Status: **Not Started**

Goals:

- Give commercial users predictable recovery point retention and cleanup controls.

Remaining features:

- Add configurable retention by max count, max age, and per-reason minimums.
- Add manual deletion of selected recovery points with confirmation.
- Add backup metadata export for support review.
- Add storage usage display for recovery points.
- Add retention policy tests.

## Phase 6: Protected Automatic Backups — NOT STARTED

Status: **Not Started**

Goals:

- Reduce plaintext backup exposure for users who opt into stronger local confidentiality.

Remaining features:

- Decide whether automatic backups share workspace encryption, backup passphrase, or remain plaintext.
- Add encrypted automatic recovery point support only after lost-passphrase behavior is documented.
- Add UI warnings explaining that encrypted local backups still need off-device copies.
- Add restore tests for encrypted automatic recovery points.

## Phase 7: Testing Strategy — PARTIALLY COMPLETED

Status: **Partially Completed**

Goals:

- Keep backup compatibility and recovery behavior safe across releases.

Completed work:

- `src/backupFormat.test.js` covers current/legacy type acceptance, malformed payload rejection, and oversized file rejection.
- `src/backupStore.test.js` covers daily deduplication, retention, invalid read ID rejection, and legacy backup acceptance.
- `src/backupReason.test.js` covers reason constants, labels, and validation with `before-demo-reset`.

Remaining features:

- Add protected backup export/import round-trip tests.
- Add wrong-passphrase safe-failure tests.
- Add damaged backup list visibility tests.
- Add checksum tests once checksums exist.
- Add restore-preview and diff tests.

## Implementation Rules

- Do not restore a backup before validating type, storage key, size, and workspace structure.
- Do not delete old automatic backups unless the new backup was successfully written and validated.
- Do not log backup passphrases, derived keys, or decrypted payloads.
- Do not imply local recovery points are off-device backups.
- Do not remove legacy backup type support without a documented migration and support decision.
- Do not encrypt automatic backups without defining how users recover from lost credentials.

## Open Questions

- Should automatic recovery points remain plaintext until workspace encryption exists?
- Should checksum metadata be added to workspace files and backup files in one shared format change?
- Should backup retention settings be visible in the first commercial release or remain an advanced setting?
- Should support tooling consume a redacted backup metadata export?
