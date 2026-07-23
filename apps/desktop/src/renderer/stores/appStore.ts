import { create } from "zustand";

interface AppState {
  reducedMotion: boolean | null;
  setReducedMotion: (value: boolean | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  reducedMotion: null,
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
}));
