# Desktop-Security - Description

## Module Name

Desktop-Security

## Purpose

Implements application-level access protection for the desktop version of the payroll application, including PIN-based lock/unlock, brute-force protection, and IPC-based credential management that keeps cryptographic operations in the Electron main process.

## Current Implementation

### Capabilities

**PIN management**
- PIN must be 4-6 numeric digits (`/^\d{4,6}$/`).
- PIN set via `lock:set-pin` IPC handler, which validates format and optionally verifies old PIN before setting a new one.
- PIN stored as PBKDF2 hash (`pbkdf2Sync`, 100,000 iterations, SHA-512, 64-byte output) with a 16-byte random salt.
- Hash and salt persisted to `lock.json` in the Electron userData directory.
- PIN cleared via `lock:clear-pin` IPC handler, requiring current PIN verification.

**Lock/unlock flow**
- `lock:status` returns `{ locked: boolean, pinSet: boolean }` — locked means PIN is set and application is in locked state.
- `lock:unlock` verifies the provided PIN against the stored hash.
- `lock:lock` sets the lock state without requiring PIN; just resets attempt counters.
- On app startup, `loadLockState()` reads `lock.json` to determine if a PIN is set.

**Brute-force protection**
- Maximum 5 failed attempts (`MAX_PIN_ATTEMPTS`).
- On 5th failure, triggers a 30-second cooldown (`PIN_COOLDOWN_MS = 30_000`).
- During cooldown, any unlock attempt throws `lock:pin-attempt-limited` immediately.
- Failed attempt counter resets on successful unlock or lock action.

**Renderer UI**
- `LockScreen.jsx` component renders PIN input with visual dot indicators for digits entered.
- Accepts numeric input only; strips non-digit characters.
- Displays error messages for wrong PIN or cooldown.
- Disables submit button when fewer than 4 digits entered or during busy state.
- Calls `window.payrollDesktop.unlock(pin)` on submit.

**Electron security posture**
- `contextIsolation: true` prevents renderer access to Node.js APIs.
- `nodeIntegration: false` keeps Node.js out of the renderer process.
- `sandbox: true` enables Chromium sandboxing.
- `will-navigate` event handler restricts navigation to the app's origin or file protocol.
- `setWindowOpenHandler(() => ({ action: "deny" }))` blocks popup windows.
- `setPermissionCheckHandler(() => false)` and `setPermissionRequestHandler((_, __, cb) => cb(false))` deny all permissions.

### Architecture

| File | Runtime | Role |
|---|---|---|
| `electron/main.cjs` | Main process | Lock state management, PIN hash/salt storage, IPC handlers for lock:set-pin, lock:unlock, lock:lock, lock:clear-pin, lock:status, brute-force tracking |
| `electron/preload.cjs` | Preload | Exposes getLockStatus, setPin, unlock, lock, clearPin via contextBridge |
| `src/components/LockScreen.jsx` | Renderer | PIN input UI component |
| `src/App.jsx` | Renderer | Lock state checking, LockScreen rendering gate |

**IPC channel map**

| Channel | Direction | Purpose |
|---|---|---|
| `lock:status` | renderer → main | Returns `{ locked, pinSet }` |
| `lock:set-pin` | renderer → main | Set or change PIN |
| `lock:unlock` | renderer → main | Verify PIN to unlock |
| `lock:lock` | renderer → main | Engage lock state |
| `lock:clear-pin` | renderer → main | Remove PIN protection |

**Lock state lifecycle**

```
App start → loadLockState(userDataPath)
  ├─ lock.json exists + valid → pinSet: true, locked: true
  └─ lock.json missing/corrupt → pinSet: false, locked: false

Locked state: renderer shows LockScreen
  → user enters PIN → lock:unlock IPC
    ├─ success → LockScreen calls onUnlock() → App.jsx renders workspace
    └─ failure → increment failedAttempts; cooldown after 5

Settings: user can set/change/clear PIN
  → lock:set-pin / lock:clear-pin IPC
    → hashPin / verifyPin → saveLockState(userDataPath)
```

### Integration Points

- **App.jsx**: Checks lock status on startup, renders LockScreen when locked, provides PIN management in SettingsPage.
- **electron/preload.cjs**: Bridges renderer lock API calls to main process IPC handlers.
- **storageAdapter.js**: Unrelated; lock state is separate from workspace data.

### Current Limitations

- No "forgot PIN" recovery mechanism; user must have exported an unencrypted backup before setting PIN.
- PIN is application-level only; does not integrate with OS-level authentication (Windows Hello, Touch ID).
- Lock state is not automatically engaged on system sleep/resume or app focus loss.
- Brute-force cooldown uses an in-memory counter that resets on app restart; persistent lockout is not implemented.
- PIN hash uses PBKDF2 with 100,000 iterations; security depends on PIN entropy (4-6 digits = 10^4 to 10^6 combinations).
- `lock.json` is plaintext JSON; the hash and salt are readable by anyone with filesystem access.
- No mechanism for temporary PIN, emergency access code, or recovery key.

### Future Directions

- Add automatic lock on system sleep, screen lock, or app focus loss.
- Support OS-level biometric authentication (Windows Hello).
- Add persistent lockout after repeated cooldown cycles.
- Increase PBKDF2 iteration count as hardware improves.
- Add temporary PIN or one-time recovery code generation.
- Add lock event audit log: record every lock, unlock, failed attempt, PIN change with timestamps.
- Support hardware-bound key storage (TPM on Windows, Secure Enclave on macOS) for PIN hash.
