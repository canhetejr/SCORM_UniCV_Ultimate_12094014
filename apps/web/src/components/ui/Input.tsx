import React, { ComponentPropsWithoutRef } from "react";

export type InputProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "value" | "onChange"
> & {
  value: string;
  onChange: (v: string) => void;
};

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
  className = "",
  ...props
}: InputProps) {
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
      {...props}
    />
  );
}
