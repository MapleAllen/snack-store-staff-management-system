# Shared Contracts

## Ownership

Owner: Codex / macOS host
Dependencies: None
Working branch: `main`

## Active Task Lock

Owner: Codex
Starting main SHA: `5ba7fcbfff30b4df377820a3f56f75945b9a1ad8`
Status: IN PROGRESS

## Allowed Files

- `plan/active/desktop-commercial-hardening/01-shared-contracts.md`
- Temporary interface sketches or reference notes only in `plan/active/desktop-commercial-hardening/`

## Do Not Modify

- `shared/backup-format.js`
- `electron/main.cjs`
- `electron/preload.cjs`
- `electron/backup-store.cjs`
- `src/payrollLogic.js`
- `src/workspaceOperations.js`
- `src/App.jsx`
- `src/pages/*`

The contracts defined below are a frozen specification. Implementation changes to the files listed above belong to `02-windows`, not this task lock.

---

## 1. Storage Adapter — Renderer Side

The renderer accesses workspace persistence through a storage adapter. The adapter detects the runtime environment and routes to the correct backend.

### 1.1 Adapter Shape

```text
WorkspaceStorageAdapter = { load, save, getStatus }
```

### 1.2 `loadWorkspace()`

```
async loadWorkspace() → { workspace, source, recoveryState }

source: "desktop-file" | "web-localStorage"
recoveryState: "normal" | "migrated" | "recovered" | "corrupt-fallback"
```

- Desktop path: IPC `workspace:load` → main process reads canonical workspace file.
- Web path: sync read `window.localStorage.getItem(STORAGE_KEY)`, parse, `migrateWorkspace(...)`.
- On `source === "desktop-file"` and load succeeds but shows migration was needed: `recoveryState = "migrated"`.
- On first desktop run with no canonical file but existing `localStorage`: bridge-read `localStorage`, return `{ source: "web-localStorage", recoveryState: "migrated" }`. The caller (`02-windows`) will then save to the canonical file.
- On no data anywhere: return `createInitialWorkspace()` with `recoveryState = "normal"` (first launch).

**Critical behavioral rule**: NEVER silently return `createInitialWorkspace()` when prior storage exists but is corrupt. The corrupt-data path MUST return `recoveryState = "corrupt-fallback"` and surface the corruption before any automatic save-then-overwrite sequence. This is the single most important behavioral contract in this plan.

### 1.3 `saveWorkspace(workspace)`

```
async saveWorkspace(workspace: object) → { status, savedAt, error? }

status: "saved" | "error"
savedAt: ISO-8601 string | null
error: WorkspaceError | null
```

- Desktop path: IPC `workspace:save` → main process writes atomically.
- Web path: `window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))`, catch `QuotaExceededError` or other write failures.
- The caller MUST respect the returned `status` and not assume synchronous success.
- The previous synchronous `localStorage.setItem` + optimistic `setSaveState(...)` pattern in `App.jsx:113-121` will be retired by `02-windows`.

### 1.4 `getWorkspaceStorageStatus()`

```
sync getWorkspaceStorageStatus() → { mode, saveState, lastSavedAt, recoveryState }

mode: "desktop-file" | "web-localStorage"
saveState: "saved" | "saving" | "error" | "idle"
lastSavedAt: ISO-8601 string | null
recoveryState: "normal" | "migrated" | "recovered" | "corrupt-fallback"
```

- Callers: topbar autosave indicator, settings diagnostics panel.
- Web backend: `saveState` derived from optimistic `localStorage.setItem` result.
- Desktop backend: `saveState` derived from last `workspace:save` IPC result.

### 1.5 Workspace Error Codes

```
WorkspaceError = { code, message }

Code set:
  "workspace:missing"          — no workspace data found (first run)
  "workspace:corrupt"          — data exists but structure is invalid
  "workspace:save-failed"      — write operation failed
  "workspace:write-denied"     — file permission denied
  "workspace:disk-full"        — storage quota or disk exhausted
  "workspace:migration-failed" — version upgrade rejected
```

Every error thrown by the storage layer (or propagated through IPC) MUST carry one of these `code` values.

---

## 2. Desktop IPC Channels — Main ↔ Preload ↔ Renderer

### 2.1 Workspace IPC (new)

```
Channel:        "workspace:load"
Direction:      renderer → main
Main handler:   workspaceStore.load()
Returns:        { workspace, source, recoveryState } | throws WorkspaceError
```

```
Channel:        "workspace:save"
Direction:      renderer → main
Args:           workspace: object
Main handler:   workspaceStore.save(workspace)
Returns:        { status, savedAt } | throws WorkspaceError
```

```
Channel:        "workspace:status"
Direction:      renderer → main
Main handler:   workspaceStore.getStatus()
Returns:        { mode, saveState, lastSavedAt, recoveryState }
```

### 2.2 Backup IPC (existing — retain and extend)

```
Channel:        "payroll-backup:create"
Direction:      renderer → main
Args:           payload, reason (one of BACKUP_REASONS values)
Main handler:   backupStore.create(payload, reason)
Returns:        backup metadata | throws WorkspaceError
```

```
Channel:        "payroll-backup:list"
Direction:      renderer → main
Returns:        BackupMetadata[]
```

```
Channel:        "payroll-backup:read"
Direction:      renderer → main
Args:           id: string
Returns:        backup payload | throws WorkspaceError
```

### 2.3 App Lock IPC (new)

```
Channel:        "lock:status"
Direction:      renderer → main
Returns:        { locked: boolean, pinSet: boolean }
```

```
Channel:        "lock:set-pin"
Direction:      renderer → main
Args:           pin: string, oldPin?: string
Main handler:   validates 4-6 digits; if oldPin provided, verifies old before setting new
Returns:        { success: true } | throws WorkspaceError
Errors:         "lock:pin-format-invalid", "lock:pin-old-mismatch"
```

```
Channel:        "lock:unlock"
Direction:      renderer → main
Args:           pin: string
Returns:        { success: true } | throws WorkspaceError
Errors:         "lock:pin-invalid", "lock:pin-attempt-limited"
```

```
Channel:        "lock:lock"
Direction:      renderer → main
Returns:        { success: true }
```

### 2.4 Preload API (final shape)

```javascript
// Existing
window.payrollDesktop.createBackup(payload, reason) → Promise<BackupMetadata>
window.payrollDesktop.listBackups()                   → Promise<BackupMetadata[]>
window.payrollDesktop.readBackup(id)                  → Promise<BackupPayload>

// New — workspace
window.payrollDesktop.loadWorkspace()                 → Promise<WorkspaceLoadResult>
window.payrollDesktop.saveWorkspace(workspace)         → Promise<WorkspaceSaveResult>
window.payrollDesktop.getWorkspaceStatus()             → Promise<WorkspaceStatusResult>

// New — lock
window.payrollDesktop.getLockStatus()                  → Promise<LockStatusResult>
window.payrollDesktop.setPin(pin, oldPin?)             → Promise<LockSetResult>
window.payrollDesktop.unlock(pin)                      → Promise<LockUnlockResult>
window.payrollDesktop.lock()                           → Promise<LockResult>
```

The `payrollDesktop` object remains `Object.freeze(...)`. Existing backup APIs retain the same signatures for backward compatibility.

---

## 3. Backup Format and Reason Constants

### 3.1 Shared Reason Constants (NEW — frozen)

```javascript
// shared/backup-format.js — add:
export const BACKUP_REASONS = Object.freeze({
  DAILY_STARTUP:   "daily-startup",
  BEFORE_RESTORE:  "before-restore",
  MONTH_CLOSE:     "month-close",
  BEFORE_DEMO_RESET: "before-demo-reset",
  MANUAL:          "manual",
});
```

- `electron/backup-store.cjs` MUST use `BACKUP_REASONS` values as its allowed reason set, replacing the current inline `REASON_LABELS` key set.
- `src/App.jsx` MUST use `BACKUP_REASONS.BEFORE_DEMO_RESET`, not a bare string.
- `src/App.jsx` MUST use `BACKUP_REASONS.DAILY_STARTUP` for the startup backup call.
- `src/App.jsx` MUST use `BACKUP_REASONS.BEFORE_RESTORE` for the pre-restore safety backup.
- `src/App.jsx` MUST use `BACKUP_REASONS.MONTH_CLOSE` for the post-close backup.

### 3.2 Current Reason Inconsistency (documented for 02-windows fix)

| Location | Uses | Allowed by backend? |
|---|---|---|
| `src/App.jsx:126` | `"daily-startup"` | YES |
| `src/App.jsx:269` | `"month-close"` | YES |
| `src/App.jsx:418` | `"before-restore"` | YES |
| `src/App.jsx:429` | `"before-demo-reset"` | **NO** — absent from `REASON_LABELS` in `electron/backup-store.cjs:3-8` |

The `before-demo-reset` mismatch causes `confirmDemoWorkspaceReset()` to silently fail on desktop: the backup is rejected by Electron, `createAutomaticBackup` returns `null`, and `desktopApi && !safetyBackup` at `App.jsx:430` causes an early return without resetting.

**Fix** (in `02-windows`): Add `"before-demo-reset"` to `REASON_LABELS` in `electron/backup-store.cjs`, or better, import `BACKUP_REASONS` from `shared/backup-format.js` and derive the label map from it.

### 3.3 Reason Label Map

```javascript
// shared/backup-format.js — add:
export const BACKUP_REASON_LABELS = Object.freeze({
  [BACKUP_REASONS.DAILY_STARTUP]:    "每日启动恢复点",
  [BACKUP_REASONS.BEFORE_RESTORE]:   "恢复数据前",
  [BACKUP_REASONS.MONTH_CLOSE]:      "工资月结后",
  [BACKUP_REASONS.BEFORE_DEMO_RESET]: "演示重置前",
  [BACKUP_REASONS.MANUAL]:           "手动恢复点",
});
```

`electron/backup-store.cjs` MUST use this map instead of its own inline `REASON_LABELS`.

### 3.4 Protected Backup Envelope (NEW)

When a backup is exported with a passphrase, the envelope adds:

```javascript
{
  type: BACKUP_TYPE,
  version: APP_VERSION,
  storageKey: STORAGE_KEY,
  exportedAt: ISO-8601,
  reason: BACKUP_REASONS.MANUAL,        // protected backups are always manual
  protected: true,                       // NEW
  salt: "<hex-encoded>",                // NEW — PBKDF2 salt
  iv: "<hex-encoded>",                  // NEW — AES-GCM IV
  data: "<base64-encrypted-json>",      // NEW — encrypted workspace
}
```

Unprotected backups retain the existing shape (plain `data: { ... }`). The `protected` flag drives the import logic.

### 3.5 Passphrase Rules

- Minimum length: 8 characters.
- Maximum length: 128 characters.
- Any UTF-8 character allowed (not restricted to ASCII).
- Weakness warning but not rejection: passphrases under 12 characters or all-numeric trigger a confirmation prompt but do not block export.
- Implementation detail (key derivation, cipher selection) is deferred to `02-windows`.

---

## 4. App Lock — PIN Specification

### 4.1 PIN Rules (frozen)

- Length: 4-6 characters.
- Character set: digits only (`0-9`).
- No repeated sequence detection required in v1 (e.g. `111111` is accepted).
- No expiry, no rotation requirement in v1.

### 4.2 Lock States

```
LockState = "unset" | "locked" | "unlocked"
```

- `unset`: No PIN has been configured. Lock is not active.
- `locked`: PIN is set and the UI is blocked. Renderer must not render workspace content.
- `unlocked`: PIN has been verified in this session.

### 4.3 Lock Triggers

- Manual lock: user clicks "锁定应用" in settings or topbar.
- Startup lock: on app launch, if PIN is set, state begins as `locked`.
- Auto-lock: NOT in v1. Deferred.

### 4.4 PIN Storage

- The PIN hash (NOT plaintext) is stored alongside the workspace in Electron's `userData` directory.
- The exact hashing scheme (bcrypt, argon2, PBKDF2) is deferred to `02-windows` implementation.
- Salting is required.

### 4.5 Lock Gate Behavior

When `LockState === "locked"`:
- Renderer must NOT render `App.jsx` workspace content — the entire workspace UI is replaced with a PIN entry screen.
- The PIN screen shows: digit input, error feedback, a message about what happens on repeated failures.
- On successful unlock: resume rendering the normal workspace.
- On 5 consecutive failed attempts: display a cooldown message ("请稍等 30 秒再试") and block further attempts for 30 seconds. Cooldown is enforced by the main process via IPC, not by renderer-only state.

### 4.6 PIN Reset / Recovery (deferred)

- v1 does NOT provide a "forgot PIN" recovery flow.
- If the user forgets their PIN, they must restore from a backup that was exported before the PIN was set, then re-set the PIN.
- This limitation MUST be documented in the PIN setup UI and in `docs/data-safety.md`.
- Implementation in `02-windows` MUST NOT promise or imply a recovery path that doesn't exist.

---

## 5. Manual Backup Passphrase — Behavior Specification

### 5.1 Export Flow

1. User clicks "导出数据备份" in settings.
2. App prompts: "是否使用口令保护此备份？"
3. If YES → user enters passphrase twice (confirm), app exports encrypted envelope.
4. If NO → app exports plain JSON as today.
5. In both cases, the old unprotected import path remains functional.

### 5.2 Import Flow

1. User selects a `.json` backup file.
2. App checks the `protected` flag in the envelope.
3. If `protected === true` → prompt for passphrase, decrypt, validate, proceed.
4. If `protected === false` or absent → existing validation path, proceed.
5. If `protected === true` and passphrase is wrong → error `"backup:passphrase-invalid"`, no data is written.
6. If `protected === true` and passphrase is correct → workspace candidate is prepared, user sees restore confirmation modal (unchanged from today).

### 5.3 Error Contracts

```
"backup:passphrase-required"   — file is protected, passphrase missing
"backup:passphrase-invalid"    — wrong passphrase, no data modified
"backup:passphrase-too-weak"   — export rejected: passphrase too short (<8)
"backup:export-failed"         — write or download failed
"backup:import-failed"         — parse, decrypt, or migrate failed
```

---

## 6. Workspace File Format (Desktop)

### 6.1 File Location

```
{app.getPath("userData")}/workspace.json
```

### 6.2 File Structure

Same JSON envelope as manual backup but with a fixed reason:

```json
{
  "type": "store-payroll-backup",
  "version": "2.0.0",
  "storageKey": "payroll-workspace-v1",
  "exportedAt": "2026-06-22T...",
  "reason": "workspace-save",
  "protected": false,
  "data": { ... }
}
```

The workspace file is NOT encrypted in v1. This is recorded as a known limitation.

### 6.3 Atomic Write

- Write to `workspace.json.tmp`, then `fs.rename(..., workspace.json)`.
- The same pattern is already used in `electron/backup-store.cjs:56-59` for backup temp files.

### 6.4 Corruption Detection

On load:
1. Read and parse `workspace.json`.
2. Run `validateBackupPayload(...)` from `shared/backup-format.js`.
3. Run `migrateWorkspace(...)`.
4. If any step throws: return `{ workspace: null, recoveryState: "corrupt-fallback" }`.
5. The renderer MUST then enter a recovery mode screen with options: "从备份恢复", "导出当前损坏数据", "重置为演示数据". Under no circumstances may it silently reset to demo data and save over the corrupt file.

### 6.5 First-Run Migration from Legacy localStorage

On desktop, when `workspace.json` does not exist:
1. Check if `window.localStorage.getItem(STORAGE_KEY)` has data.
2. If yes: load, validate, migrate, then immediately save to `workspace.json`.
3. Return `{ workspace, recoveryState: "migrated" }`.
4. Do NOT delete the old `localStorage` data — keep it as rollback safety for at least one bridge release.

---

## 7. Recovery Mode — Minimum UX

### 7.1 Triggers

- `recoveryState === "corrupt-fallback"` from `loadWorkspace()`
- Any IPC error with code `workspace:corrupt`

### 7.2 Recovery Screen

The renderer MUST render a full-screen recovery panel (not a toast) when recovery state is active. This panel blocks all workspace access.

Options (buttons):
1. "从备份恢复" — opens the existing backup import flow.
2. "导出当前损坏数据" — downloads the corrupt workspace file for manual inspection.
3. "重置为演示工作区" — equivalent to demo reset, but after explicit user confirmation.

The recovery screen MUST state: "当前工作区数据无法读取，请从备份恢复或导出后进行重置。"

### 7.3 What Must NOT Happen

- No automatic `createInitialWorkspace()` and save on load failure.
- No proceeding to normal UI with corrupted state.
- No overwriting the corrupt file without explicit user action.

---

## 8. Web Preview Boundary

### 8.1 What Web Preview IS

- A development tool that uses browser `localStorage` and demo data.
- Runs via `npm run dev` with Vite.
- Does NOT have app lock, desktop file storage, or automatic restore points.

### 8.2 What Web Preview IS NOT

- A commercial product mode.
- A supported data environment for real payroll.
- Subject to Windows verification requirements.

### 8.3 How the Adapter Splits

```javascript
// Conceptual adapter factory
function createStorageAdapter() {
  if (window.payrollDesktop) {
    return desktopFileAdapter(window.payrollDesktop);
  }
  return browserLocalStorageAdapter();
}
```

The web adapter keeps today's behavior: sync `localStorage` read/write, `saveState` always `"saved"` after `setItem` (optimistic), no lock support.

---

## 9. Compatibility Matrix

| Behavior | Current | After hardening | Notes |
|---|---|---|---|
| Desktop data source | `localStorage` | canonical workspace file | Migrated on first run |
| Web data source | `localStorage` | `localStorage` | Unchanged |
| Manual backup format | plain JSON | plain or encrypted JSON | Old format still importable |
| Auto restore points | plain JSON files | plain JSON files | Unchanged |
| Workspace validation on load | loose shape check | full `validateBackupPayload` | Tightens safety |
| Corrupt data recovery | silent demo reset | controlled recovery screen | Must never overwrite |
| Backup reasons | inline strings | shared constants | Fixes `before-demo-reset` |
| App lock | none | 4-6 digit PIN | Desktop only |
| Backup passphrase | none | optional password | On export/import |
| Save status indicator | optimistic sync | async IPC result | Desktop only |
| `nodeIntegration` | `false` | `false` | Invariant |
| `contextIsolation` | `true` | `true` | Invariant |
| `sandbox` | `true` | `true` | Invariant |

---

## 10. Migration Path — Old Desktop to New Desktop

```
User has: old Electron app with data in localStorage
User does: installs new version

On first launch:
  1. Rendering starts, storage adapter detects desktop.
  2. workspace:load IPC → main checks workspace.json — not found.
  3. Main returns { workspace: null, recoveryState: "missing" }.
  4. Adapter bridge: reads localStorage via injected script in preload.
  5. Validates with validateBackupPayload, migrates with migrateWorkspace.
  6. Shows "正在升级数据..." briefly, saves to workspace.json.
  7. Returns migrated workspace, recoveryState = "migrated".
  8. App renders normally. Old localStorage data is preserved.
```

---

## 11. Deferred Decisions (recorded, not blocking)

| Decision | Status | Impact |
|---|---|---|
| PIN key derivation scheme (bcrypt / argon2 / PBKDF2) | Deferred to `02-windows` | Implementation detail, does not change contract |
| Backup passphrase cipher (AES-256-GCM preferred) | Deferred to `02-windows` | Already captured in envelope spec |
| PIN forgotten recovery mechanism | Out of scope for v1 | Documented limitation; user restores from pre-PIN backup |
| Auto-lock on window blur / system sleep | Deferred past v1 | Manual lock and startup lock only for v1 |
| Canonical workspace file encryption at rest | Deferred past v1 | `protected: false` in v1; depends on BitLocker |
| Exact PIN attempt cooldown duration | Frozen at 5 attempts / 30 seconds | Can be tuned later without contract change |

---

## 12. Completion Evidence

- [x] Each interface has a frozen signature, responsibility, caller list, error contract, and compatibility rule.
- [x] Backup reason constants are frozen; `before-demo-reset` inconsistency is documented with fix path.
- [x] PIN rules are frozen: 4-6 digits, numeric only, 5-attempt cooldown, no v1 recovery.
- [x] Backup passphrase envelope and import/export flow are frozen.
- [x] Corrupt workspace recovery behavior is frozen: recovery screen, no silent demo reset, no overwrite.
- [x] Web preview boundary is frozen: `localStorage` only, development-only support.
- [x] Old-to-new desktop migration path is documented.
- [x] Deferred decisions are explicitly listed with rationale.

## Deviations

- No deviations from the original plan scope during this contract freeze.
- If any `02-windows` implementation requires a contract change, this file MUST be updated first and re-reviewed before code changes proceed.
