"use client";

import { useEffect, useState } from "react";
import { ensureSpacetimeConnection } from "@/lib/spacetime";

export type UserRow = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  createdAt: string;
};

type UseUsersResult = {
  users: UserRow[];
  isLoading: boolean;
  error: string | null;
};

export function useUsers(): UseUsersResult {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isDisposed = false;
    let cleanup: (() => void) | null = null;

    async function setup() {
      try {
        const connection = await ensureSpacetimeConnection();
        const table = connection.db.users;

        const syncUsers = () => {
          if (isDisposed) return;
          const rows = Array.from(table.iter()) as UserRow[];
          setUsers(rows);
          setIsLoading(false);
        };

        const onInsert = () => syncUsers();
        const onDelete = () => syncUsers();
        const onUpdate = () => syncUsers();

        table.onInsert(onInsert);
        table.onDelete(onDelete);
        table.onUpdate(onUpdate);
        syncUsers();

        cleanup = () => {
          table.removeOnInsert(onInsert);
          table.removeOnDelete(onDelete);
          table.removeOnUpdate(onUpdate);
        };
      } catch (err) {
        if (isDisposed) return;
        setError(err instanceof Error ? err.message : "Failed to load users.");
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
  }, []);

  return { users, isLoading, error };
}
