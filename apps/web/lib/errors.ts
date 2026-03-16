const SESSION_ERROR_MESSAGES = [
  "Not authenticated.",
  "Session expired.",
  "Session not found.",
  "Session is invalid or expired."
] as const;

const OPAQUE_INSTANCE_ERROR = "The instance encountered a fatal error.";

function toRawErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message?.trim()) return error.message.trim();
    const cause = (error as { cause?: unknown }).cause;
    if (cause instanceof Error && cause.message.trim()) return cause.message.trim();
  }

  if (typeof error === "string") {
    return error.trim();
  }

  return "";
}

export function normalizeClientErrorMessage(
  error: unknown,
  fallbackMessage: string,
  context?: "auth.register" | "auth.login" | "runtime"
): string {
  const rawMessage = toRawErrorMessage(error);
  if (!rawMessage) {
    return fallbackMessage;
  }

  if (SESSION_ERROR_MESSAGES.some((text) => rawMessage.includes(text))) {
    return rawMessage;
  }

  if (rawMessage.includes("MODULE_NOT_FOUND")) {
    return "Build cache is stale. Clear apps/web/.next and restart the dev server.";
  }

  if (rawMessage.includes(OPAQUE_INSTANCE_ERROR)) {
    if (context === "auth.register") {
      return "Registration failed due to a backend instance error. Check Spacetime logs and verify username/password constraints.";
    }
    if (context === "auth.login") {
      return "Login failed due to a backend instance error. Check Spacetime logs and verify credentials.";
    }
    return "A backend instance error occurred. Check server logs for the exact reducer failure.";
  }

  return rawMessage;
}

export function validateRegistrationInput(username: string, password: string): string | null {
  const normalizedUsername = username.trim();

  if (normalizedUsername.length < 3) {
    return "Username must be at least 3 characters.";
  }

  if (normalizedUsername.length > 24) {
    return "Username must be at most 24 characters.";
  }

  if (!/^[a-zA-Z0-9_]+$/.test(normalizedUsername)) {
    return "Username can only contain letters, numbers, and underscores (no @ or dots).";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (password.length > 128) {
    return "Password must be at most 128 characters.";
  }

  return null;
}

export function formatDebugErrorDetails(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    const details: string[] = [
      `name: ${error.name}`,
      `message: ${error.message || "(empty)"}`
    ];

    if (typeof code === "string" && code.trim()) {
      details.push(`code: ${code}`);
    }

    if (error.stack) {
      details.push("", error.stack);
    }

    return details.join("\n");
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}
