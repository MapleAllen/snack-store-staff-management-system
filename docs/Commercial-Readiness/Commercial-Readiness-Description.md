# Commercial-Readiness Module Description

## Module Name

Commercial-Readiness

## Purpose

Commercial-Readiness describes the current state of 门店工资助手 as it relates to becoming a commercial local Windows payroll desktop product. It ties together product scope, release boundaries, data safety, verification, and the functional gaps that remain before a public paid or trusted binary release.

## Current Implementation

The product currently implements a local single-workspace payroll assistant with generic demo data, React/Vite UI, Electron desktop storage, automatic recovery points, optional protected manual backups, and a PIN access barrier. It does not include cloud sync, accounts, multi-user permissions, automatic updates, signed Windows releases, or a public trusted EXE channel.

### Capabilities

**Functional workspace**

- Six linked views exist: Home, Employees, Attendance, Payroll, Reports, and Settings.
- Stores, employees, assignments, salary adjustments, rule history, and monthly records share one local workspace.
- Payroll is owner-first: blockers, next actions, exceptions, and payout confidence are emphasized before formulas.
- Closed payroll uses frozen snapshots and reasoned unlock.
- Resigned employees remain in history but are excluded from active payroll rows by default.

**Data and recovery**

- Desktop workspace file is stored in Electron `userData` as `workspace.json`.
- Corrupt workspace load enters recovery mode instead of silently overwriting with demo data.
- Automatic recovery points are created for daily startup, before restore, after month close, and before demo reset.
- Manual backups can be plaintext or passphrase-protected.

**Desktop security and release boundary**

- Electron renderer runs with Node integration disabled, context isolation enabled, and sandbox enabled.
- Desktop app supports 4-6 digit PIN lock with hashed PIN storage and basic cooldown.
- Current public release boundary remains source-only until a signed Windows channel and repeatable real-device regression process exist.
- Windows is the formal product target; Web mode is development preview and macOS is development/review coordination only.

**Documentation and planning**

- Module-level docs exist under `docs/` for payroll data, logic, workspace operations, storage, backup, desktop security, and product workflows.
- Active release-readiness planning exists under `plan/active/windows-unsigned-release-readiness/`.

## Architecture

Commercial readiness is not a runtime module. It is a documentation and planning layer that references the product's functional and platform modules.

### Current Readiness Inputs

- `README.md`
  - Product overview, release boundary, supported platform statement, and development commands.
- `SECURITY.md`
  - Security support, data boundaries, and known risks.
- `CONTRIBUTING.md`
  - Development workflow and Windows evidence requirements.
- `docs/architecture.md`
  - Runtime shape and module map.
- `docs/data-safety.md`
  - Storage, backup, PIN, and operational safety guidance.
- `plan/active/windows-unsigned-release-readiness/`
  - Active plan for unsigned build readiness and evidence alignment.

## Integration Points

- `docs/Payroll-Management/*`
- `docs/Employee-Management/*`
- `docs/Store-Management/*`
- `docs/Overview-Dashboard/*`
- `docs/Reports-And-Exports/*`
- `docs/Storage-Adapter/*`
- `docs/Backup-System/*`
- `docs/Desktop-Security/*`

## Current Limitations

- No signed Windows channel exists; public binary distribution remains blocked.
- No automatic update mechanism exists.
- Workspace and automatic recovery points are plaintext local files.
- No account system, role permissions, audit server, or multi-user workflow exists.
- No formal commercial employee profile, payroll tax support, payment status, payslip, or accounting integration exists.
- No full release evidence index exists that maps Windows real-device checks to final release SHAs.
- Some business mutations still live in `App.jsx` instead of a tested operation layer.
- Documentation now tracks the roadmap, but implementation remains incremental and local-first.

## Future Directions

- Add signed Windows release channel and real-device regression evidence index.
- Add workspace checksums, multi-instance protection, and optional workspace encryption.
- Add commercial employee profile and lifecycle workflows.
- Add structured payroll exports, audit metadata, and multi-store export packages.
- Add operation-layer audit log and preview/dry-run flows.
- Add release gates that block public binary claims until verification and signing are complete.
