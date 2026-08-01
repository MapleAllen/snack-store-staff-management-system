# Changelog

## 2.1.0 - 2026-08-02

- Added canonical desktop workspace storage, automatic recovery points, PIN access protection, and optional passphrase-protected backups.
- Added a desktop startup check against GitHub Releases that can prompt for a newer installer without silent installation or uploading business data.
- Added payroll calculation traces, formula metadata, structured salary adjustments, and all-store close-readiness summaries.
- Added post-close payout batches, per-employee payment and payslip delivery status, and printable payslips.
- Added CSV manifest sidecars with payroll metadata and SHA-256 artifact checksums.
- Added editable employee profiles with names, phone numbers, employee numbers, roles, hire dates, history, resignation, and month-based store transfers.
- Rebuilt the desktop-first workspace with Ant Design, owner-focused blockers and next actions, responsive navigation, and mobile card layouts.
- Fixed the per-employee confirmation path, dashboard denominators, report totals, restored PIN/backup controls, and cryptographically secure ID generation.
- Updated Electron and frontend dependencies and restored a clean high-severity dependency audit.
- Public distribution remains source-only because no signed Windows release channel exists.

## 2.0.0 - 2026-06-21

- Established a clean public-source baseline under the MIT License.
- Replaced organization-specific branding, locations, people, and imagery with generic demonstration content.
- Added backward-compatible import for legacy v1 backup files.
- Hardened backup validation, CSV export, Electron navigation, permissions, and packaging boundaries.
- Removed public binary distribution until signed Windows releases and real-device verification are available.

## 1.4.0

- Made per-employee completion confirmation a primary payroll action.
- Added explicit payroll-close blockers and conclusion-first employee review.
- Reworked the overview into an owner-focused monthly task dashboard.

## 1.2.0

- Separated estimated, confirmed, and closed payroll totals.
- Added salary-pending validation, frozen close snapshots, and automatic local recovery points.
- Marked open-month exports as drafts.

## 1.1.0

- Added store lifecycle management, month-based employee transfers, payroll close, and reasoned unlock history.
