# Settings-Page Module Description

## Purpose

`SettingsPage` manages the payroll workspace's stores, salary rules, backup and recovery controls, application lock, and anonymous operation timeline.

## Current Implementation

- Stores are added, renamed, archived, and restored without deletion.
- Salary rules are adjusted per active store with history.
- JSON backup/restore and desktop recovery points are exposed with clear availability states.
- The timeline shows payroll-related actions only.

## Limitations

- Rules are configured one store at a time.
- Backup files are local and unencrypted unless the backup workflow uses a supplied password.
