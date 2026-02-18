import { create } from "zustand";
import type { Vitrine } from "../types/vitrine";

export interface VitrinesStore {
  vitrines: Vitrine[];
  setInitialVitrines: (data: Vitrine[]) => void;
  addOnlyNewVitrines: (data: Vitrine[]) => number;
}

function sortByCreatedAtDesc(data: Vitrine[]): Vitrine[] {
  return [...data].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export const useVitrinesStore = create<VitrinesStore>((set, get) => ({
  vitrines: [],
  setInitialVitrines: (data) => {
    if (get().vitrines.length > 0) return;
    set({ vitrines: sortByCreatedAtDesc(data) });
  },
  addOnlyNewVitrines: (incoming) => {
    const existingIds = new Set(get().vitrines.map((v) => v.id));
    const newOnes = incoming.filter((v) => !existingIds.has(v.id));

    if (newOnes.length === 0) return 0;

    set((state) => ({
      vitrines: sortByCreatedAtDesc([...state.vitrines, ...newOnes])
    }));

    return newOnes.length;
  }
}));
