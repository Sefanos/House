"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureSpacetimeConnection } from "@/lib/spacetime";

type PresenceRow = {
  userId: string;
  status: "online" | "idle" | "dnd" | "offline";
  customText: string;
  lastSeen: string;
  currentHouseId: string;
  currentRoomId: string;
};

type UsePresenceResult = {
  presence: PresenceRow[];
  isLoading: boolean;
  error: string | null;
};

export function usePresence(userIds?: string[]): UsePresenceResult {
  const [presence, setPresence] = useState<PresenceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userFilterKey = useMemo(() => (userIds ?? []).join("|"), [userIds]);
  const userFilter = useMemo(
    () => new Set(userFilterKey ? userFilterKey.split("|").filter(Boolean) : []),
    [userFilterKey]
  );

  useEffect(() => {
    let isDisposed = false;
    let cleanup: (() => void) | null = null;

    async function setup() {
      try {
        const connection = await ensureSpacetimeConnection();
        const table = connection.db.presence;

        const syncPresence = () => {
          if (isDisposed) return;
          const rows = Array.from(table.iter()) as PresenceRow[];
          const nextRows =
            userFilter.size > 0 ? rows.filter((entry) => userFilter.has(entry.userId)) : rows;
          setPresence(nextRows);
          setIsLoading(false);
        };

        const onInsert = () => syncPresence();
        const onDelete = () => syncPresence();
        const onUpdate = () => syncPresence();

        table.onInsert(onInsert);
        table.onDelete(onDelete);
        table.onUpdate(onUpdate);
        syncPresence();

        cleanup = () => {
          table.removeOnInsert(onInsert);
          table.removeOnDelete(onDelete);
          table.removeOnUpdate(onUpdate);
        };
      } catch (err) {
        if (isDisposed) return;
        setError(err instanceof Error ? err.message : "Failed to load presence.");
        setIsLoading(false);
      }
    }

    setup();

    return () => {
      isDisposed = true;
      if (cleanup) {
        cleanup();
      }
    };
  }, [userFilterKey, userFilter]);

  return { presence, isLoading, error };
}
