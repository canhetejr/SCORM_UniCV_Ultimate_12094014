import React from "react";
import { Toast } from "./Toast";
import type { ToastMessage } from "../../hooks/useToast";

export function ToastContainer({ toasts, onRemove }: { toasts: ToastMessage[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      top: "20px",
      right: "20px",
      zIndex: "var(--z-toast)",
      maxWidth: "400px",
      width: "100%"
    }}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          variant={toast.variant}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}
