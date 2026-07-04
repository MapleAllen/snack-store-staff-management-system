# Backup-System Module Description

## Module Name

Backup-System

## Purpose

Backup-System provides portable local backup and recovery-point support for 门店工资助手. It defines the shared backup envelope, validates imported workspace data, creates Electron automatic recovery points, and lets users export/import plaintext or passphrase-protected manual backups.

## Current Implementation

Backup support spans `shared/backup-format.js`, `electron/backup-store.cjs`, Electron IPC handlers, and backup flows in `src/App.jsx`. Automatic recovery points are desktop-only. Manual JSON backup export/import is available from the renderer.

### Capabilities

**Shared backup envelope**

- `shared/backup-format.js` defines `BACKUP_TYPE = "store-payroll-backup"` and legacy support through `LEGACY_BACKUP_TYPES`.
- `STORAGE_KEY = "payroll-workspace-v1"` identifies the workspace payload target.
- `MAX_BACKUP_BYTES = 25 * 1024 * 1024` rejects imports larger than 25 MB.
- Plain backup payloads use a JSON envelope containing `type`, `version`, `storageKey`, `exportedAt`, optional `reason`, optional `protected`, and `data`.

**Backup reason taxonomy**

- `BACKUP_REASONS` defines five allowed reasons: `daily-startup`, `before-restore`, `month-close`, `before-demo-reset`, and `manual`.
- `BACKUP_REASON_LABELS` maps each reason to a Chinese UI label.
- Electron automatic backups reject unknown reasons.

**Validation**

- `validateBackupPayload(payload)` accepts current and legacy backup types and requires the correct `storageKey`.
- `validateWorkspaceData(data)` checks basic workspace structure: stores array, monthlyRecords object, optional employee/assignment/adjustment/ruleHistory arrays, and minimal store fields.
- `validateBackupFileSize(bytes)` rejects invalid or oversized import files.
- Protected manual backups are decrypted first; the decrypted plaintext backup payload is then validated.

**Automatic recovery points**

- `electron/backup-store.cjs` stores recovery points under the Electron `userData/backups/` directory.
- `create(payload, reason)` validates the plaintext payload, validates the reason, writes via temp file plus rename, and applies retention.
- Daily startup backups are deduplicated to one `daily-startup` recovery point per calendar day.
- Retention keeps the newest `maxBackups` files, defaulting to 10.
- `list()` returns valid backup files sorted newest first with ID, creation time, reason, label, and size.
- Damaged backup files are excluded from `list()` and fail explicitly if read by ID.
- `read(id)` validates backup IDs with a conservative filename regex before reading.
- Create operations are serialized through a promise queue.

**Manual backup export/import**

- `makeBackupPayload(workspace)` in `src/App.jsx` creates the plaintext backup payload used for manual export and automatic backup calls.
- `exportWorkspaceBackup(passphrase)` exports plaintext JSON when no passphrase is provided.
- When a passphrase is provided, `exportWorkspaceBackup()` encrypts the plaintext payload with WebCrypto PBKDF2 and AES-GCM, then downloads a protected JSON envelope containing salt, IV, and ciphertext in `data`.
- `prepareWorkspaceRestore(file, passphrase)` validates size, parses JSON, decrypts protected backups when needed, validates the resulting payload, migrates workspace data, and opens a confirmation modal.
- Restore creates an automatic safety backup first when desktop backup APIs are available.

**Automatic backup triggers**

- Daily startup backup is created from the loaded workspace in desktop mode.
- Before restore backup is created before replacing the current workspace.
- Month-close backup is created after `closeStoreMonth()` succeeds.
- Before demo reset backup is created before resetting to generic demo data.

## Architecture

Backup-System uses a shared envelope and validation module, a desktop main-process store for automatic recovery points, and renderer flows for manual backup UX.

### Shared Format (`shared/backup-format.js`)

- `BACKUP_TYPE`, `LEGACY_BACKUP_TYPES`, `STORAGE_KEY`, `MAX_BACKUP_BYTES`
  - Backup identity and size constants.
- `BACKUP_REASONS`, `BACKUP_REASON_LABELS`
  - Reason constants and UI labels.
- `validateWorkspaceData(data)`
  - Basic workspace structure validation.
- `validateBackupPayload(payload)`
  - Plain backup envelope validation.
- `validateBackupFileSize(bytes)`
  - Import size guard.

### Desktop Backup Store (`electron/backup-store.cjs`)

- `createBackupStore({ baseDir, maxBackups, now })`
  - Creates a recovery point manager under `baseDir/backups`.
- `create(payload, reason)`
  - Validates, writes, deduplicates daily startup backups, and enforces retention.
- `list()`
  - Returns valid recovery point metadata.
- `read(id)`
  - Validates ID and returns a validated payload.

### IPC Bridge

- `electron/main.cjs`
  - Registers `payroll-backup:create`, `payroll-backup:list`, and `payroll-backup:read` handlers.
- `electron/preload.cjs`
  - Exposes `createBackup`, `listBackups`, and `readBackup` on `window.payrollDesktop`.

### Renderer UX (`src/App.jsx`, `src/pages/SettingsPage.jsx`, `src/components/RecoveryScreen.jsx`)

- `App.jsx`
  - Owns backup payload creation, encryption/decryption helpers, restore confirmation, auto-backup refresh, and recovery-screen restore flow.
- `SettingsPage.jsx`
  - Provides manual export, encrypted export, file restore, automatic backup listing, create recovery point, and restore recovery point actions.
- `RecoveryScreen.jsx`
  - Presents recovery actions when workspace startup detects corrupt data.

## Integration Points

- `src/storageAdapter.js`
  - Re-exports backup constants and validation helpers for renderer import flows.
- `electron/workspace-store.cjs`
  - Reuses the same backup envelope validation for canonical `workspace.json` reads.
- `src/backupFormat.test.js`, `src/backupStore.test.js`, `src/backupReason.test.js`
  - Test shared validation, automatic backup behavior, and reason constants.

## Current Limitations

- Automatic recovery points are plaintext JSON on disk.
- Canonical desktop workspace saves use the backup envelope but do not include checksums.
- Protected manual backups are encrypted, but automatic recovery points are not.
- Damaged automatic backups are hidden from the list rather than shown with an error state.
- Retention is fixed by code (`maxBackups`, default 10) and not user-configurable.
- Protected backup passphrases are not recoverable, remembered, or strength-scored.
- Backup comparison, restore preview diff, and metadata export are not implemented.
- The backup validator checks basic structure, not full workspace invariants.

## Future Directions

- Add checksum validation to workspace files and backup files.
- Surface damaged recovery points with readable error reasons.
- Add backup verification without restore.
- Add backup comparison before restore.
- Add user-configurable retention by count, age, and reason.
- Add optional encryption for automatic recovery points after product recovery rules are defined.
- Add backup metadata export for support and release validation.
