import { create } from "zustand";
import type { Vitrine } from "../types/vitrine";

export type ViewMode = "admin" | "collab";

const VIEW_MODE_KEY = "studio.viewMode";

function getInitialMode(): ViewMode {
  if (typeof window === "undefined") return "admin";
  return localStorage.getItem(VIEW_MODE_KEY) === "collab" ? "collab" : "admin";
}

export interface VitrinesStore {
  mode: ViewMode;
  admin: { vitrines: Vitrine[] };
  collab: { vitrines: Vitrine[] };
  setMode: (mode: ViewMode) => void;
  setInitial: (mode: ViewMode, data: Vitrine[]) => void;
  addOnlyNew: (mode: ViewMode, data: Vitrine[]) => number;
}

function sortByCreatedAtDesc(data: Vitrine[]): Vitrine[] {
  return [...data].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export const useVitrinesStore = create<VitrinesStore>((set, get) => ({
  mode: getInitialMode(),
  admin: { vitrines: [] },
  collab: { vitrines: [] },

  setMode: (mode) => {
    set({ mode });
    if (typeof window !== "undefined") {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    }
  },

  setInitial: (mode, data) => {
    const key = mode === "collab" ? "collab" : "admin";
    const current = get()[key].vitrines;
    if (current.length > 0) return;
    set({
      [key]: { vitrines: sortByCreatedAtDesc(data) }
    });
  },

  addOnlyNew: (mode, incoming) => {
    const key = mode === "collab" ? "collab" : "admin";
    const current = get()[key].vitrines;
    const existingIds = new Set(current.map((v) => v.id));
    const newOnes = incoming.filter((v) => !existingIds.has(v.id));
    if (newOnes.length === 0) return 0;
    const next = [...current, ...sortByCreatedAtDesc(newOnes)];
    set({ [key]: { vitrines: next } });
    return newOnes.length;
  }
}));

export function useVitrinesByMode(mode: ViewMode): Vitrine[] {
  return useVitrinesStore((state) =>
    mode === "collab" ? state.collab.vitrines : state.admin.vitrines
  );
}
