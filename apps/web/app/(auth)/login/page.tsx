"use client";

import { FormEvent, useState } from "react";
import { invokeAuthReducer, type ReducerResult } from "@/lib/spacetime";

export default function LoginPage() {
  const [result, setResult] = useState<ReducerResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");

    setIsSubmitting(true);
    try {
      const reducerResult = await invokeAuthReducer("auth.login", { username, password });
      setResult(reducerResult);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section>
      <h1>Login</h1>
      <p>Bootstrap placeholder flow that calls the `auth.login` reducer shim.</p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label htmlFor="username">Username</label>
        <input id="username" name="username" required />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>

      {result ? (
        <pre style={{ marginTop: 16, padding: 12, background: "#141a22" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </section>
  );
}
