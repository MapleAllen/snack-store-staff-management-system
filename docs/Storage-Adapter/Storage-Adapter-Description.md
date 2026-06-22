# Storage-Adapter - Description

## Module Name

Storage-Adapter

## Purpose

Provides a runtime-aware storage abstraction layer that routes workspace persistence to either browser `localStorage` (Web dev preview) or Electron IPC-based file storage (desktop), with migration, corruption recovery, and save-status tracking.

## Current Implementation

### Capabilities

**Dual-backend storage routing**
- `loadWorkspace()`: Detects `window.payrollDesktop` presence to choose desktop IPC or browser localStorage backend.
- `saveWorkspace(workspace)`: Routes to desktop IPC or browser localStorage accordingly.
- `getStorageStatus()`: Returns `{ mode, saveState, lastSavedAt, recoveryState }` from either backend.
- `isDesktopStorage()`: Convenience boolean check for desktop environment.

**Desktop load path**
- Calls `window.payrollDesktop.loadWorkspace()` IPC → main process `workspaceStore.load()`.
- On successful load with workspace data: applies `migrateWorkspace()` and returns.
- On `recoveryState === "missing"` (no canonical workspace file): bridges to browser `localStorage` if legacy data exists, saves it to the desktop file, and returns with `recoveryState: "migrated"`.
- On any other failure state (corrupt): returns `{ workspace: null, recoveryState: "corrupt-fallback" }` without attempting to overwrite the corrupt file.

**Desktop save path**
- Calls `window.payrollDesktop.saveWorkspace(workspace)` IPC → main process `workspaceStore.save()`.
- Catches errors and normalizes error codes (`workspace:save-failed`, `workspace:write-denied`, `workspace:disk-full`).

**Browser load path**
- Reads `localStorage.getItem(STORAGE_KEY)`, parses JSON, validates basic structure (`stores` array + `monthlyRecords` object).
- Returns `recoveryState: "corrupt-fallback"` if structure is invalid or parse fails.
- Applies `migrateWorkspace()` on valid data.

**Browser save path**
- Writes `localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))`.
- Catches `QuotaExceededError` or other write failures and returns error status.

**Electron workspace store (main process)**
- `workspace-store.cjs`: Manages the canonical `workspace.json` in Electron `userData` directory.
- `load()`: Reads file, parses JSON, validates via `validateBackupPayload()` from shared backup-format.
- Returns `{ workspace, source: "desktop-file", recoveryState }` with recoveryState being "normal", "missing" (ENOENT), or "corrupt-fallback" (any other error).
- `save(workspace)`: Wraps workspace in a backup-format envelope, writes atomically via temp file + rename.
- Error mapping: `ENOSPC` → `workspace:disk-full`, `EACCES` → `workspace:write-denied`, other → `workspace:save-failed`.
- Serializes writes through a promise queue to prevent concurrent file operations.

### Architecture

| File | Runtime | Role |
|---|---|---|
| `src/storageAdapter.js` | Renderer | Environment detection, routing, bridge logic |
| `electron/workspace-store.cjs` | Main process | Canonical workspace file I/O, atomic save |
| `shared/backup-format.js` | Shared | Backup envelope format used by workspace-store for validation |

**Recovery state machine**

```
loadWorkspace()
  ├─ Desktop path
  │   ├─ workspace present → { workspace, recoveryState: "normal" }
  │   ├─ recoveryState: "missing" → bridge localStorage → { recoveryState: "migrated" }
  │   │   └─ no localStorage → { workspace: null, recoveryState: "missing" }
  │   └─ recoveryState: "corrupt-fallback" → { workspace: null }
  └─ Browser path
      ├─ data present + valid → { recoveryState: "normal" }
      ├─ data present + corrupt → { recoveryState: "corrupt-fallback" }
      └─ no data → { workspace: null, recoveryState: "missing" }
```

**Critical behavioral contract**

The corrupt-data path NEVER silently returns `createInitialWorkspace()`. It returns `recoveryState: "corrupt-fallback"` and surfaces the corruption before any automatic save-then-overwrite sequence. The caller (App.jsx) renders a RecoveryScreen with three options: restore from backup, export corrupt data, or reset to demo.

### Integration Points

- **App.jsx**: Calls `loadWorkspace()` at startup and `saveWorkspace()` after mutations. Renders `RecoveryScreen` when recoveryState is "corrupt-fallback".
- **electron/main.cjs**: Registers IPC handlers for `workspace:load`, `workspace:save`, `workspace:status` that delegate to workspaceStore.
- **electron/preload.cjs**: Exposes `loadWorkspace()`, `saveWorkspace()`, `getWorkspaceStatus()` on `window.payrollDesktop`.
- **shared/backup-format.js**: Workspace store depends on `validateBackupPayload()` for read validation; storageAdapter re-exports `BACKUP_TYPE`, `BACKUP_REASONS`, `STORAGE_KEY`, `validateBackupPayload`.

### Current Limitations

- Browser bridge migration reads localStorage but does not delete it; legacy data remains in both places after migration.
- `getStorageStatus()` in browser mode returns a static object (`saveState: "idle"`, `lastSavedAt: null`) and does not track async save-state changes.
- Desktop workspace file is unencrypted in v2.x.
- Workspace store's `save` queue silently swallows errors in the chain (`operation.catch(() => undefined)`), which could mask intermittent failures between explicit saves.
- No file locking or multi-instance detection; two simultaneous Electron instances could overwrite workspace.
- The `version: "2.0.0"` header in workspace-store's save envelope is hardcoded and not derived from `WORKSPACE_VERSION`.

### Future Directions

- Add encrypted workspace file storage.
- Add write-ahead log or journal for crash recovery during save.
- Track actual async save state in browser mode for UI consistency.
- Support workspace file locking to prevent multi-instance corruption.
- Add integrity checksum in the save envelope header.
- Add save-retry logic with exponential backoff for transient disk errors.
- Support configurable storage backends (IndexedDB, SQLite via better-sqlite3).
