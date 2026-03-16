"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentUsername } from "@/lib/spacetime";
import { useUsers } from "./useUsers";

type CurrentUserRow = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  createdAt: string;
};

type UseCurrentUserResult = {
  currentUser: CurrentUserRow | null;
  username: string | null;
  isLoading: boolean;
  error: string | null;
};

export function useCurrentUser(): UseCurrentUserResult {
  const { users, isLoading, error } = useUsers();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setUsername(getCurrentUsername());
  }, []);

  const currentUser = useMemo(() => {
    if (!username) return null;
    return (users.find((user) => user.username === username) as CurrentUserRow | undefined) ?? null;
  }, [users, username]);

  return {
    currentUser,
    username,
    isLoading,
    error
  };
}
