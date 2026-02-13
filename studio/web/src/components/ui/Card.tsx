import React from "react";

export function Card({
  children,
  highlight,
  selected,
  plain,
  className = ""
}: {
  children: React.ReactNode;
  highlight?: boolean;
  selected?: boolean;
  plain?: boolean;
  className?: string;
}) {
  const c = [
    "card",
    !plain && "vitrine-card",
    highlight ? "card-highlight" : "",
    selected ? "card-selected" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");
  return <div className={c}>{children}</div>;
}
