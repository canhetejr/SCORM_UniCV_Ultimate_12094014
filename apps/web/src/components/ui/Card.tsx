import React from "react";

export function Card({
  children,
  highlight,
  selected,
  plain,
  className = "",
  style
}: {
  children: React.ReactNode;
  highlight?: boolean;
  selected?: boolean;
  plain?: boolean;
  className?: string;
  style?: React.CSSProperties;
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
  return <div className={c} style={style}>{children}</div>;
}
