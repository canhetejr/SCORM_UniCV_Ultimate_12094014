import { create } from "zustand";
import type { Vitrine } from "../types/vitrine";

type VitrinesState = {
  vitrines: Vitrine[];
  setVitrines: (data: Vitrine[]) => void;
  syncVitrines: (data: Vitrine[]) => void;
};

function sortByCreatedAtDesc(data: Vitrine[]): Vitrine[] {
  return [...data].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export const useVitrinesStore = create<VitrinesState>((set) => ({
  vitrines: [],
  setVitrines: (data) => set({ vitrines: sortByCreatedAtDesc(data) }),
  syncVitrines: (data) =>
    set((state) => {
      const byId = new Map(state.vitrines.map((item) => [item.id, item]));
      for (const vitrine of data) {
        byId.set(vitrine.id, vitrine);
      }
      return { vitrines: sortByCreatedAtDesc(Array.from(byId.values())) };
    })
}));
