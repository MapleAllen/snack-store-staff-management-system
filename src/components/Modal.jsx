import { useEffect, useId, useRef } from "react";

export function Modal({ title, children, onClose }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement;
    const panel = panelRef.current;
    const focusableSelector = "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])";
    const initialFocus = panel?.querySelector("[autofocus]") ?? panel?.querySelector(focusableSelector);
    initialFocus?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll(focusableSelector)];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, []);

  return (
    <div className="modal-shell">
      <div className="modal-panel" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-panel__header">
          <h3 id={titleId}>{title}</h3>
          <button className="ghost-button" type="button" onClick={onClose}>关闭</button>
        </div>
        {children}
      </div>
    </div>
  );
}
