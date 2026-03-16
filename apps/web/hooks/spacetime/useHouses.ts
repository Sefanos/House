"use client";

import { useEffect, useState } from "react";
import { ensureSpacetimeConnection } from "@/lib/spacetime";

export type HouseRow = {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  ownerId: string;
  isPublic: boolean;
  tags: string;
  themeId: string;
  accentColor: string;
  createdAt: string;
};

type UseHousesResult = {
  houses: HouseRow[];
  isLoading: boolean;
  error: string | null;
};

export function useHouses(): UseHousesResult {
  const [houses, setHouses] = useState<HouseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    async function setup() {
      try {
        const connection = await ensureSpacetimeConnection();
        const table = connection.db.houses;

        const syncHouses = () => {
          if (disposed) return;
          const rows = Array.from(table.iter()) as HouseRow[];
          setHouses(rows);
          setIsLoading(false);
        };

        const onInsert = () => syncHouses();
        const onDelete = () => syncHouses();
        const onUpdate = () => syncHouses();

        table.onInsert(onInsert);
        table.onDelete(onDelete);
        table.onUpdate(onUpdate);
        syncHouses();

        cleanup = () => {
          table.removeOnInsert(onInsert);
          table.removeOnDelete(onDelete);
          table.removeOnUpdate(onUpdate);
        };
      } catch (nextError) {
        if (disposed) return;
        setError(nextError instanceof Error ? nextError.message : "Failed to load houses.");
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

  return { houses, isLoading, error };
}
