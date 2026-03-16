"use client";

import { useMutation } from "@tanstack/react-query";
import { clearSessionToken, getSessionToken, isSessionError } from "@/lib/spacetime";

export type PresignedUploadRequest = {
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

export type PresignedUploadResponse = {
  ok: true;
  endpoint: "POST /api/upload/presign";
  method: "PUT";
  uploadUrl: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  expiresInSeconds: number;
  requiredHeaders: Record<string, string>;
  publicUrl?: string;
};

async function requestPresignedUpload(payload: PresignedUploadRequest): Promise<PresignedUploadResponse> {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    throw new Error("Missing session token.");
  }

  const response = await fetch("/api/upload/presign", {
    method: "POST",
    headers: {
      authorization: `Bearer ${sessionToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = (await response.json().catch(() => null)) as
    | PresignedUploadResponse
    | { message?: string }
    | null;

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? body.message || "Failed to request upload URL."
        : "Failed to request upload URL.";

    if (response.status === 401 && isSessionError(new Error(message))) {
      clearSessionToken();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
      throw new Error("Session expired. Please log in again.");
    }

    throw new Error(
      message
    );
  }

  if (!body || typeof body !== "object" || !("ok" in body) || body.ok !== true) {
    throw new Error("Upload presign endpoint returned an invalid response.");
  }

  return body;
}

export function usePresignedUploadQuery() {
  return useMutation({
    mutationKey: ["upload-presign"],
    mutationFn: requestPresignedUpload
  });
}
