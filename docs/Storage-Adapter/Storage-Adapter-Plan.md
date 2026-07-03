# Storage-Adapter Plan

## Objective

Deliver a resilient local persistence layer where workspace writes are atomic, corrupt data is never silently overwritten, save state is visible, and future commercial storage improvements such as checksums, journaling, encryption, and multi-instance protection can be added without changing page-level business code.

## Design Principles

- Corrupt workspace data enters recovery mode and must not be replaced automatically by demo data.
- The renderer uses one storage interface regardless of backend.
- Desktop file I/O remains in the Electron main process; the renderer never receives Node filesystem access.
- Saves are atomic before they are convenient.
- Storage improvements must preserve old workspace and backup compatibility.
- Encryption, if added, must be optional until the product defines credential recovery.
- Web mode remains a development preview and must not be documented as the commercial storage target.

## Phase 1: Desktop Workspace File and Recovery Boundary — DONE

Status: **Done**

Goals:

- Move desktop persistence behind a main-process workspace file and prevent silent corrupt-data overwrite.

Completed work:

- `src/storageAdapter.js` selects desktop IPC or browser `localStorage`.
- `electron/workspace-store.cjs` reads and writes `workspace.json` with temp-file plus rename.
- Desktop workspace load validates the backup-format envelope before returning data.
- Corrupt desktop and browser data returns `recoveryState: "corrupt-fallback"`.
- Legacy browser `localStorage` can bridge into the desktop workspace file when no file exists.
- Tests cover missing workspace, save/load round trip, and malformed workspace file.

## Phase 2: Save Status and Error Transparency — NOT STARTED

Status: **Not Started**

Goals:

- Make UI save status match actual backend state.

Remaining features:

- Track live save state in the desktop store: idle, saving, saved, failed.
- Track browser save timestamps and failures beyond the current static status object.
- Surface backend error codes with user-actionable messages.
- Add tests for disk-full, permission-denied, localStorage quota failure, and concurrent save serialization.

## Phase 3: Integrity Checks and Journaling — NOT STARTED

Status: **Not Started**

Goals:

- Detect workspace corruption beyond JSON parse errors and recover from interrupted writes.

Remaining features:

- Add SHA256 checksum metadata to workspace save envelopes.
- Validate checksum on load before migration.
- Add write-ahead journal or last-known-good copy for crash recovery.
- Add monotonic save sequence numbers to detect stale writes.
- Add temp-file cleanup and recovery tests.

## Phase 4: Multi-Instance Protection — NOT STARTED

Status: **Not Started**

Goals:

- Prevent simultaneous desktop instances from overwriting the same local workspace.

Remaining features:

- Add a single-instance lock or lock file with PID and timestamp.
- Detect stale locks after crash.
- Show a clear startup message when another instance owns the workspace.
- Add Windows real-device validation for double-launch behavior.

## Phase 5: Optional Workspace Encryption — NOT STARTED

Status: **Not Started**

Goals:

- Provide local confidentiality for users who choose to encrypt the canonical workspace file.

Remaining features:

- Define encrypted workspace envelope format separate from protected manual backups if needed.
- Add passphrase prompt and decrypt path on startup.
- Add explicit lost-passphrase recovery documentation.
- Keep plaintext mode available unless a product decision changes the default.
- Add tests for correct passphrase, wrong passphrase, and corrupt encrypted payload.

## Phase 6: Backend Extensibility — NOT STARTED

Status: **Not Started**

Goals:

- Keep persistence pluggable as the product grows.

Remaining features:

- Define a renderer-side `StorageBackend` interface.
- Split browser `localStorage` and desktop IPC logic into backend objects.
- Add IndexedDB backend for Web development preview when localStorage size becomes limiting.
- Add backend migration tests.

## Phase 7: Testing Strategy — PARTIALLY COMPLETED

Status: **Partially Completed**

Goals:

- Verify all persistence failure modes before commercial release.

Completed work:

- `src/workspaceStore.test.js` covers missing, valid round-trip, and corrupt workspace file states.

Remaining features:

- Add adapter-level tests for desktop missing plus browser bridge migration.
- Add localStorage corrupt and quota tests.
- Add atomic save failure and temp-file cleanup tests.
- Add checksum, journal, and multi-instance tests when those phases are implemented.

## Implementation Rules

- Do not return demo data on corrupt workspace load.
- Do not expose Node filesystem APIs to the renderer.
- Do not delete legacy localStorage during bridge migration without an explicit rollback decision.
- Do not make workspace encryption mandatory without a recovery and support plan.
- Do not change the workspace envelope format without backward-compatible load support.

## Open Questions

- Should workspace encryption use the same passphrase as protected backups, a separate passphrase, or OS-backed credentials?
- Should a second desktop instance be blocked hard, or allowed read-only?
- Should checksums be added to both workspace files and manual backups in the same release?
- Should browser preview move from localStorage to IndexedDB before or after commercial desktop release work?
