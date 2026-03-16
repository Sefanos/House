"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { normalizeClientErrorMessage, validateRegistrationInput } from "@/lib/errors";
import {
  assertSession,
  clearSessionToken,
  hasSessionToken,
  invokeAuthReducer,
  isSessionError,
  type ReducerResult
} from "@/lib/spacetime";
import { HouseBrand } from "@/components/ui/AmbientBackground";

export default function RegisterPage() {
  const router = useRouter();
  const [result, setResult] = useState<ReducerResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    let disposed = false;

    async function redirectIfAuthed() {
      if (!hasSessionToken()) return;
      try {
        await assertSession();
        if (!disposed) {
          router.replace("/houses");
        }
      } catch (sessionError) {
        if (isSessionError(sessionError)) {
          clearSessionToken();
        }
      }
    }

    redirectIfAuthed();

    return () => {
      disposed = true;
    };
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const validationError = validateRegistrationInput(username, password);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const reducerResult = await invokeAuthReducer("auth.register", { username, password });
      setResult(reducerResult);
      router.replace("/houses");
    } catch (err) {
      setError(normalizeClientErrorMessage(err, "Register failed.", "auth.register"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="hp-card">
      <HouseBrand />

      <h1 className="hp-heading">
        Build your <em>room</em>,<br />make it yours.
      </h1>
      <p className="hp-subheading">
        Create an account to start decorating your cozy corner.
      </p>

      <div className="hp-form">
        <form onSubmit={onSubmit}>
          <div className="hp-field">
            <label htmlFor="username">Username</label>
            <div className="hp-input-wrap">
              <input
                id="username"
                name="username"
                type="text"
                required
                minLength={3}
                maxLength={24}
                pattern="[A-Za-z0-9_]+"
                title="Use 3-24 characters: letters, numbers, underscores."
                autoComplete="username"
                placeholder="choose a cozy name"
                className="hp-input"
              />
              <svg className="hp-input-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
              </svg>
            </div>
          </div>

          <div className="hp-field">
            <label htmlFor="password">Password</label>
            <div className="hp-input-wrap">
              <input
                id="password"
                name="password"
                type={showPwd ? "text" : "password"}
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                placeholder="min 8 characters"
                className="hp-input"
              />
              <svg className="hp-input-icon" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              <button
                type="button"
                className="hp-eye-btn"
                onClick={() => setShowPwd(!showPwd)}
                aria-label="Toggle password"
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
                  <circle cx="10" cy="10" r="2.5" />
                  {showPwd && <line x1="2" y1="2" x2="18" y2="18" strokeWidth="1.8" />}
                </svg>
              </button>
            </div>
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="hp-btn-primary"
            >
              {isSubmitting ? "Building your room..." : "🏠  Move in"}
            </button>
          </div>
        </form>

        {error && <div className="hp-error">{error}</div>}

        {result && (
          <pre style={{ marginTop: "1rem", padding: "0.75rem", fontSize: "0.75rem", background: "rgba(0,0,0,0.3)", borderRadius: 12, color: "var(--hp-text-muted)", overflowX: "auto" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>

      <p className="hp-card-footer">
        Already have a room?{" "}
        <Link href="/login">Step back inside →</Link>
      </p>
    </div>
  );
}
