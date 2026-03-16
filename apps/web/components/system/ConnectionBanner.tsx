"use client";

import { useConnectivity } from "@/hooks/useConnectivity";

export function ConnectionBanner() {
  const connectivity = useConnectivity();

  if (connectivity === "online") {
    return null;
  }

  if (connectivity === "offline") {
    return (
      <div className="rounded-md border border-rose-700/60 bg-rose-950/50 px-3 py-2 text-xs text-rose-100">
        You are offline. Realtime updates are paused until your internet connection returns.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-100">
      Reconnecting to realtime services...
    </div>
  );
}
