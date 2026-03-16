"use client";

import { useEffect, useState } from "react";
import { ensureSpacetimeConnection } from "@/lib/spacetime";

export type BadgeRow = {
  id: string;
  houseId: string;
  name: string;
  icon: string;
  badgeType: "earned" | "achievement" | "house";
  createdBy: string;
  createdAt: string;
};

type UseBadgesResult = {
  badges: BadgeRow[];
  isLoading: boolean;
  error: string | null;
};

export function useBadges(houseId?: string): UseBadgesResult {
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    async function setup() {
      try {
        const connection = await ensureSpacetimeConnection();
        const table = connection.db.badges;

        const syncBadges = () => {
          if (disposed) return;
          const rows = Array.from(table.iter()) as BadgeRow[];
          const nextRows = houseId ? rows.filter((badge) => badge.houseId === houseId) : rows;
          setBadges(nextRows);
          setIsLoading(false);
        };

        const onInsert = () => syncBadges();
        const onDelete = () => syncBadges();
        const onUpdate = () => syncBadges();

        table.onInsert(onInsert);
        table.onDelete(onDelete);
        table.onUpdate(onUpdate);
        syncBadges();

        cleanup = () => {
          table.removeOnInsert(onInsert);
          table.removeOnDelete(onDelete);
          table.removeOnUpdate(onUpdate);
        };
      } catch (nextError) {
        if (disposed) return;
        setError(nextError instanceof Error ? nextError.message : "Failed to load badges.");
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
  }, [houseId]);

  return { badges, isLoading, error };
}
