import { useState, useCallback } from "react";

export type ToastMessage = {
  id: string;
  message: string;
  variant: "success" | "error" | "warning" | "info";
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const show = useCallback((message: string, variant: ToastMessage["variant"] = "info") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
    
    // Auto-remove após 4 segundos
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message: string) => show(message, "success"), [show]);
  const error = useCallback((message: string) => show(message, "error"), [show]);
  const warning = useCallback((message: string) => show(message, "warning"), [show]);
  const info = useCallback((message: string) => show(message, "info"), [show]);

  return { toasts, show, remove, success, error, warning, info };
}
