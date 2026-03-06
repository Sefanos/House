"use client";

import { useQuery } from "@tanstack/react-query";

export type HealthResponse = {
  ok: boolean;
  service: string;
  timestamp: string;
};

async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/health");
  if (!response.ok) {
    throw new Error("Failed to fetch health status.");
  }
  return response.json();
}

export function useHealthQuery() {
  return useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 15_000
  });
}
