import React from "react";
import { Card } from "../ui";

type ToolCardProps = {
  title: string;
  description?: string;
  onClick?: () => void;
};

export function ToolCard({ title, description, onClick }: ToolCardProps) {
  return (
    <Card plain className="card-padding" style={onClick ? { cursor: "pointer" } : undefined}>
      <div
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      >
        <div style={{ fontWeight: 600 }}>{title}</div>
        {description ? (
          <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
            {description}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
