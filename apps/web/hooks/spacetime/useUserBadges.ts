"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureSpacetimeConnection } from "@/lib/spacetime";

export type UserBadgeRow = {
  id: string;
  houseId: string;
  badgeId: string;
  userId: string;
  grantedBy: string;
  grantedAt: string;
};

type UseUserBadgesResult = {
  userBadges: UserBadgeRow[];
  isLoading: boolean;
  error: string | null;
};

export function useUserBadges(userId?: string): UseUserBadgesResult {
  const [userBadges, setUserBadges] = useState<UserBadgeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userFilter = useMemo(() => userId?.trim() ?? "", [userId]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    async function setup() {
      try {
        const connection = await ensureSpacetimeConnection();
        const table = connection.db.userBadges;

        const syncUserBadges = () => {
          if (disposed) return;
          const rows = Array.from(table.iter()) as UserBadgeRow[];
          const nextRows = userFilter ? rows.filter((entry) => entry.userId === userFilter) : rows;
          setUserBadges(nextRows);
          setIsLoading(false);
        };

        const onInsert = () => syncUserBadges();
        const onDelete = () => syncUserBadges();
        const onUpdate = () => syncUserBadges();

        table.onInsert(onInsert);
        table.onDelete(onDelete);
        table.onUpdate(onUpdate);
        syncUserBadges();

        cleanup = () => {
          table.removeOnInsert(onInsert);
          table.removeOnDelete(onDelete);
          table.removeOnUpdate(onUpdate);
        };
      } catch (nextError) {
        if (disposed) return;
        setError(nextError instanceof Error ? nextError.message : "Failed to load user badges.");
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
  }, [userFilter]);

  return { userBadges, isLoading, error };
}
