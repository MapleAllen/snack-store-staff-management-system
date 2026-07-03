# Desktop-Security Plan

## Objective

Provide honest, practical desktop access protection for a local single-user payroll app. The target end state is a Windows-first security model with clear boundaries, reliable lock behavior, tested IPC isolation, recoverable credentials, and no misleading claim that an app PIN replaces operating-system security or encrypted storage.

## Design Principles

- PIN lock is defense-in-depth, not data-at-rest encryption.
- PIN hashing and verification stay in the Electron main process.
- The renderer never receives PIN hashes, salts, derived keys, or filesystem access.
- Users must understand lost-PIN consequences before enabling protection.
- Brute-force resistance must survive realistic user behavior, including restarts in future phases.
- Security UI must be explicit about what is protected and what remains plaintext.
- Do not add cloud-based recovery, sync, or remote wipe without a product decision.

## Phase 1: Basic PIN Lock and Electron Hardening — DONE

Status: **Done**

Goals:

- Add a main-process PIN barrier and harden Electron renderer boundaries.

Completed work:

- Electron uses `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
- Navigation, new-window, and permission requests are restricted.
- PIN format is limited to 4-6 numeric digits.
- PINs are stored as PBKDF2 hashes with random salt in `lock.json`.
- Startup lock gate, unlock UI, PIN set/change/clear, and manual lock controls exist.
- Basic brute-force cooldown exists: five failed attempts then 30 seconds.

## Phase 2: Session Lock State and Auto-Lock — NOT STARTED

Status: **Not Started**

Goals:

- Make lock behavior reliable across manual lock, idle, sleep, and app focus transitions.

Remaining features:

- Add explicit main-process session lock state separate from `pinSet`.
- Make `lock:status` distinguish `locked` and `pinSet` accurately.
- Add configurable idle auto-lock timeout.
- Lock on system sleep/resume when PIN is set.
- Add optional lock on minimize or focus loss.
- Add tests for startup lock, manual lock, unlock, and status transitions.

## Phase 3: PIN Recovery — NOT STARTED

Status: **Not Started**

Goals:

- Provide a recovery path without creating a backdoor.

Remaining features:

- Generate a one-time recovery code when setting PIN.
- Show recovery code once and store only its hash.
- Add recovery flow that clears PIN after correct recovery code.
- Add setup warning to export a backup before enabling PIN.
- Document lost-PIN behavior in Settings, `SECURITY.md`, and `docs/data-safety.md`.

## Phase 4: Persistent Brute-Force Protection and Audit — NOT STARTED

Status: **Not Started**

Goals:

- Make repeated guessing harder and auditable across app restarts.

Remaining features:

- Persist failed-attempt count and cooldown expiry.
- Add escalating cooldowns after repeated lockout cycles.
- Add lock event log for set PIN, change PIN, clear PIN, lock, unlock, failed unlock, and cooldown.
- Add settings panel summary for recent lock events without exposing secrets.
- Add tests for restart-persistent cooldown behavior.

## Phase 5: OS-Level Authentication — NOT STARTED

Status: **Not Started**

Goals:

- Offer stronger local authentication where the platform supports it.

Remaining features:

- Research Windows Hello integration options for Electron.
- Define fallback behavior when biometric authentication is unavailable.
- Decide whether biometric auth replaces PIN or acts as an additional unlock method.
- Add Windows real-device validation before documenting support.

## Phase 6: Security Testing — NOT STARTED

Status: **Not Started**

Goals:

- Add automated and manual checks for lock and Electron security behavior.

Remaining features:

- Add IPC handler tests for PIN set, change, clear, unlock, wrong PIN, and cooldown.
- Add tests that salt changes after PIN reset.
- Add tests for corrupt `lock.json` behavior.
- Add manual Windows checks for startup lock, restart unlock, wrong PIN cooldown, and PIN clear.
- Add regression checks that renderer cannot access Node filesystem APIs.

## Implementation Rules

- Do not log PINs, hashes, salts, recovery codes, or derived keys.
- Do not claim the PIN encrypts workspace data.
- Do not allow PIN bypass without correct PIN, valid recovery code, or explicit data reset/recovery workflow.
- Do not add cloud recovery or remote credential storage.
- Do not weaken Electron isolation settings to implement security features.
- Do not enable Windows Hello claims without real-device validation.

## Open Questions

- Should auto-lock be enabled by default for commercial users?
- Should recovery code generation be mandatory when setting a PIN?
- Should clearing PIN immediately unlock the current session or return to the workspace without showing `LockScreen`?
- Should lock event logs live inside the workspace, next to `lock.json`, or in a separate security log file?
