# Verification Matrix

Verification target SHA: PENDING
Evidence owner: UNASSIGNED
Status: NOT STARTED

## Goal

建立商业化阶段的统一验证矩阵，确保代码、文档、桌面行为、备份恢复、导出和发布边界都能映射到可审计证据。

## Automated Checks

| Check | Required When | Status | Evidence |
|---|---|---|---|
| `npm run check` | Every phase | NOT RUN | |
| `npm audit --audit-level=high` | Dependency or release work | NOT RUN | |
| Payroll logic tests | Payroll formula/export changes | NOT RUN | |
| Workspace operation tests | Employee/store operation changes | NOT RUN | |
| Backup/storage tests | Backup, storage, recovery, checksum changes | NOT RUN | |
| Windows CI build/test | Release workflow changes | NOT RUN | |
| Windows package/sign checks | Signed release phase | NOT RUN | |

## Manual Checks

| Behavior | Required Host | Status | Evidence |
|---|---|---|---|
| Payroll entry edits clear confirmation | Web preview / Windows | NOT RUN | |
| Store-month close freezes snapshot | Web preview / Windows | NOT RUN | |
| Unlock requires reason and reopens month | Web preview / Windows | NOT RUN | |
| Resigned employees excluded from active payroll and reports | Web preview / Windows | NOT RUN | |
| Backup export/import protected and plaintext | Windows | NOT RUN | |
| Corrupt workspace enters recovery mode | Windows | NOT RUN | |
| PIN startup lock, wrong PIN, cooldown, clear/change | Windows | NOT RUN | |
| Multi-instance protection | Windows | NOT RUN | future phase |
| Signed installer install/upgrade/uninstall/reinstall | Windows | NOT RUN | future phase |
| CSV opens correctly with Chinese labels in Excel | Windows | NOT RUN | future phase |

## Documentation Checks

- `docs/` reflects implemented current state after each phase.
- `plan/` records remaining work and does not describe unfinished features as complete.
- `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, and `CHANGELOG.md` are updated before release candidates.
- Public release text remains source-only until signed channel exists.

## Evidence Rules

- Every Windows real-device run records date, OS version, app version, commit SHA, tester, and outcome.
- Screenshots or logs must not include real employee, store, payroll, PIN, or backup data.
- CI success is not a substitute for interactive desktop behavior evidence.
- Docs-only work may use automated checks and diff review without Windows rerun unless it changes release claims.

## Remaining Risks

- Current route to commercial release depends on decisions not yet made: signing, encryption, recovery, and payroll scope.
- Some future checks require Windows hardware and cannot be completed on macOS.
- Verification matrix should be updated after each implementation phase rather than only at final release.
