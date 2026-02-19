import React, { useCallback, useEffect, useState } from "react";
import { Button, Input, Field } from "../ui";

export type VitrinesFilters = {
  q: string;
  status: "" | "ACTIVE" | "INACTIVE";
  dateFrom: string;
  dateTo: string;
  minVideos: string;
  maxVideos: string;
  sort: "createdAt_desc" | "createdAt_asc" | "title_asc";
};

const SORT_OPTIONS: { value: VitrinesFilters["sort"]; label: string }[] = [
  { value: "createdAt_desc", label: "Data (mais recente)" },
  { value: "createdAt_asc", label: "Data (mais antiga)" },
  { value: "title_asc", label: "Nome (A–Z)" }
];

const DEBOUNCE_MS = 300;

export const defaultFilters: VitrinesFilters = {
  q: "",
  status: "",
  dateFrom: "",
  dateTo: "",
  minVideos: "",
  maxVideos: "",
  sort: "createdAt_desc"
};

export function parseFiltersFromSearchParams(search: URLSearchParams): VitrinesFilters {
  return {
    q: search.get("q") ?? defaultFilters.q,
    status: (search.get("status") as VitrinesFilters["status"]) ?? defaultFilters.status,
    dateFrom: search.get("dateFrom") ?? defaultFilters.dateFrom,
    dateTo: search.get("dateTo") ?? defaultFilters.dateTo,
    minVideos: search.get("minVideos") ?? defaultFilters.minVideos,
    maxVideos: search.get("maxVideos") ?? defaultFilters.maxVideos,
    sort: (search.get("sort") as VitrinesFilters["sort"]) ?? defaultFilters.sort
  };
}

export function filtersToSearchParams(f: VitrinesFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.status) p.set("status", f.status);
  if (f.dateFrom) p.set("dateFrom", f.dateFrom);
  if (f.dateTo) p.set("dateTo", f.dateTo);
  if (f.minVideos) p.set("minVideos", f.minVideos);
  if (f.maxVideos) p.set("maxVideos", f.maxVideos);
  if (f.sort && f.sort !== defaultFilters.sort) p.set("sort", f.sort);
  return p;
}

type Props = {
  filters: VitrinesFilters;
  onFiltersChange: (f: VitrinesFilters) => void;
  totalCount: number;
  filteredCount: number;
  showVideoCountFilters?: boolean;
};

export function VitrinesAdvancedSearch({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
  showVideoCountFilters = true
}: Props) {
  const [textInput, setTextInput] = useState(filters.q);

  useEffect(() => {
    setTextInput(filters.q);
  }, [filters.q]);

  const applyText = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, q: value });
    },
    [filters, onFiltersChange]
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if (textInput !== filters.q) applyText(textInput);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [textInput, filters.q, applyText]);

  const handleClear = useCallback(() => {
    setTextInput("");
    onFiltersChange(defaultFilters);
  }, [onFiltersChange]);

  return (
    <div className="vitrines-advanced-search">
      <div className="form-row flex-wrap gap-md mb-md">
        <Field label="Texto" className="field-flex">
          <Input
            placeholder="Nome, ID ou vimeo_showcase_*"
            value={textInput}
            onChange={setTextInput}
            className="input-search"
          />
        </Field>
        <Field label="Status">
          <select
            className="input"
            value={filters.status}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                status: e.target.value as VitrinesFilters["status"]
              })
            }
          >
            <option value="">Todos</option>
            <option value="ACTIVE">Ativa</option>
            <option value="INACTIVE">Inativa</option>
          </select>
        </Field>
        <Field label="Data de">
          <input
            type="date"
            className="input"
            value={filters.dateFrom}
            onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
          />
        </Field>
        <Field label="Data até">
          <input
            type="date"
            className="input"
            value={filters.dateTo}
            onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
          />
        </Field>
        {showVideoCountFilters && (
          <>
            <Field label="Mín. vídeos">
              <input
                type="number"
                min={0}
                className="input"
                value={filters.minVideos}
                onChange={(e) => onFiltersChange({ ...filters, minVideos: e.target.value })}
                placeholder="—"
              />
            </Field>
            <Field label="Máx. vídeos">
              <input
                type="number"
                min={0}
                className="input"
                value={filters.maxVideos}
                onChange={(e) => onFiltersChange({ ...filters, maxVideos: e.target.value })}
                placeholder="—"
              />
            </Field>
          </>
        )}
        <Field label="Ordenação">
          <select
            className="input"
            value={filters.sort}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                sort: e.target.value as VitrinesFilters["sort"]
              })
            }
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-end gap-sm">
          <Button variant="secondary" onClick={handleClear}>
            Limpar filtros
          </Button>
        </div>
      </div>
      <p className="muted" style={{ marginTop: 0, marginBottom: 8 }}>
        Total {totalCount} / Filtradas {filteredCount}
      </p>
    </div>
  );
}
