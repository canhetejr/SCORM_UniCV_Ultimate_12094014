import React, { ComponentPropsWithoutRef } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

export type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  disabled,
  onClick,
  title,
  className = "",
  style,
  ...props
}: ButtonProps) {
  const variantClass = variant === "primary" ? "btn-primary"
    : variant === "secondary" ? "btn-secondary"
    : variant === "danger" ? "btn-danger"
    : "btn-ghost";

  const sizeStyle = size === "sm" ? { padding: "8px 12px", fontSize: "13px" } : undefined;

  const c = ["btn", variantClass, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={c}
      disabled={disabled}
      onClick={onClick}
      title={title}
      style={{ ...sizeStyle, ...style }}
      {...props}
    >
      {children}
    </button>
  );
}
