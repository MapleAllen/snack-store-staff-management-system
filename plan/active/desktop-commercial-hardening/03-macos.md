# macOS Coordination, Review Support, and Documentation Preparation

Owner: TBD
Dependencies: Shared contracts frozen; Windows implementation reviewed at least once
Working branch: `main`
Starting SHA: RESOLVE AND RECORD BEFORE SOURCE EDITS

## Allowed Files

- `README.md`
- `docs/architecture.md`
- `docs/data-safety.md`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `.github/workflows/ci.yml`
- `plan/active/desktop-commercial-hardening/*.md`
- new release or support docs under `docs/` if needed

## Do Not Modify

- `electron/*`
- `shared/*`
- `src/payrollLogic.js`
- `src/workspaceOperations.js`
- Windows implementation files that are not explicitly assigned to this task lock

## Platform-Specific Functions and Behavior

- macOS is not a commercial launch target for this plan.
- The macOS host acts as coordinator, reviewer, documentation updater, CI maintainer, and development-preview validator.
- macOS results must never be used as evidence for Windows product behavior.
- macOS may validate that Web development preview still works with browser storage and demo data.

## Implementation Tasks

- Update public docs so they reflect the implemented desktop storage, lock, backup, and support boundaries.
- Make the Windows-first commercial scope explicit and remove any misleading implication of cross-platform desktop commercial support.
- Update `README.md`, `SECURITY.md`, and `docs/data-safety.md` to cover:
- desktop canonical workspace file storage
- app lock using a 4-6 digit PIN
- passphrase-protected manual backups
- Web as development preview only
- continued dependence on Windows account isolation and BitLocker if workspace files remain unencrypted
- Update `CONTRIBUTING.md` and verification docs to require Windows real-host evidence for desktop behavior claims.
- Evaluate whether CI should expand to Windows and macOS runners.
- If CI expands, document it as build and test signal only, not interactive desktop proof.
- Record remaining risks and deferred decisions for later archiving under `plan/completed/`.

## Automated Verification

- `npm run check`
- `npm audit --audit-level=high`
- Validate any CI workflow edits for syntax and matrix logic

## macOS Manual Verification

- Run the local development preview and confirm Web development mode still loads and saves demo workspace data.
- Verify docs match the actual support boundary and do not overclaim Windows product verification.
- Verify CI language does not imply that CI success equals real-host desktop validation.

## Completion Evidence

- Updated document diff summary.
- macOS development-preview run notes or screenshot.
- CI or release-process update summary.
- Explicit list of behaviors that still require Windows real-host proof.

## Deviations and Remaining Risks

- If CI is not expanded to Windows runners during this phase, record it as a release-readiness gap.
- If docs still state only plaintext localStorage after the desktop file migration lands, treat that as a blocking inconsistency.
- If the Web preview and desktop storage boundaries remain ambiguous, do not close this task.
