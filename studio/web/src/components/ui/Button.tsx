import React from "react";

type Variant = "primary" | "secondary" | "danger";

export function Button({
  children,
  variant = "primary",
  type = "button",
  disabled,
  onClick,
  title,
  className = ""
}: {
  children: React.ReactNode;
  variant?: Variant;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
  className?: string;
}) {
  const c = ["btn", variant === "secondary" && "secondary", variant === "danger" && "danger", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={c} disabled={disabled} onClick={onClick} title={title}>
      {children}
    </button>
  );
}
