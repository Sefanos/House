"use client";

import { useEffect, useState } from "react";
import { getActiveSpacetimeConnection } from "@/lib/spacetime";

export type ConnectivityState = "online" | "reconnecting" | "offline";

export function useConnectivity(): ConnectivityState {
  const [isBrowserOnline, setIsBrowserOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [hasRealtimeConnection, setHasRealtimeConnection] = useState(
    Boolean(getActiveSpacetimeConnection())
  );

  useEffect(() => {
    const onOnline = () => setIsBrowserOnline(true);
    const onOffline = () => setIsBrowserOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const timer = window.setInterval(() => {
      setHasRealtimeConnection(Boolean(getActiveSpacetimeConnection()));
    }, 3000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(timer);
    };
  }, []);

  if (!isBrowserOnline) {
    return "offline";
  }

  if (!hasRealtimeConnection) {
    return "reconnecting";
  }

  return "online";
}
