"use client";

import Link from "next/link";
import { useHealthQuery } from "@/hooks/query/useHealthQuery";
import { useUIStore } from "@/store/ui";

export function HomeClient() {
  const { showAdvanced, toggleAdvanced } = useUIStore();
  const healthQuery = useHealthQuery();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Houseplan Bootstrap</h1>
        <p className="text-sm text-slate-300">Tailwind + React Query + Zustand are wired.</p>
      </header>

      <section className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-base font-medium">React Query health check</h2>
        {healthQuery.isPending ? <p className="text-sm text-slate-300">Loading...</p> : null}
        {healthQuery.isError ? (
          <p className="text-sm text-red-300">{String(healthQuery.error)}</p>
        ) : null}
        {healthQuery.data ? (
          <div className="space-y-1 text-sm">
            <p>Status: {healthQuery.data.ok ? "ok" : "error"}</p>
            <p>Service: {healthQuery.data.service}</p>
            <p>Timestamp: {healthQuery.data.timestamp}</p>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-base font-medium">Zustand UI state</h2>
        <button
          type="button"
          onClick={toggleAdvanced}
          className="rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-sky-400"
        >
          Toggle advanced panel
        </button>
        {showAdvanced ? (
          <p className="mt-3 text-sm text-slate-300">
            Advanced panel is enabled from a global Zustand store.
          </p>
        ) : null}
      </section>

      <nav className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-base font-medium">Routes</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-sky-300">
          <li>
            <Link href="/discover">Discover</Link>
          </li>
          <li>
            <Link href="/login">Login</Link>
          </li>
          <li>
            <Link href="/register">Register</Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}
