# Verification Matrix

Verification target SHA: PENDING
Evidence owner: Windows host + Codex

## Automated Checks

| Check | Windows | macOS | Evidence |
|---|---|---|---|
| `npm run check` | NOT RUN | NOT RUN | |
| `npm audit --audit-level=high` | NOT RUN | NOT RUN | |
| Ubuntu CI build/test/audit | NOT RUN | NOT RUN | |
| macOS CI build/test | NOT RUN | NOT RUN | |
| Windows CI build/test | NOT RUN | NOT RUN | |
| Windows unsigned dir build (`package:win`) | NOT RUN | NOT RUN | |
| Windows unsigned installer build (`dist:win`) | NOT RUN | NOT RUN | |
| Artifact manifest / hashes generated | NOT RUN | NOT RUN | |

## Manual Platform Checks

| Behavior | Required Host | Status | Evidence |
|---|---|---|---|
| Existing desktop data migrates to canonical workspace file | Windows | EXTERNAL PASS - RECORD PENDING | attach prior evidence SHA, environment, screenshots/video |
| Corrupt workspace enters recovery mode instead of demo reset | Windows | EXTERNAL PASS - RECORD PENDING | attach prior evidence |
| App no longer silently resets to demo data | Windows | EXTERNAL PASS - RECORD PENDING | attach prior evidence |
| PIN setup, restart unlock, change flow, wrong PIN rejection, cooldown | Windows | EXTERNAL PASS - RECORD PENDING | attach prior evidence |
| Protected backup export/import with correct and wrong passphrase | Windows | EXTERNAL PASS - RECORD PENDING | attach prior evidence |
| Payroll close snapshot remains stable after restore/migration | Windows | EXTERNAL PASS - RECORD PENDING | attach prior evidence |
| Install, upgrade, uninstall, preserve-data reinstall path | Windows | EXTERNAL PASS - RECORD PENDING | attach prior evidence or rerun if installer behavior changed |
| Unsigned installer launches successfully after CI packaging changes | Windows | NOT RUN | rerun only if `02-windows` affects installer/package behavior |
| Web dev preview still works and remains development-only | macOS | NOT RUN | local preview notes |
| Docs match verified Windows behavior and unsigned release boundary | macOS | NOT RUN | doc review notes |

## Regression Coverage

- Carry-forward of existing Windows real-host evidence is allowed only under the file-change rules frozen in `01-shared-contracts.md`.
- If post-verification commits touch runtime storage, lock, backup, recovery, migration, or installer behavior files, rerun the affected Windows checks and replace `EXTERNAL PASS - RECORD PENDING` with new evidence.
- Version-only, docs-only, plan-only, CI-only, and non-runtime helper-script changes may reuse prior interactive evidence if the rationale is recorded explicitly.

## Known Limitations

- Public releases remain source-only until a signed Windows channel exists.
- Any unsigned Windows installer may trigger SmartScreen or reputation warnings.
- CI can prove build/test/package success, not interactive desktop correctness.
- Canonical workspace file remains unencrypted in `2.x` and relies on Windows account isolation plus disk encryption.
- PIN forgotten-recovery is still not implemented.
- Automatic restore points remain local plaintext JSON and do not replace off-device backup.
