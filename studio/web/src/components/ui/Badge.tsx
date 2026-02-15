import React from "react";

type Variant = "success" | "warning" | "error" | "info" | "neutral";

export function Badge({
  children,
  variant = "neutral",
  className = ""
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  const variantClass = variant === "success" ? "badge-success"
    : variant === "warning" ? "badge-warning"
    : variant === "error" ? "badge-error"
    : variant === "info" ? "badge-info"
    : "badge-neutral";

  const c = ["badge", variantClass, className].filter(Boolean).join(" ");

  return <span className={c}>{children}</span>;
}
