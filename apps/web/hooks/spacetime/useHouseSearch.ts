"use client";

import { useMemo } from "react";
import { useHouses, type HouseRow } from "./useHouses";

const DEFAULT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 50;

export type UseHouseSearchInput = {
  query?: string;
  page?: number;
  pageSize?: number;
  publicOnly?: boolean;
};

export type UseHouseSearchResult = {
  results: HouseRow[];
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

function searchMatch(house: HouseRow, query: string): boolean {
  if (!query) return true;
  const haystack = [house.name, house.description, house.tags].join(" ").toLowerCase();
  return haystack.includes(query);
}

export function useHouseSearch(input: UseHouseSearchInput = {}): UseHouseSearchResult {
  const { houses, isLoading, error } = useHouses();

  const query = input.query?.trim().toLowerCase() ?? "";
  const pageSize = safePageSize(input.pageSize);
  const requestedPage = input.page && input.page > 0 ? Math.floor(input.page) : 1;
  const publicOnly = input.publicOnly ?? true;

  return useMemo(() => {
    const filtered = houses
      .filter((house) => (publicOnly ? house.isPublic : true))
      .filter((house) => searchMatch(house, query))
      .sort((a, b) => {
        const createdAtCompare = b.createdAt.localeCompare(a.createdAt);
        if (createdAtCompare !== 0) return createdAtCompare;
        return a.name.localeCompare(b.name);
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
  }, [houses, query, publicOnly, requestedPage, pageSize, isLoading, error]);
}
