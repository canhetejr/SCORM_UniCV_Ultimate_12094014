import React from "react";
import { Card } from "../ui";

type ToolCardProps = {
  title: string;
  description?: string;
};

export function ToolCard({ title, description }: ToolCardProps) {
  return (
    <Card plain className="card-padding">
      <div style={{ fontWeight: 600 }}>{title}</div>
      {description ? (
        <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
          {description}
        </p>
      ) : null}
    </Card>
  );
}
