# Desktop Security and Release

## Ownership

Owner: UNASSIGNED
Dependencies: Data shape and core payroll workflow stable
Working branch: `main`
Status: NOT STARTED

## Goal

补齐本地数据安全、桌面锁定、恢复可靠性和 Windows 发布通道，为可信商业 Windows 桌面发布建立技术和证据基础。

## Allowed Files

- `electron/**`
- `src/storageAdapter.js`
- `src/App.jsx`
- `src/components/LockScreen.jsx`
- `src/components/RecoveryScreen.jsx`
- `src/pages/SettingsPage.jsx`
- `shared/backup-format.js`
- `src/*backup*.test.js`
- `src/workspaceStore.test.js`
- `.github/**`
- `scripts/**`
- `package.json`
- Related docs under `docs/Storage-Adapter/`, `docs/Backup-System/`, `docs/Desktop-Security/`, `docs/data-safety.md`

## Do Not Modify Without Re-Planning

- Payroll formulas or employee/store business rules unrelated to data safety.
- Public release docs claiming signed availability before signing exists.

## Subgoals

- Add workspace and backup checksum validation.
- Add write-ahead journal or last-known-good recovery path.
- Add multi-instance protection.
- Add optional workspace encryption after credential recovery policy is defined.
- Add explicit main-process session lock state and auto-lock.
- Add PIN recovery code and persistent brute-force protection.
- Establish signed Windows build strategy and artifact manifest pipeline.

## Acceptance Criteria

- Corrupt workspace and corrupt backup states are detectable and user-visible.
- A second app instance cannot silently overwrite the workspace.
- PIN status distinguishes `pinSet` from current `locked` session state.
- Lost-PIN behavior is documented before recovery code or encryption ships.
- Signed Windows release plan exists before any public binary claim.
- Windows real-device evidence covers install, upgrade, restore, PIN, migration, uninstall, and reinstall paths.

## Verification

- `npm run check`
- `npm audit --audit-level=high`
- Desktop storage and backup tests.
- Windows real-device regression for any Electron, storage, backup, PIN, installer, or signing change.
- GitHub Actions checks when CI/package workflow changes.

## Open Questions

- Should workspace encryption be required for commercial release or remain optional?
- Who owns code signing credentials and release approval?
- Should auto-update be excluded indefinitely or planned after signed channel exists?
- Should automatic recovery points be encrypted when workspace encryption is enabled?
