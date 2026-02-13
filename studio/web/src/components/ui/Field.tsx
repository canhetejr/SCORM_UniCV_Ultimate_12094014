import React from "react";

export function Field({
  label,
  children,
  hint,
  className = ""
}: {
  label?: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  const c = ["field", className].filter(Boolean).join(" ");
  return (
    <div className={c}>
      {label && <label className="field-label">{label}</label>}
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}
