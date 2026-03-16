"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureSpacetimeConnection } from "@/lib/spacetime";

type HouseMemberRow = {
  id: string;
  houseId: string;
  userId: string;
  joinedAt: string;
};

type UseHouseMembersResult = {
  members: HouseMemberRow[];
  isLoading: boolean;
  error: string | null;
};

export function useHouseMembers(houseId?: string): UseHouseMembersResult {
  const [members, setMembers] = useState<HouseMemberRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const houseFilter = useMemo(() => (houseId ? houseId : ""), [houseId]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    async function setup() {
      try {
        const connection = await ensureSpacetimeConnection();
        const table = connection.db.houseMembers;

        const syncMembers = () => {
          if (disposed) return;
          const rows = Array.from(table.iter()) as HouseMemberRow[];
          const nextRows = houseFilter ? rows.filter((entry) => entry.houseId === houseFilter) : rows;
          setMembers(nextRows);
          setIsLoading(false);
        };

        const onInsert = () => syncMembers();
        const onDelete = () => syncMembers();
        const onUpdate = () => syncMembers();

        table.onInsert(onInsert);
        table.onDelete(onDelete);
        table.onUpdate(onUpdate);
        syncMembers();

        cleanup = () => {
          table.removeOnInsert(onInsert);
          table.removeOnDelete(onDelete);
          table.removeOnUpdate(onUpdate);
        };
      } catch (nextError) {
        if (disposed) return;
        setError(nextError instanceof Error ? nextError.message : "Failed to load house members.");
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

  return { members, isLoading, error };
}
