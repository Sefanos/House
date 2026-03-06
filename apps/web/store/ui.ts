import { create } from "zustand";

type UIState = {
  showAdvanced: boolean;
  toggleAdvanced: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  showAdvanced: false,
  toggleAdvanced: () => {
    set((state) => ({ showAdvanced: !state.showAdvanced }));
  }
}));
