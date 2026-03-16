"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ConnectionBanner } from "@/components/system/ConnectionBanner";
import { AppearanceSettings } from "@/components/theme/AppearanceSettings";
import { useHouses } from "@/hooks/spacetime/useHouses";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import {
  assertSession,
  clearSessionToken,
  hasSessionToken,
  invokeLogoutReducer,
  isSessionError
} from "@/lib/spacetime";

type AppLayoutProps = {
  children: ReactNode;
};

const SESSION_CHECK_TIMEOUT_MS = 12_000;

function resolveActiveHouseId(pathname: string): string | null {
  const match = pathname.match(/^\/houses\/([^/]+)/);
  return match?.[1] ?? null;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    promise
      .then((value) => resolve(value))
      .catch((error) => reject(error))
      .finally(() => clearTimeout(timer));
  });
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { houses, isLoading: isLoadingHouses, error: housesError } = useHouses();
  const { resolvedTheme } = useResolvedTheme();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const sortedHouses = useMemo(
    () => [...houses].sort((a, b) => a.name.localeCompare(b.name)),
    [houses]
  );
  const activeHouseId = useMemo(() => resolveActiveHouseId(pathname), [pathname]);
  const housesRouteActive = pathname === "/houses" || pathname.startsWith("/houses/");
  const dmsRouteActive = pathname === "/dms" || pathname.startsWith("/dms/");

  useEffect(() => {
    let disposed = false;

    async function validateSession() {
      if (!hasSessionToken()) {
        if (disposed) return;
        setIsAuthed(false);
        setIsCheckingSession(false);
        router.replace("/login");
        return;
      }

      try {
        await withTimeout(
          assertSession(),
          SESSION_CHECK_TIMEOUT_MS,
          `Session validation timed out after ${SESSION_CHECK_TIMEOUT_MS}ms.`
        );
        if (disposed) return;
        setIsAuthed(true);
      } catch (error) {
        if (disposed) return;
        if (isSessionError(error)) {
          clearSessionToken();
          setIsAuthed(false);
          router.replace("/login");
          return;
        }
        console.error("Failed to validate session:", error);
        clearSessionToken();
        setIsAuthed(false);
        router.replace("/login");
      } finally {
        if (!disposed) {
          setIsCheckingSession(false);
        }
      }
    }

    validateSession();

    return () => {
      disposed = true;
    };
  }, [router]);

  async function onLogout() {
    setIsLoggingOut(true);
    try {
      await invokeLogoutReducer();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      clearSessionToken();
      setIsAuthed(false);
      setIsLoggingOut(false);
      router.replace("/login");
    }
  }

  if (isCheckingSession) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p className="text-sm text-slate-300">Checking session...</p>
      </main>
    );
  }

  if (!isAuthed) {
    return null;
  }

  const logoutButton = (
    <button
      type="button"
      onClick={onLogout}
      disabled={isLoggingOut}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-rose-700 bg-rose-950 text-rose-300 transition hover:bg-rose-900 disabled:cursor-not-allowed disabled:opacity-70 mt-auto"
      title="Logout"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
    </button>
  );

  const headerLogoutButton = (
    <button
      type="button"
      onClick={onLogout}
      disabled={isLoggingOut}
      className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isLoggingOut ? "Logging out..." : "Logout"}
    </button>
  );

  if (resolvedTheme.shellLayoutMode === "classic_rail") {
    return (
      <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[72px_minmax(0,1fr)]">
        <aside className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 bg-slate-950/80 p-3 lg:sticky lg:top-0 lg:h-screen lg:flex-col lg:items-center lg:border-b-0 lg:border-r lg:px-2 lg:py-3">
          <Link
            href="/houses"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-900 text-sm font-semibold text-slate-100"
          >
            HP
          </Link>
          <Link
            href="/houses"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-sm font-medium transition ${
              housesRouteActive
                ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            H
          </Link>
          <Link
            href="/dms"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-sm font-medium transition ${
              dmsRouteActive
                ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
                : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            D
          </Link>
          <span className="mx-1 hidden h-px w-8 bg-slate-700 lg:block" />
          {sortedHouses.slice(0, 8).map((house) => {
            const label = house.name.trim().charAt(0).toUpperCase() || "H";
            const active = house.id === activeHouseId;
            return (
              <Link
                key={house.id}
                href={`/houses/${house.id}`}
                title={house.name}
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-xs font-semibold transition ${
                  active
                    ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {label}
              </Link>
            );
          })}
          <div className="mt-auto hidden lg:block" />
          {logoutButton}
        </aside>

        <section className="min-w-0 p-3 lg:py-4 lg:pl-2 lg:pr-4">{children}</section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-slate-800 bg-slate-950/65 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/houses"
            className="rounded-full border border-sky-500/50 bg-sky-500/15 px-3 py-1.5 text-sm font-semibold text-sky-100"
          >
            Houseplan
          </Link>
          <div className="h-5 w-px bg-slate-700/80" />
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1">
            <Link
              href="/houses"
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                housesRouteActive
                  ? "border-sky-400/60 bg-sky-500/15 text-sky-100"
                  : "border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800"
              }`}
            >
              Houses
            </Link>
            {sortedHouses.map((house) => (
              <Link
                key={house.id}
                href={`/houses/${house.id}`}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  house.id === activeHouseId
                    ? "border-sky-400/60 bg-sky-500/15 text-sky-100"
                    : "border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {house.name}
              </Link>
            ))}
            {isLoadingHouses ? <span className="text-xs text-slate-400">Loading houses...</span> : null}
          </div>
          <Link
            href="/dms"
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              dmsRouteActive
                ? "border-sky-400/60 bg-sky-500/15 text-sky-100"
                : "border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800"
            }`}
          >
            DMs
          </Link>
          <div className="hidden sm:block">{headerLogoutButton}</div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:p-6">
        <aside className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/55 p-4">
          <header>
            <h2 className="text-sm uppercase tracking-wide text-slate-300">Command Center</h2>
            <p className="mt-1 text-xs text-slate-400">Unified navigation and settings panel</p>
          </header>

          <ConnectionBanner />

          <nav className="space-y-2">
            <Link
              href="/houses"
              className={`block rounded-md border px-3 py-2 text-sm transition ${
                housesRouteActive
                  ? "border-sky-400/60 bg-sky-500/15 text-sky-100"
                  : "border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
              }`}
            >
              Browse Houses
            </Link>
            <Link
              href="/dms"
              className={`block rounded-md border px-3 py-2 text-sm transition ${
                dmsRouteActive
                  ? "border-sky-400/60 bg-sky-500/15 text-sky-100"
                  : "border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
              }`}
            >
              Direct Messages
            </Link>
          </nav>

          <section className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">Quick Actions</h3>
            <Link
              href="/houses#create-house"
              className="block rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 hover:bg-slate-800"
            >
              + Create House
            </Link>
            <Link
              href="/houses#join-house"
              className="block rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 hover:bg-slate-800"
            >
              Join With Invite
            </Link>
            {activeHouseId ? (
              <Link
                href={`/houses/${activeHouseId}`}
                className="block rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 hover:bg-slate-800"
              >
                Open Active House Settings
              </Link>
            ) : null}
          </section>

          {housesError ? (
            <p className="rounded-md border border-rose-700/60 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
              {housesError}
            </p>
          ) : null}

          <details className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-300">
              Customize UI
            </summary>
            <div className="mt-2">
              <AppearanceSettings />
            </div>
          </details>

          <div className="sm:hidden">{headerLogoutButton}</div>
        </aside>

        <section className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/30 p-4 lg:p-6">
          {children}
        </section>
      </div>
    </main>
  );
}
