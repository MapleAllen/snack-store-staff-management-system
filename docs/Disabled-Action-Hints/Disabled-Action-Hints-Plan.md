# Disabled Action Hints Plan

## Objective

Make every important blocked workflow self-explanatory without weakening payroll, inventory, or daily-close safeguards. Operators should be able to identify the missing prerequisite from the page where they attempted the action.

## Design Principles

- Preserve the domain and page-level `disabled` condition exactly.
- State the missing prerequisite and the next valid action in plain Chinese.
- Attach tooltips to a wrapper, never rely on a disabled control to receive pointer events.
- Keep explanations free of employee personal information and free-text history.
- Do not use a tooltip as the only explanation when a form already has a suitable inline validation location.

## Phase 1: Core Operational Feedback — DONE

Status: **Done**

Goals:

- Cover the most common disabled primary actions in daily store operations.

Completed work:

- Added `src/components/DisabledActionHint.jsx` with inline and full-width support.
- Applied concrete prerequisite messages to inventory transfer, procurement entry, sales entry/export/confirmation, expense recording, and local recovery-point creation.

## Phase 2: Broader Form Coverage — NOT STARTED

Status: **Not Started**

Goals:

- Cover remaining high-frequency disabled controls without adding redundant text.

Remaining features:

- Audit day-close, refund, return, and payroll modal confirmation states for the clearest nearby explanation.
- Add keyboard-accessibility verification for every tooltip-wrapped disabled action.

## Implementation Rules

- Do not enable an action merely to expose its validation error.
- Do not duplicate sensitive values, employee identifiers, or free-text notes in tooltip content.
- Do not move domain validation into the UI hint component.

## Open Questions

- Which remaining modal confirmations benefit from tooltips versus inline field-level validation?
