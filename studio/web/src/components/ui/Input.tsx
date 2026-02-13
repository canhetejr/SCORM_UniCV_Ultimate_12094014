import React from "react";

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
  className = ""
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "password";
  disabled?: boolean;
  className?: string;
}) {
  const baseClass = "input";
  const c = [baseClass, className].filter(Boolean).join(" ");
  return (
    <input
      type={type}
      className={c}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
