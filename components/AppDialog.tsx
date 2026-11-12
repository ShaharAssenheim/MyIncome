"use client";
import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function AppDialog({
  title,
  description,
  onClose,
  busy = false,
  wide = false,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [animate] = useState(
    () =>
      typeof document !== "undefined" &&
      !document.activeElement?.matches(":focus-visible"),
  );
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(
    <dialog
      ref={dialog}
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={`ui-dialog ${wide ? "ui-dialog--wide" : ""} ${animate ? "ui-dialog--animated" : ""}`}
    >
      <div className="ui-dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          aria-label="סגירה"
          disabled={busy}
          onClick={() => dialog.current?.close()}
          className="ui-icon-btn -my-2 -ml-2"
        >
          <X size={19} />
        </button>
      </div>
      <div className="ui-dialog-body">
        {description && (
          <p id={descriptionId} className="ui-dialog-description">
            {description}
          </p>
        )}
        {children}
      </div>
    </dialog>,
    document.body,
  );
}
