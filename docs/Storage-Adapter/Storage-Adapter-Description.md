# Storage-Adapter Module Description

## Module Name

Storage-Adapter

## Purpose

Storage-Adapter provides the runtime persistence boundary for the local payroll workspace. It lets the same React app run in a Web development preview backed by `localStorage` and in Electron desktop mode backed by a main-process workspace file, while preserving migration and corruption recovery behavior.

## Current Implementation

The renderer adapter is implemented in `src/storageAdapter.js`. Desktop file I/O is implemented in `electron/workspace-store.cjs` and exposed through `window.payrollDesktop` from `electron/preload.cjs`. The adapter decides which backend to use at runtime and returns a common result shape to `src/App.jsx`.

### Capabilities

**Runtime backend selection**

- `loadWorkspace()` uses `window.payrollDesktop` when available and falls back to browser `localStorage` otherwise.
- `saveWorkspace(workspace)` writes through the same selected backend.
- `getStorageStatus()` returns backend status from Electron or a static browser fallback.
- `isDesktopStorage()` returns whether the desktop bridge exists.

**Desktop workspace load**

- Calls `window.payrollDesktop.loadWorkspace()` which invokes the `workspace:load` IPC handler.
- `electron/workspace-store.cjs` reads `workspace.json` from Electron `userData`.
- The workspace file is a backup-format envelope and is validated with `validateBackupPayload()` before returning embedded data.
- The renderer applies `migrateWorkspace()` after desktop load.
- Missing desktop workspace enters `recoveryState: "missing"` and may bridge old browser `localStorage` data into the desktop file.
- Corrupt desktop workspace returns `recoveryState: "corrupt-fallback"` and does not overwrite the corrupt file with demo data.

**Desktop workspace save**

- `workspace-store.cjs` wraps the workspace in a backup-format envelope and writes `workspace.json` using temp file plus rename.
- Save operations are serialized through an internal promise queue.
- Save failures map `ENOSPC` to `workspace:disk-full`, `EACCES` to `workspace:write-denied`, and other failures to `workspace:save-failed`.

**Browser development preview**

- Browser mode reads and writes `localStorage` using `STORAGE_KEY` from `shared/backup-format.js`.
- Browser load validates a minimal structure before calling `migrateWorkspace()`.
- Browser save reports an error if `localStorage.setItem()` fails.
- Browser mode is development-only and does not provide automatic recovery points, PIN lock, or desktop file storage.

**Recovery behavior**

- Corrupt data paths return `recoveryState: "corrupt-fallback"`.
- `App.jsx` renders `RecoveryScreen` for corrupt startup state and offers restore from backup, reset to demo, or other recovery actions.
- Missing data uses `createInitialWorkspace()` through the application fallback path after load completes.

## Architecture

Storage-Adapter is a renderer facade over browser storage and Electron IPC. Desktop persistence happens only in the main process.

### Renderer Adapter (`src/storageAdapter.js`)

- `browserLoadWorkspace()`
  - Reads and minimally validates browser `localStorage`.
- `browserSaveWorkspace(workspace)`
  - Writes workspace JSON to browser `localStorage`.
- `browserGetStatus()`
  - Returns static browser-mode storage status.
- `loadWorkspace()`
  - Selects desktop or browser backend and applies migration.
- `saveWorkspace(workspace)`
  - Selects desktop or browser save path and normalizes errors.
- `getStorageStatus()` and `isDesktopStorage()`
  - Provide environment/status helpers.

### Desktop Store (`electron/workspace-store.cjs`)

- `createWorkspaceStore({ baseDir, now })`
  - Creates the workspace file store rooted at Electron `userData`.
- `load()`
  - Reads `workspace.json`, parses JSON, validates the backup envelope, and returns workspace data.
- `save(workspace)`
  - Writes the envelope atomically through `workspace.json.tmp` then `rename()`.
- `getStatus()`
  - Returns a static desktop status object.

### IPC Bridge

- `electron/main.cjs`
  - Registers `workspace:load`, `workspace:save`, and `workspace:status` handlers.
- `electron/preload.cjs`
  - Exposes `loadWorkspace`, `saveWorkspace`, and `getWorkspaceStatus` on `window.payrollDesktop`.

## Integration Points

- `src/App.jsx`
  - Loads workspace at startup, saves after workspace state changes, handles corrupt recovery state, and displays save status.
- `src/payrollData.js`
  - Provides `createInitialWorkspace()` and `migrateWorkspace()`.
- `shared/backup-format.js`
  - Provides `STORAGE_KEY`, `BACKUP_TYPE`, `BACKUP_REASONS`, and `validateBackupPayload()`.
- `src/workspaceStore.test.js`
  - Tests desktop store missing, save/load, and corrupt file states.

## Current Limitations

- The canonical desktop workspace file is plaintext JSON in v2.x.
- The workspace envelope is structurally validated but does not include a checksum or tamper-evident hash.
- Browser `getStorageStatus()` and desktop `getStatus()` return static status rather than live save queue state.
- The desktop save envelope hardcodes `version: "2.0.0"` instead of deriving it from the app version or workspace version.
- Bridge migration reads old browser `localStorage` but intentionally does not delete it.
- There is no multi-instance lock; two desktop app instances could race to write the same workspace file.
- There is no write-ahead journal or fsync-based durability step beyond temp-file plus rename.
- Save queue continuation swallows previous errors to keep later saves possible; callers only see errors for their explicit save call.

## Future Directions

- Add workspace file checksum validation.
- Add write-ahead journaling and crash recovery.
- Add single-instance or file-lock protection.
- Add optional encrypted workspace file storage with a documented recovery model.
- Add live save-state reporting for browser and desktop modes.
- Add app-version metadata to workspace save envelopes.
- Add an IndexedDB fallback for Web development workspaces that exceed localStorage limits.
