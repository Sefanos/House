"use client";

import { useVoiceLayoutStore } from "@/store/voiceLayout";

export function useParticipantLayout() {
  const mode = useVoiceLayoutStore((state) => state.mode);
  const focusedUserId = useVoiceLayoutStore((state) => state.focusedUserId);
  const setMode = useVoiceLayoutStore((state) => state.setMode);
  const setFocusedUserId = useVoiceLayoutStore((state) => state.setFocusedUserId);
  const resetLayout = useVoiceLayoutStore((state) => state.resetLayout);

  return {
    mode,
    focusedUserId,
    setMode,
    setFocusedUserId,
    resetLayout
  };
}
