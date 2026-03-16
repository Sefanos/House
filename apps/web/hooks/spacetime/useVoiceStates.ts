"use client";

import { useEffect, useState } from "react";
import { ensureSpacetimeConnection } from "@/lib/spacetime";

type VoiceStateRow = {
  userId: string;
  muted: boolean;
  cameraOn: boolean;
  updatedAt: string;
};

type UseVoiceStatesResult = {
  voiceStates: VoiceStateRow[];
  isLoading: boolean;
  error: string | null;
};

export function useVoiceStates(): UseVoiceStatesResult {
  const [voiceStates, setVoiceStates] = useState<VoiceStateRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    async function setup() {
      try {
        const connection = await ensureSpacetimeConnection();
        const table = connection.db.voiceStates;

        const syncVoiceStates = () => {
          if (disposed) return;
          const rows = Array.from(table.iter()) as VoiceStateRow[];
          setVoiceStates(rows);
          setIsLoading(false);
        };

        const onInsert = () => syncVoiceStates();
        const onDelete = () => syncVoiceStates();
        const onUpdate = () => syncVoiceStates();

        table.onInsert(onInsert);
        table.onDelete(onDelete);
        table.onUpdate(onUpdate);
        syncVoiceStates();

        cleanup = () => {
          table.removeOnInsert(onInsert);
          table.removeOnDelete(onDelete);
          table.removeOnUpdate(onUpdate);
        };
      } catch (nextError) {
        if (disposed) return;
        setError(nextError instanceof Error ? nextError.message : "Failed to load voice states.");
        setIsLoading(false);
      }
    }

    setup();

    return () => {
      disposed = true;
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  return { voiceStates, isLoading, error };
}
