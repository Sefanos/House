"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureSpacetimeConnection } from "@/lib/spacetime";

type RoomRow = {
  id: string;
  houseId: string;
  name: string;
  type: string;
  description: string;
  position: number;
  slowmodeSeconds: number;
  createdAt: string;
};

type UseRoomsResult = {
  rooms: RoomRow[];
  isLoading: boolean;
  error: string | null;
};

export function useRooms(houseId?: string): UseRoomsResult {
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const houseFilter = useMemo(() => (houseId ? houseId : ""), [houseId]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    async function setup() {
      try {
        const connection = await ensureSpacetimeConnection();
        const table = connection.db.rooms;

        const syncRooms = () => {
          if (disposed) return;
          const rows = Array.from(table.iter()) as RoomRow[];
          const nextRows = houseFilter ? rows.filter((entry) => entry.houseId === houseFilter) : rows;
          nextRows.sort((a, b) => {
            if (a.position === b.position) {
              return a.createdAt.localeCompare(b.createdAt);
            }
            return a.position - b.position;
          });
          setRooms(nextRows);
          setIsLoading(false);
        };

        const onInsert = () => syncRooms();
        const onDelete = () => syncRooms();
        const onUpdate = () => syncRooms();

        table.onInsert(onInsert);
        table.onDelete(onDelete);
        table.onUpdate(onUpdate);
        syncRooms();

        cleanup = () => {
          table.removeOnInsert(onInsert);
          table.removeOnDelete(onDelete);
          table.removeOnUpdate(onUpdate);
        };
      } catch (nextError) {
        if (disposed) return;
        setError(nextError instanceof Error ? nextError.message : "Failed to load rooms.");
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

  return { rooms, isLoading, error };
}
