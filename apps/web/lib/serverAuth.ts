import { DbConnection } from "@houseplan/spacetime-client";
import { NextResponse } from "next/server";

const AUTH_CONNECT_TIMEOUT_MS = 7000;
const SESSION_INVALID_PATTERNS = [
  "Not authenticated.",
  "Session expired.",
  "Session not found.",
  "Session is invalid or expired."
] as const;
const AUTH_BACKEND_UNAVAILABLE_PATTERNS = [
  "Timed out while connecting to SpacetimeDB",
  "Error connecting to SpacetimeDB WS",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EHOSTUNREACH"
] as const;

type PromiseWithResolversResult<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

type PromiseWithResolversCtor = PromiseConstructor & {
  withResolvers?: <T>() => PromiseWithResolversResult<T>;
};

function ensurePromiseWithResolversSupport() {
  const promiseCtor = Promise as PromiseWithResolversCtor;
  if (typeof promiseCtor.withResolvers === "function") {
    return;
  }

  promiseCtor.withResolvers = function withResolvers<T>(): PromiseWithResolversResult<T> {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return { promise, resolve, reject };
  };
}

ensurePromiseWithResolversSupport();

function spacetimeUrlFromEnv(): string {
  const value = process.env.NEXT_PUBLIC_SPACETIME_URL ?? "ws://localhost:3000";
  if (value.startsWith("ws://")) {
    return value.replace(/^ws:\/\//, "http://");
  }
  if (value.startsWith("wss://")) {
    return value.replace(/^wss:\/\//, "https://");
  }
  return value;
}

function spacetimeModuleFromEnv(): string {
  return process.env.NEXT_PUBLIC_SPACETIME_MODULE ?? "houseplan";
}

export class ApiAuthError extends Error {
  readonly status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "ApiAuthError";
    this.status = status;
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message?.trim()) return error.message.trim();
    const cause = (error as { cause?: unknown }).cause;
    if (cause instanceof Error && cause.message?.trim()) return cause.message.trim();
    return "";
  }
  if (typeof error === "string") {
    return error.trim();
  }
  return "";
}

function isSessionInvalidError(error: unknown): boolean {
  const message = toErrorMessage(error);
  return SESSION_INVALID_PATTERNS.some((pattern) => message.includes(pattern));
}

function isAuthBackendUnavailableError(error: unknown): boolean {
  const message = toErrorMessage(error);
  return AUTH_BACKEND_UNAVAILABLE_PATTERNS.some((pattern) => message.includes(pattern));
}

function readBearerToken(request: Request): string {
  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) {
    throw new ApiAuthError("Missing or invalid Authorization header.");
  }
  return token.trim();
}

async function connectWithToken(token: string): Promise<DbConnection> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("Timed out while connecting to SpacetimeDB for auth check."));
    }, AUTH_CONNECT_TIMEOUT_MS);

    DbConnection.builder()
      .withUri(spacetimeUrlFromEnv())
      .withDatabaseName(spacetimeModuleFromEnv())
      .withToken(token)
      .onConnect((connection) => {
        if (settled) {
          connection.disconnect();
          return;
        }
        settled = true;
        clearTimeout(timeout);
        resolve(connection);
      })
      .onConnectError((_ctx, error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        reject(error);
      })
      .build();
  });
}

async function assertSessionToken(token: string): Promise<void> {
  let connection: DbConnection | null = null;
  try {
    connection = await connectWithToken(token);
    await connection.reducers.authAssertSession({});
  } finally {
    connection?.disconnect();
  }
}

export async function requireAuthenticatedApiRequest(
  request: Request
): Promise<{ sessionToken: string }> {
  const sessionToken = readBearerToken(request);
  try {
    await assertSessionToken(sessionToken);
  } catch (error) {
    if (isSessionInvalidError(error)) {
      throw new ApiAuthError("Session is invalid or expired. Please log in again.");
    }

    if (isAuthBackendUnavailableError(error)) {
      console.error("Auth backend unavailable while validating API request:", error);
      throw new ApiAuthError(
        "Authentication service is unavailable. Verify SpacetimeDB is running.",
        503
      );
    }

    console.error("Unexpected auth validation error:", error);
    throw new ApiAuthError("Authentication check failed unexpectedly.", 500);
  }

  return { sessionToken };
}

export function toApiAuthErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiAuthError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  return NextResponse.json(
    {
      message: "Authentication check failed unexpectedly."
    },
    { status: 500 }
  );
}
