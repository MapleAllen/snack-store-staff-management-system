# Storage-Adapter - Plan

## Objective

Deliver a resilient, transparent, and future-proof persistence layer where every write is atomic, every read is validated, corruption is detected before data loss occurs, and the storage backend can evolve without breaking existing workspaces.

## Design Principles

- **Corruption is never overwritten**: A corrupt workspace must enter recovery mode; under no circumstances may demo data replace user data silently.
- **Save status is honest**: UI save indicators must reflect actual I/O results, not optimistic assumptions.
- **Atomic writes only**: Desktop saves use temp-file + rename; partial writes must never result in a usable corrupt file.
- **Migration is transparent**: Desktop-first runs that detect legacy browser data must bridge-migrate without user intervention.
- **Backend agnosticism**: The renderer adapter interface must remain identical regardless of whether the backend is localStorage, filesystem, IndexedDB, or future backends.
- **No multi-instance silent corruption**: Once implemented, concurrent desktop instances must not be able to overwrite workspace data.

## Phases

### Phase 1: Desktop Workspace File and Bridge Migration — DONE

Completed work:
- Dual-backend routing via `storageAdapter.js:35-58`.
- Atomic save with temp file + rename in `workspace-store.cjs:44-65`.
- Bridge migration from browser localStorage to desktop file: `storageAdapter.js:48-55`.
- Corruption detection → recovery mode without silent demo reset.
- IPC handlers in `main.cjs:113-126`, preload APIs in `preload.cjs:8-10`.
- Save queue serialization in workspace-store to prevent concurrent writes: `workspace-store.cjs:76-80`.

### Phase 2: Workspace File Encryption — NOT STARTED

Goal: Add optional passphrase-based encryption for the canonical workspace file.

Tasks:
- Add encrypted format envelope with key derivation (PBKDF2) and AES-256-GCM, matching the protected backup approach.
- Support opt-in encryption: user sets a workspace passphrase that encrypts the file on disk.
- Decrypt on load with passphrase prompt; fall back to recovery options if passphrase is lost.
- Document encryption boundaries: encrypted file does not replace OS-level disk encryption.
- Keep plaintext mode as the default; encryption is opt-in.

### Phase 3: Write-Ahead Logging and Crash Recovery — NOT STARTED

Goal: Prevent workspace corruption from application crashes during save.

Tasks:
- Implement write-ahead log: before overwriting `workspace.json`, write the intended change to a journal file.
- On startup after crash, detect journal presence and apply or discard the pending write.
- Add save sequencing: each save carries a monotonic sequence number checked on load.
- Add atomic-save with fsync on the temp file before rename.
- Add integrity checksum (SHA256) in the save envelope for corruption detection beyond JSON parse errors.

### Phase 4: Multi-Instance Locking — NOT STARTED

Goal: Prevent data corruption from concurrent Electron instances.

Tasks:
- Add instance lock file with PID and timestamp on startup.
- Second instance detects lock file, checks if PID is alive, and either refuses to start or prompts the user.
- Clean up lock file on graceful shutdown.
- Handle stale lock files from crashed instances (timeout-based or PID-check-based).

### Phase 5: Browser-Mode Save Detection — NOT STARTED

Goal: Track actual async save results in browser mode for honest UI feedback.

Tasks:
- Replace static `getStatus()` return in browser mode with actual save-state tracking.
- Expose `saveState` transitions: idle → saving → saved/error.
- Add `lastSavedAt` tracking in browser mode.
- Add storage quota check before save and return `workspace:disk-full` when approaching quota.

### Phase 6: Backend Extensibility — NOT STARTED

Goal: Allow new storage backends to plug into the adapter without changing App.jsx.

Tasks:
- Define a `StorageBackend` interface: `{ load(), save(ws), getStatus() }`.
- Factor localStorage logic into a dedicated `LocalStorageBackend`.
- Factor IPC logic into a `DesktopIPCBackend`.
- Add an `IndexedDBBackend` for browser environments approaching localStorage limits.
- Add backend selection logic with fallback chain: try Desktop → try IndexedDB → try localStorage.

### Phase 7: Testing Strategy — PARTIALLY COMPLETED

Completed work:
- Existing tests cover workspace store load/save/corrupt paths: `workspaceStore.test.js` — 3 tests.

Remaining tasks:
- Add tests for migration from localStorage to desktop file.
- Add tests for corruption detection and correct recoveryState propagation.
- Add tests for atomic save failure and temp file cleanup.
- Add tests for disk-full and permission-denied error code mapping.
- Add tests for concurrent save serialization.

## Implementation Rules

- Do not remove or change the "corrupt-fallback" path behavior: corrupt data must always enter recovery mode.
- Do not change the save envelope format without a version bump and backward-compatible read support.
- Do not add encryption without documenting that encryption is not a substitute for OS-level disk encryption.
- Do not delete old localStorage data during bridge migration — it serves as rollback safety.
- Do not make encryption mandatory or opt-out without a product decision and documented PIN/passphrase recovery strategy.

## Open Questions

- Should the workspace file encryption passphrase be the same as the app PIN, or a separate credential?
- Should multi-instance detection be a hard block or a warning with an override option?
- Should IndexedDB backend use the same backup-envelope format as the desktop file store?
- Should save-retry be automatic or require user acknowledgment of the failure?
