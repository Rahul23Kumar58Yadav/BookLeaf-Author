import { useEffect, useId, useRef } from "react";
import { Icon } from "./Icon";
import { Button } from "./Button";
import "./Modal.css";

/**
 * Built on the native <dialog>: gives us a focus trap, top-layer stacking,
 * Escape handling and inert background for free, with no portal or focus-trap library.
 */
export function Modal({ open, onClose, title, children, footer }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  // Backdrop clicks target the <dialog> itself; clicks inside land on children
  const onBackdrop = (e) => { if (e.target === ref.current) onClose(); };

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onClose={onClose}          // fires on Escape and dlg.close()
      onClick={onBackdrop}
    >
      <header className="modal__head">
        <h2 id={titleId}>{title}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog">
          <Icon name="close" />
        </Button>
      </header>
      <div className="modal__body">{children}</div>
      {footer && <footer className="modal__foot">{footer}</footer>}
    </dialog>
  );
}