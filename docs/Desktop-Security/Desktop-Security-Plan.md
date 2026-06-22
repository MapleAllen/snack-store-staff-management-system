# Desktop-Security - Plan

## Objective

Provide meaningful application-level access protection for a local single-user payroll desktop application, where PIN lock offers a practical barrier against casual unauthorized access while the architecture remains transparent about what it can and cannot protect.

## Design Principles

- **Defense in depth, not a single wall**: PIN lock is one layer; it depends on OS account isolation, disk encryption, and physical security.
- **Honest about boundaries**: Documentation and UI must never imply that a 4-6 digit PIN replaces OS-level security.
- **No irreversible lockout**: Users must always have a path to recover their data, even if PIN access is lost (currently via unencrypted backup export before PIN set).
- **Crypto in main process**: PIN hash derivation and verification happen in the Electron main process via Node.js crypto, not in the renderer.
- **Minimal IPC surface**: Lock-related IPC only exposes verify/set/clear/status, never the raw hash or salt.
- **Brute-force resistance matters**: Even a 4-digit PIN must be practically resistant to rapid guessing.

## Phases

### Phase 1: Basic PIN Lock — DONE

Completed work:
- PIN set with 4-6 digit format validation: `main.cjs:133-149`.
- PBKDF2 hash storage with random salt: `main.cjs:48-52`.
- Lock/unlock flow with LockScreen UI: `LockScreen.jsx`.
- PIN change requiring old PIN verification: `main.cjs:137-141`.
- PIN clear requiring current PIN: `main.cjs:176-187`.
- Brute-force protection: 5 attempts, 30-second cooldown: `main.cjs:153-168`.
- IPC handlers: `lock:status`, `lock:set-pin`, `lock:unlock`, `lock:lock`, `lock:clear-pin`.

### Phase 2: Auto-Lock on Idle and Sleep — NOT STARTED

Goal: Automatically engage PIN lock when the user steps away or the system sleeps.

Tasks:
- Add idle timeout: lock after N minutes of no user interaction.
- Detect system sleep/resume and engage lock on resume if PIN is set.
- Detect app focus loss and optionally lock.
- Add user-configurable auto-lock timeout in Settings.
- Add "lock on minimize" option.
- Gracefully handle the case where auto-lock triggers during an active save operation.

### Phase 3: PIN Recovery Mechanism — NOT STARTED

Goal: Provide a documented, safe recovery path for forgotten PINs without creating a backdoor.

Tasks:
- Add recovery code generation: on PIN set, generate a one-time 8+ character recovery code.
- Recovery code is shown once during setup and never stored in plaintext.
- Add recovery flow: enter recovery code → PIN is cleared → user sets a new PIN.
- Store recovery code hash (not the code itself) for verification.
- Document that the recovery code must be stored securely offline.
- Add warning during PIN setup: remind user to export an unencrypted backup.

### Phase 4: Persistent Brute-Force Protection — NOT STARTED

Goal: Prevent brute-force attacks that span application restarts.

Tasks:
- Persist `failedAttempts` and `cooldownUntil` to a file so they survive app restart.
- Implement escalating cooldowns: 30s → 5min → 30min → 1hr after successive cooldown cycles.
- Add lock event logging: record timestamp, IP, and result of every unlock attempt.
- Surface lock event history in a security settings panel.

### Phase 5: OS-Level Authentication Integration — NOT STARTED

Goal: Offer stronger authentication options for platforms that support it.

Tasks:
- Add Windows Hello integration as an alternative to PIN on Windows.
- Add Touch ID integration as an alternative to PIN on macOS.
- Fall back to PIN when biometric hardware is unavailable.
- Support requiring both PIN and biometric for high-security mode.

### Phase 6: Security Testing and Audit — NOT STARTED

Goal: Validate the security implementation against common attack vectors.

Tasks:
- Test PIN hash storage: verify salt is unique per PIN set, hash is not reversible.
- Test IPC isolation: verify renderer cannot access Node crypto or filesystem.
- Test brute-force timing: verify cooldown is enforced even across IPC channel calls.
- Test PIN change flow: verify old PIN required, new hash replaces old.
- Test PIN clear flow: verify lock.json is removed or overwritten.
- Test that lock.json changes on disk do not crash the app (tamper detection).
- Add automated security regression tests for PIN IPC handlers.

## Implementation Rules

- Do not log or surface the PIN, PIN hash, or salt in any UI, error message, or console output.
- Do not store the PIN in plaintext anywhere — not in memory, not on disk, not in logs.
- Do not allow bypassing the PIN lock without either the correct PIN, the recovery code, or a full data reset.
- Do not remove or weaken the brute-force cooldown without a compensating control.
- Do not add cloud-based PIN storage, sync, or recovery.
- Do not claim that PIN replaces OS-level account isolation or disk encryption.

## Open Questions

- Should auto-lock be enabled by default, or opt-in?
- Should recovery code generation be mandatory on PIN set, or optional?
- Should lock events (successful unlocks, failed attempts) be viewable in-app, or only via file inspection?
- Should escalating cooldowns reset after a configurable period of no failed attempts?
- Should integrated biometric auth require PIN as a fallback, or replace it entirely?
