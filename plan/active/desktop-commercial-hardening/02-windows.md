# Windows Implementation and Verification

Owner: Codex / macOS host
Dependencies: Shared contracts frozen
Working branch: `main`
Starting SHA: `2073ca3b16a8e64b26c1e06932a2db646f80dceb`

## Allowed Files

- `electron/main.cjs`
- `electron/preload.cjs`
- `electron/backup-store.cjs`
- `shared/backup-format.js`
- `src/App.jsx`
- `src/pages/SettingsPage.jsx`
- `src/pages/HomePage.jsx` only if needed for lock or recovery status display
- new `electron/workspace-store.cjs`
- new storage, lock, or persistence helper files under `src/`
- related tests

## Do Not Modify

- `src/payrollLogic.js`
- `src/workspaceOperations.js`
- `src/pages/PayrollPage.jsx`
- `src/pages/AttendancePage.jsx`
- `src/pages/EmployeesPage.jsx`
- unrelated visual redesign files
- final `docs/` state files except temporary evidence notes if absolutely required

## Platform-Specific Functions and Behavior

- Electron main process becomes the canonical Windows workspace source.
- On first desktop run after upgrade, if canonical workspace file is missing, the app may bridge-read old renderer `localStorage` data and migrate it into the file store.
- Workspace writes must be atomic and serialized.
- Workspace read failure must enter a controlled recovery mode, not reset to demo data.
- App lock must support startup lock, manual lock, and relock behavior as defined by final implementation scope.
- PIN rules are fixed to 4-6 numeric digits.
- Settings must allow set, change, enable, and disable PIN lock if the chosen implementation supports each state.
- Manual backup export must support passphrase protection.
- Automatic restore points remain supported and must align with the new workspace source.
- Backup reason constants must be unified across renderer, preload, main, and shared validation.

## Implementation Tasks

- Add an Electron workspace store responsible for `load`, `save`, and storage status.
- Expose a minimal workspace IPC API in preload.
- Add a renderer storage adapter that splits `desktop-file` and `web-localStorage` behavior.
- Route `App.jsx` load, save, restore, and demo reset flows through the new adapter.
- Remove the silent corrupted-data fallback path that overwrites user state with demo workspace.
- Fix the `before-demo-reset` reason mismatch.
- Add PIN set, verify, lock, unlock, and change flows.
- Add passphrase-protected manual backup export and import paths.
- Add or update tests for migration, corruption, save failure, PIN handling, and backup protection.
- Keep refactoring minimal; only extract controller code when necessary to support the storage or lock transition safely.

## Automated Verification

- `npm run check`
- `npm audit --audit-level=high`
- Tests must cover:
- first-run migration from old `localStorage`
- missing workspace file
- corrupted workspace file
- atomic save success path and failure path
- legacy manual backup restore
- protected backup export and import
- PIN setup, wrong PIN, PIN change
- desktop demo reset path with unified backup reason
- save-status UI matching async save results

## Windows Manual Verification

- Verify PIN setup on a real Windows x64 machine, then restart and unlock successfully.
- Upgrade from an installation with existing local data and confirm migration to the canonical workspace file.
- Corrupt the workspace file deliberately and confirm the app enters recovery mode instead of demo reset.
- Perform multiple edits, close the app, reopen it, and verify the latest state persists.
- Export a passphrase-protected backup and restore it successfully with the correct passphrase.
- Attempt restore with a wrong passphrase and confirm failure without polluting the current workspace.
- Close a payroll month, create restore points, restore a backup, and confirm snapshot behavior is preserved.
- Uninstall while preserving data, reinstall, and confirm the expected recovery or migration path remains clear.

## Completion Evidence

- Automated test output.
- Windows real-host screenshots or video.
- Migration path description before and after first-run conversion.
- PIN setup, unlock, and change flow notes.
- Backup passphrase export and restore notes.
- Remaining risk list.

## Deviations and Remaining Risks

- If the first release does not encrypt the canonical workspace file, record that explicitly as a residual risk.
- If forgotten-PIN recovery is still undecided, implementation must avoid promising an unsupported recovery path.
- If relock timing on resume or focus regain is deferred, record it explicitly with a follow-up owner.
