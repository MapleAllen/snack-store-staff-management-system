import { Tooltip } from "antd";

/**
 * Disabled native/Ant Design controls do not emit pointer events, so the tooltip
 * is deliberately attached to a wrapper rather than the control itself.
 */
export function DisabledActionHint({ disabled, reason, block = false, children }) {
  if (!disabled || !reason) return children;
  return (
    <Tooltip title={reason}>
      <span style={{ display: block ? "block" : "inline-flex", width: block ? "100%" : undefined, cursor: "not-allowed" }}>{children}</span>
    </Tooltip>
  );
}
