import React from "react";

type Variant = "success" | "error" | "warning" | "info";

export function Toast({
  message,
  variant = "info",
  onClose
}: {
  message: string;
  variant?: Variant;
  onClose: () => void;
}) {
  const variantClass = variant === "success" ? "toast-success"
    : variant === "error" ? "toast-error"
    : variant === "warning" ? "toast-warning"
    : "toast-info";

  const c = ["toast", variantClass].filter(Boolean).join(" ");

  return (
    <div className={c}>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose} aria-label="Fechar">
        ×
      </button>
    </div>
  );
}
