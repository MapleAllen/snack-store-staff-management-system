# Desktop-Security Module Description

## Module Name

Desktop-Security

## Purpose

Desktop-Security provides application-level access protection for the Electron desktop version of 门店工资助手. It gives a single local user a PIN barrier against casual access while preserving the product boundary that OS account isolation, disk encryption, and controlled backups remain required for real payroll data protection.

## Current Implementation

Desktop security is implemented in `electron/main.cjs`, `electron/preload.cjs`, `src/components/LockScreen.jsx`, `src/pages/SettingsPage.jsx`, and `src/App.jsx`. PIN hashing and verification run in the Electron main process. The renderer only receives IPC methods exposed through the preload bridge.

### Capabilities

**Electron process hardening**

- `BrowserWindow` is created with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
- Renderer navigation is restricted to the development server origin in dev mode or `file:` in packaged mode.
- New windows are denied through `setWindowOpenHandler(() => ({ action: "deny" }))`.
- Default session permission checks and permission requests are denied.
- The renderer accesses desktop features only through `window.payrollDesktop` from `electron/preload.cjs`.

**PIN storage and verification**

- PIN must match `/^\d{4,6}$/`.
- `hashPin(pin, salt)` uses Node `crypto.pbkdf2Sync()` with 100,000 iterations, SHA-512, 64-byte output, and a 16-byte random salt when setting a new PIN.
- `lock.json` in Electron `userData` stores only `pinHash` and `salt`.
- `loadLockState(baseDir)` reads `lock.json` on app startup; missing or invalid state clears in-memory PIN state.
- `saveLockState(baseDir)` writes or removes `lock.json` after PIN changes.

**Lock IPC API**

- `lock:status` returns `{ locked: lockPinHash !== null, pinSet: lockPinHash !== null }`.
- `lock:set-pin` validates the new PIN and requires old PIN verification when changing an existing PIN.
- `lock:unlock` verifies PIN and enforces in-memory attempt limits.
- `lock:lock` resets failed-attempt state and returns success; the renderer sets the current session lock screen state.
- `lock:clear-pin` requires current PIN verification and removes persisted PIN state.

**Brute-force protection**

- `MAX_PIN_ATTEMPTS = 5`.
- `PIN_COOLDOWN_MS = 30_000`.
- After five failed unlock attempts, `lock:unlock` throws `lock:pin-attempt-limited` and starts a 30-second cooldown.
- Successful unlock resets failed attempts and cooldown state.
- Failed-attempt and cooldown state are in memory and reset when the app process restarts.

**Renderer lock UX**

- `App.jsx` checks `desktopApi.getLockStatus()` after workspace load; if a PIN exists, it renders `LockScreen` before the workspace.
- `LockScreen.jsx` accepts numeric input, strips non-digits, renders digit indicators, and calls `window.payrollDesktop.unlock(pin)`.
- `SettingsPage.jsx` provides set PIN, change PIN, clear PIN, and manual lock controls when `window.payrollDesktop` exists.
- PIN management UI maps known IPC error codes to Chinese messages.

## Architecture

Desktop-Security is split between main-process credential handling and renderer UI gating. The main process stores and verifies PIN secrets; the renderer controls whether the current UI session is showing the lock screen.

### Main Process (`electron/main.cjs`)

- `loadLockState(baseDir)` and `saveLockState(baseDir)`
  - Persist or clear `lock.json`.
- `hashPin(pin, salt)` and `verifyPin(pin)`
  - Derive and compare PIN hashes.
- IPC handlers
  - `lock:status`, `lock:set-pin`, `lock:unlock`, `lock:lock`, and `lock:clear-pin`.
- Electron security setup
  - BrowserWindow webPreferences, navigation guard, window-open denial, and permission denial.

### Preload Bridge (`electron/preload.cjs`)

- `getLockStatus()`
- `setPin(pin, oldPin)`
- `unlock(pin)`
- `lock()`
- `clearPin(pin)`

### Renderer UI (`src/components/LockScreen.jsx`, `src/pages/SettingsPage.jsx`, `src/App.jsx`)

- `LockScreen.jsx`
  - PIN input and unlock submission.
- `SettingsPage.jsx`
  - PIN setup, change, clear, and manual lock controls.
- `App.jsx`
  - Startup lock-state check and `appLocked` UI gate.

## Integration Points

- `src/storageAdapter.js`
  - Separate from lock state; workspace storage is not encrypted by the PIN.
- `docs/data-safety.md` and `SECURITY.md`
  - Document that PIN lock does not replace OS account isolation or disk encryption.

## Current Limitations

- PIN is an app access barrier only; it does not encrypt `workspace.json` or automatic recovery points.
- `lock:status` uses PIN existence as the startup locked signal; there is no persistent per-session lock state in the main process.
- Manual lock relies on renderer state after `lock:lock` returns success.
- Failed-attempt counters and cooldowns are in memory and reset on app restart.
- There is no forgot-PIN recovery mechanism, recovery code, or OS-level credential integration.
- Auto-lock on idle, app minimize, screen lock, system sleep, or resume is not implemented.
- PIN entropy is limited to 4-6 digits, so protection depends heavily on OS-level access controls.
- `lock.json` is readable by anyone with filesystem access, although it stores a salted hash rather than the PIN.

## Future Directions

- Add persistent lock session state in the main process.
- Add auto-lock on idle, system sleep/resume, minimize, or focus loss.
- Add persistent failed-attempt counters and escalating cooldowns.
- Add recovery code support for forgotten PINs.
- Add lock event audit logs.
- Add optional Windows Hello support after Windows release signing and regression processes exist.
- Add optional workspace encryption as a separate storage feature, not as a side effect of PIN lock.
