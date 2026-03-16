"use client";

import { useMemo } from "react";
import { useUsers, type UserRow } from "./useUsers";

const DEFAULT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 50;

export type UseUserSearchInput = {
  query?: string;
  page?: number;
  pageSize?: number;
};

export type UseUserSearchResult = {
  results: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  isLoading: boolean;
  error: string | null;
};

function safePageSize(value?: number): number {
  if (!value || Number.isNaN(value)) return DEFAULT_PAGE_SIZE;
  return Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(value)));
}

function searchMatch(user: UserRow, query: string): boolean {
  if (!query) return true;
  const haystack = [user.username, user.displayName, user.bio].join(" ").toLowerCase();
  return haystack.includes(query);
}

export function useUserSearch(input: UseUserSearchInput = {}): UseUserSearchResult {
  const { users, isLoading, error } = useUsers();

  const query = input.query?.trim().toLowerCase() ?? "";
  const pageSize = safePageSize(input.pageSize);
  const requestedPage = input.page && input.page > 0 ? Math.floor(input.page) : 1;

  return useMemo(() => {
    const filtered = users
      .filter((user) => searchMatch(user, query))
      .sort((a, b) => {
        const displayNameCompare = a.displayName.localeCompare(b.displayName);
        if (displayNameCompare !== 0) return displayNameCompare;
        return a.username.localeCompare(b.username);
      });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
      results: filtered.slice(startIndex, endIndex),
      total,
      page,
      pageSize,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
      isLoading,
      error
    };
  }, [users, query, requestedPage, pageSize, isLoading, error]);
}
