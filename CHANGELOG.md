# Changelog

## Unreleased

- Replaced anonymous member codes with real employee profiles: name, phone, employee number, role, and hire date, with editable profiles and audited changes.
- Added a desktop startup check against GitHub Releases that prompts the user to download the installer when a newer version exists; no silent install and no business data leaves the machine.
- Fixed the per-employee confirmation path so an unconfirmed row can be confirmed from payroll instead of disabling its own action.
- Grouped owner dashboard blockers by store and corrected confirmation denominators.
- Restored responsive drawer navigation and mobile card layouts while preserving the desktop payroll split workspace.
- Added post-close payout batches, per-employee payment and payslip delivery status, and printable anonymized payslips.
- Added CSV manifest sidecars with payroll metadata and SHA-256 artifact checksums.

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
