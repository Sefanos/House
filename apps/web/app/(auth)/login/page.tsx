"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { normalizeClientErrorMessage } from "@/lib/errors";
import {
  assertSession,
  clearSessionToken,
  hasSessionToken,
  invokeAuthReducer,
  isSessionError,
  type ReducerResult
} from "@/lib/spacetime";

export default function LoginPage() {
  const router = useRouter();
  const [result, setResult] = useState<ReducerResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    if (!username) {
      setError("Username is required.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const reducerResult = await invokeAuthReducer("auth.login", { username, password });
      setResult(reducerResult);
      router.replace("/houses");
    } catch (err) {
      setError(normalizeClientErrorMessage(err, "Login failed.", "auth.login"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <h1 className="text-xl font-semibold">Login</h1>
      <p className="text-sm text-slate-300">Sign in with your username and password.</p>
      <form onSubmit={onSubmit} className="grid gap-3">
        <label htmlFor="username" className="text-xs uppercase tracking-wide text-slate-400">
          Username
        </label>
        <input
          id="username"
          name="username"
          required
          autoComplete="username"
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />
        <label htmlFor="password" className="text-xs uppercase tracking-wide text-slate-400">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>

      {error ? (
        <p className="text-sm text-rose-300">
          Error: <span className="text-rose-400">{error}</span>
        </p>
      ) : null}

      {result ? (
        <pre className="rounded-md bg-slate-950 p-3 text-xs text-slate-300">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </section>
  );
}
