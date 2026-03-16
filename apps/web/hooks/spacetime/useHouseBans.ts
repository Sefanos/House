"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureSpacetimeConnection } from "@/lib/spacetime";

type HouseBanRow = {
  id: string;
  houseId: string;
  userId: string;
  bannedBy: string;
  reason: string;
  bannedAt: string;
};

type UseHouseBansResult = {
  bans: HouseBanRow[];
  isLoading: boolean;
  error: string | null;
};

export function useHouseBans(houseId?: string): UseHouseBansResult {
  const [bans, setBans] = useState<HouseBanRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const houseFilter = useMemo(() => (houseId ? houseId : ""), [houseId]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    async function setup() {
      try {
        const connection = await ensureSpacetimeConnection();
        const table = connection.db.houseBans;

        const syncBans = () => {
          if (disposed) return;
          const rows = Array.from(table.iter()) as HouseBanRow[];
          const nextRows = houseFilter ? rows.filter((entry) => entry.houseId === houseFilter) : rows;
          setBans(nextRows);
          setIsLoading(false);
        };

        const onInsert = () => syncBans();
        const onDelete = () => syncBans();
        const onUpdate = () => syncBans();

        table.onInsert(onInsert);
        table.onDelete(onDelete);
        table.onUpdate(onUpdate);
        syncBans();

        cleanup = () => {
          table.removeOnInsert(onInsert);
          table.removeOnDelete(onDelete);
          table.removeOnUpdate(onUpdate);
        };
      } catch (nextError) {
        if (disposed) return;
        setError(nextError instanceof Error ? nextError.message : "Failed to load house bans.");
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
  }, [houseFilter]);

  return { bans, isLoading, error };
}
