import React from "react";
import { Link } from "react-router-dom";
import type { Vitrine } from "../../types/vitrine";
import { Button } from "../ui";

interface VitrineCardProps {
  vitrine: Vitrine;
  selected?: boolean;
  onSelect?: () => void;
  onDuplicate?: () => void;
  duplicating?: boolean;
}

export function VitrineCard({ vitrine, selected, onSelect, onDuplicate, duplicating }: VitrineCardProps) {
  return (
    <div className={`card vitrine-card card-padding ${selected ? "selected" : ""}`}>
      <div className="flex flex-between gap-md items-center">
        <div>
          <div>
            <Link to={`/vitrines/${vitrine.id}`} style={{ fontWeight: 600, textDecoration: "none", color: "inherit" }}>
              {vitrine.title}
            </Link>
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            <code>{vitrine.id}</code>
            {typeof vitrine.videoCount === "number" && (
              <span> · {vitrine.videoCount} vídeo{vitrine.videoCount !== 1 ? "s" : ""}</span>
            )}
            {vitrine.account ? ` · ${vitrine.account.name}` : ""}
          </div>
        </div>
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link to={`/vitrines/${vitrine.id}`} className="btn secondary" style={{ textDecoration: "none" }}>
            Ver detalhes
          </Link>
          {onDuplicate && (
            <Button variant="secondary" onClick={onDuplicate} disabled={duplicating}>
              {duplicating ? "A duplicar…" : "Duplicar"}
            </Button>
          )}
          {onSelect && (
            <Button variant="secondary" onClick={onSelect}>
              Selecionar
            </Button>
          )}
        </span>
      </div>
    </div>
  );
}
