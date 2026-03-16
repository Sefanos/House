"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureSpacetimeConnection } from "@/lib/spacetime";

type InviteRow = {
  code: string;
  houseId: string;
  createdBy: string;
  expiresAt?: string;
  maxUses?: number;
  uses: number;
  createdAt: string;
};

type UseInvitesResult = {
  invites: InviteRow[];
  isLoading: boolean;
  error: string | null;
};

export function useInvites(houseId?: string): UseInvitesResult {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const houseFilter = useMemo(() => (houseId ? houseId : ""), [houseId]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    async function setup() {
      try {
        const connection = await ensureSpacetimeConnection();
        const table = connection.db.invites;

        const syncInvites = () => {
          if (disposed) return;
          const rows = Array.from(table.iter()) as InviteRow[];
          const nextRows = houseFilter ? rows.filter((entry) => entry.houseId === houseFilter) : rows;
          setInvites(nextRows);
          setIsLoading(false);
        };

        const onInsert = () => syncInvites();
        const onDelete = () => syncInvites();
        const onUpdate = () => syncInvites();

        table.onInsert(onInsert);
        table.onDelete(onDelete);
        table.onUpdate(onUpdate);
        syncInvites();

        cleanup = () => {
          table.removeOnInsert(onInsert);
          table.removeOnDelete(onDelete);
          table.removeOnUpdate(onUpdate);
        };
      } catch (nextError) {
        if (disposed) return;
        setError(nextError instanceof Error ? nextError.message : "Failed to load invites.");
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

  return { invites, isLoading, error };
}
