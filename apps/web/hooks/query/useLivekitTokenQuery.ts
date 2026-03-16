"use client";

import { useMutation } from "@tanstack/react-query";
import { clearSessionToken, getSessionToken, isSessionError } from "@/lib/spacetime";

export type LivekitTokenRequest = {
  roomId: string;
  roomName: string;
  identity: string;
  name: string;
};

export type LivekitTokenResponse = {
  ok: true;
  token: string;
  url: string;
  roomName: string;
  identity: string;
};

async function requestLivekitToken(payload: LivekitTokenRequest): Promise<LivekitTokenResponse> {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    throw new Error("Missing session token.");
  }

  const response = await fetch("/api/livekit/token", {
    method: "POST",
    headers: {
      authorization: `Bearer ${sessionToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = (await response.json().catch(() => null)) as
    | LivekitTokenResponse
    | { message?: string }
    | null;

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? body.message || "Failed to request LiveKit token."
        : "Failed to request LiveKit token.";

    if (response.status === 401 && isSessionError(new Error(message))) {
      clearSessionToken();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
      throw new Error("Session expired. Please log in again.");
    }

    throw new Error(message);
  }

  if (!body || typeof body !== "object" || !("ok" in body) || body.ok !== true) {
    throw new Error("LiveKit token endpoint returned an invalid response.");
  }

  return body;
}

export function useLivekitTokenQuery() {
  return useMutation({
    mutationKey: ["livekit-token"],
    mutationFn: requestLivekitToken
  });
}
