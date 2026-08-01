# Disabled Action Hints Module Description

## Module Name

Disabled-Action-Hints

## Purpose

Explain why an otherwise valid business action is temporarily unavailable, so store operators can distinguish a required precondition from an unresponsive interface.

## Current Implementation

`DisabledActionHint` wraps a disabled Ant Design control in a tooltip-capable element. The wrapper is necessary because disabled controls do not receive pointer events. Pages pass a concrete, action-specific reason and keep the underlying `disabled` rule unchanged.

### Capabilities

- Shows the blocked reason on hover for disabled inventory transfer, procurement, sales, expense, and desktop recovery-point actions.
- Supports inline controls and full-width submit controls through the `block` property.
- Keeps business validation in the page and domain layers; the component only communicates the existing condition.

## Architecture

This is a presentation-only React component with no workspace state, persistence, or domain-rule ownership.

### UI (`src/components/`)

- `DisabledActionHint.jsx`
  - `DisabledActionHint({ disabled, reason, block, children })` returns the control unchanged when enabled and wraps it in an Ant Design `Tooltip` when disabled.
  - `block` preserves the width of full-width submit buttons.

### Integration Points

- `src/pages/InventoryPage.jsx`
  - Explains why a product cannot be transferred to another store.
- `src/pages/ProcurementPage.jsx`
  - Explains missing product or supplier prerequisites before purchase entry.
- `src/pages/SalesPage.jsx`
  - Explains unavailable sales export, cart entry, and sale confirmation.
- `src/pages/ExpensePage.jsx`
  - Explains the required positive amount before expense recording.
- `src/pages/SettingsPage.jsx`
  - Explains desktop-only and busy recovery-point states.

## Current Limitations

- Tooltip content is available on hover/focus and does not replace persistent inline guidance for complex multi-field forms.
- It is not yet applied to every disabled control, especially modal confirmation buttons whose required fields are visible immediately beside the button.

## Future Directions

- Add a page-level summary when multiple required actions are unavailable for the same workflow.
- Support focusable disabled-action affordances for keyboard-only discovery where Ant Design permits it.
