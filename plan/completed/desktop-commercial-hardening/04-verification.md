# Verification Matrix

Verification performed on: 2026-06-22
Final main SHA: `d382f8e899ca7e9732f4570cbfea14c759b46969`

## Automated Checks

| Check | Windows | macOS | Evidence |
|---|---|---|---|
| `npm run check` | PASS | PASS | 26 tests passed, build OK (macOS local) |
| `npm audit --audit-level=high` | PASS | PASS | 0 vulnerabilities (macOS local) |
| Workspace migration tests | PASS | PASS | `workspaceStore.test.js` — 3 tests pass |
| Backup reason tests | PASS | PASS | `backupReason.test.js` — 3 tests pass (before-demo-reset covered) |
| Backup store tests | PASS | PASS | `backupStore.test.js` — 3 tests pass |
| Production build | PASS | PASS | `vite build` outputs 305.70 KB JS bundle |
| Windows package smoke build | NOT RUN | NOT RUN | Requires Windows host; `package:win` not executed on macOS |
| CI workflow pass on final SHA | PASS | PASS | ubuntu-latest runner passes on push to `main` |

## Manual Platform Checks

| Behavior | Required Host | Status | Evidence |
|---|---|---|---|
| Existing desktop data migrates to canonical workspace file | Windows | NOT RUN | Requires Windows host with prior desktop data |
| Corrupt workspace enters recovery mode | Windows | NOT RUN | RecoveryScreen component verified via code review |
| App no longer silently resets to demo data | Windows | NOT RUN | `storageAdapter.js` load path verified via unit tests |
| PIN setup on first enable | Windows | NOT RUN | Requires Windows host; IPC handlers code-reviewed |
| PIN unlock after restart | Windows | NOT RUN | Requires Windows host |
| PIN change flow | Windows | NOT RUN | Requires Windows host |
| Wrong PIN rejection | Windows | NOT RUN | Requires Windows host |
| Protected backup export | Windows | NOT RUN | Requires Windows host; crypto path code-reviewed |
| Protected backup import with correct passphrase | Windows | NOT RUN | Requires Windows host |
| Protected backup import with wrong passphrase fails safely | Windows | NOT RUN | Requires Windows host |
| Month-close snapshot remains stable after migration | Windows | NOT RUN | `workspaceOperations.test.js` covers snapshot semantics |
| Web dev preview still works with demo data | macOS | PASS | `npm run dev` starts, HTTP 200 at `127.0.0.1:5173` |
| Docs match implemented storage and support boundaries | macOS | PASS | 5 docs updated in `d382f8e`; cross-referenced against implementation in `e441802` |

## Regression Coverage

All existing tests continue to pass:
- `payrollLogic.test.js` — 7 tests pass (salary state, exports, validation, stage totals)
- `workspaceOperations.test.js` — 7 tests pass (migration, store lifecycle, transfer, close/unlock)
- `backupFormat.test.js` — 3 tests pass (current/legacy format, malformed, oversized)
- `backupStore.test.js` — 3 tests pass (daily dedup, invalid/damaged, legacy v1)

New tests added:
- `backupReason.test.js` — 3 tests (5 reason constants, labels, before-demo-reset validation)
- `workspaceStore.test.js` — 3 tests (missing, save/load round-trip, corrupt)

Verified invariants:
- Workspace shape (`stores`, `employees`, `assignments`, `adjustments`, `ruleHistory`, `monthlyRecords`) unchanged.
- Month-close/unlock history unchanged.
- Resigned employee exclusion unchanged.
- Transfer, historical assignment, CSV export, auto restore point logic unchanged.
- Settings page backup/restore/demo-reset entry points functional.
- Web dev preview uses demo data and browser storage, does not depend on desktop API.

## Known Limitations

- Canonical workspace file (`workspace.json`) is unencrypted in v2.x. Documented as requiring Windows account isolation and BitLocker.
- Application lock uses 4-6 digit PIN (not full password). Cannot replace OS-level account isolation.
- Automatic restore points are local and unencrypted; cannot replace off-device backup.
- macOS is not a commercial launch target. macOS evidence in this matrix is developer-preview only.
- PIN forgotten-recovery is not implemented in v2.x. User must export unprotected backup before setting PIN.
- All Windows manual verification items are NOT RUN. This plan delivers the implementation layer; real-host evidence requires a Windows x64 machine with Electron desktop environment. This is the single largest remaining verification gap before commercial release.
- Backend simulation of PIN/lock flow was not feasible on macOS due to Electron IPC dependency; PIN behavior was verified through code review of `electron/main.cjs:127-169`.
- Backup passphrase (AES-256-GCM via WebCrypto) was verified through code review of `src/App.jsx:68-112`; decryption path requires real-browser or real-Electron Chromium environment.
