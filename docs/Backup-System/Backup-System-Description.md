# Backup-System - Description

## Module Name

Backup-System

## Purpose

Provides a shared backup format, structural validation, reason-tagged auto recovery points, and manual backup export/import with optional passphrase protection. The system spans Electron main process (auto backups, file I/O) and the renderer (manual export/import, encryption).

## Current Implementation

### Capabilities

**Shared backup format**
- `shared/backup-format.js` defines the canonical backup envelope: `{ type, version, storageKey, exportedAt, reason, protected, data }`.
- `BACKUP_TYPE = "store-payroll-backup"` and `LEGACY_BACKUP_TYPES` support v1 and v2 backup files.
- `STORAGE_KEY = "payroll-workspace-v1"` identifies the payload target.
- `MAX_BACKUP_BYTES = 25 * 1024 * 1024` enforces a 25 MB import limit.

**Backup reason taxonomy**
- Five frozen reason constants: `DAILY_STARTUP`, `BEFORE_RESTORE`, `MONTH_CLOSE`, `BEFORE_DEMO_RESET`, `MANUAL`.
- Corresponding Chinese labels via `BACKUP_REASON_LABELS`.
- All references (renderer, preload, main, validation) use these shared constants — no ad-hoc reason strings.

**Backup validation**
- `validateBackupPayload(payload)`: checks type (current or legacy), storageKey match, and structural validation of embedded data via `validateWorkspaceData()`.
- `validateWorkspaceData(data)`: validates top-level keys (stores array, monthlyRecords object), nested array types, and individual store structure (id, name, config).
- `validateBackupFileSize(bytes)`: rejects files exceeding `MAX_BACKUP_BYTES`.

**Auto recovery points (main process)**
- `electron/backup-store.cjs`: manages recovery point lifecycle within `userData/backups/`.
- `create(payload, reason)`: creates a timestamped JSON backup file with reason label.
- Daily startup deduplication: only one `DAILY_STARTUP` backup per calendar day.
- Atomic write via temp file + rename.
- `list()`: returns all valid backups sorted by creation date, with size metadata.
- Damaged files are silently excluded from listing but fail explicitly when read by ID.
- `read(id)`: loads and validates a specific backup by filename ID.
- Retention: keeps up to `maxBackups` (default 10); excess oldest backups are deleted on each create.
- Operation serialization via a promise queue to prevent concurrent create operations.

**Manual backup (renderer)**
- Export path in `src/App.jsx` (lines 68-112): supports plaintext JSON export (backward compatible with v1) and passphrase-protected AES-256-GCM export.
- Import path in `src/App.jsx`: validates backup format, supports both plaintext and encrypted imports with passphrase prompt.
- Encryption uses WebCrypto PBKDF2 key derivation + AES-256-GCM in the renderer context.
- Wrong passphrase rejection without polluting the current workspace.
- Backup labels use unified `BACKUP_REASONS.MANUAL` constant.

### Architecture

| File | Runtime | Role |
|---|---|---|
| `shared/backup-format.js` | Shared | Envelope format, constants, validation |
| `electron/backup-store.cjs` | Main process | Auto recovery point I/O, retention, dedup |
| `electron/main.cjs` | Main process | IPC handlers: `payroll-backup:create`, `:list`, `:read` |
| `electron/preload.cjs` | Preload | `createBackup`, `listBackups`, `readBackup` APIs |
| `src/App.jsx` | Renderer | Manual backup export/import, encryption/decryption |
| `src/storageAdapter.js` | Renderer | Re-exports `validateBackupPayload` for backup import use |

**Backup flow: auto restore point**

```
App.jsx → window.payrollDesktop.createBackup(payload, reason)
  → preload.cjs → ipcRenderer.invoke("payroll-backup:create", ...)
    → main.cjs → backupStore.create(payload, reason)
      → backup-store.cjs: validate, dedup, atomic write, retention
```

**Backup flow: manual export**

```
App.jsx → user chooses plaintext or protected
  → plaintext: JSON.stringify + download
  → protected: WebCrypto PBKDF2 + AES-256-GCM encrypt → download as .json
```

**Backup flow: manual import**

```
App.jsx → file picker → read file
  → validateBackupPayload() → detect protected flag
  → if protected: prompt passphrase, WebCrypto decrypt, validate plaintext result
  → apply backup data to workspace
```

### Integration Points

- **App.jsx**: Originates all backup operations — auto triggers (daily startup, before restore, month close, before demo reset), manual export/import, and recovery screen restore.
- **workspace-store.cjs**: Reuses the `validateBackupPayload()` function to validate the canonical workspace file on load.
- **storageAdapter.js**: Re-exports `validateBackupPayload` so import flows can use the same validation.

### Current Limitations

- Auto recovery points are unencrypted plaintext JSON on disk.
- Retention is fixed at 10 maximum; no configurable retention policy.
- Backup list excludes damaged files without notifying the user why they were excluded.
- Encrypted backup passphrase is not rememberable or cacheable; the user must re-enter it for every restore.
- Daily startup dedup only checks same-date same-reason in memory; a restarted process loses the dedup state until list() is called again.
- Backup store does not enforce file naming conventions beyond timestamp + reason; no collision prevention on sub-second creates.
- No backup integrity checksum beyond JSON validation.

### Future Directions

- Add backup integrity SHA256 in the envelope.
- Add configurable retention policies (by count, age, or reason).
- Add backup compression for large workspaces.
- Add backup comparison: show what changed between two recovery points.
- Add scheduled automatic backup beyond daily startup.
- Add passphrase strength indicators for protected backups.
- Add backup export in a format compatible with external payroll audit tools.
- Add offline backup verification (validate without loading into live workspace).
