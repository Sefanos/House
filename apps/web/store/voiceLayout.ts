import { create } from "zustand";

export type ParticipantLayoutMode = "grid" | "focus";

type VoiceLayoutState = {
  mode: ParticipantLayoutMode;
  focusedUserId: string | null;
  setMode: (mode: ParticipantLayoutMode) => void;
  setFocusedUserId: (userId: string | null) => void;
  resetLayout: () => void;
};

export const useVoiceLayoutStore = create<VoiceLayoutState>((set) => ({
  mode: "grid",
  focusedUserId: null,
  setMode: (mode) => {
    set((state) => ({
      mode,
      focusedUserId: mode === "grid" ? null : state.focusedUserId
    }));
  },
  setFocusedUserId: (userId) => {
    set({
      focusedUserId: userId,
      mode: userId ? "focus" : "grid"
    });
  },
  resetLayout: () => {
    set({
      mode: "grid",
      focusedUserId: null
    });
  }
}));
