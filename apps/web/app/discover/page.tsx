"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useHouseSearch } from "@/hooks/spacetime/useHouseSearch";
import { useUserSearch } from "@/hooks/spacetime/useUserSearch";

type DiscoverTab = "houses" | "users";

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<DiscoverTab>("houses");
  const [housePage, setHousePage] = useState(1);
  const [userPage, setUserPage] = useState(1);

  const houseSearch = useHouseSearch({
    query,
    page: housePage,
    pageSize: 8,
    publicOnly: true
  });
  const userSearch = useUserSearch({
    query,
    page: userPage,
    pageSize: 8
  });

  useEffect(() => {
    setHousePage(1);
    setUserPage(1);
  }, [query]);

  const isHousesTab = activeTab === "houses";
  const activeSearch = isHousesTab ? houseSearch : userSearch;
  const hasResults = activeSearch.results.length > 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Discover</h1>
        <p className="text-sm text-slate-300">
          Browse public houses and member profiles without signing in.
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/login"
            className="rounded-md border border-slate-700 px-3 py-1.5 text-slate-100 hover:bg-slate-800"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-slate-700 px-3 py-1.5 text-slate-100 hover:bg-slate-800"
          >
            Create account
          </Link>
        </div>
      </header>

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <label htmlFor="discover-query" className="text-xs uppercase tracking-wide text-slate-400">
          Search
        </label>
        <input
          id="discover-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search houses, users, bios..."
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("houses")}
            className={`rounded-md px-3 py-1.5 text-sm ${
              isHousesTab
                ? "bg-sky-500 font-medium text-slate-950"
                : "border border-slate-700 text-slate-200 hover:bg-slate-800"
            }`}
          >
            Houses ({houseSearch.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`rounded-md px-3 py-1.5 text-sm ${
              isHousesTab
                ? "border border-slate-700 text-slate-200 hover:bg-slate-800"
                : "bg-sky-500 font-medium text-slate-950"
            }`}
          >
            Users ({userSearch.total})
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold tracking-wide text-slate-200">
          {isHousesTab ? "Public Houses" : "Public Profiles"}
        </h2>

        {activeSearch.isLoading ? <p className="text-sm text-slate-300">Loading...</p> : null}
        {activeSearch.error ? <p className="text-sm text-rose-400">{activeSearch.error}</p> : null}

        {!activeSearch.isLoading && !activeSearch.error && !hasResults ? (
          <p className="text-sm text-slate-300">No results found for this search.</p>
        ) : null}

        {isHousesTab ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {houseSearch.results.map((house) => (
              <li key={house.id} className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <p className="text-base font-semibold text-slate-100">{house.name}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-emerald-300">Public House</p>
                <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm text-slate-300">
                  {house.description || "No description."}
                </p>
                <p className="mt-2 text-xs text-slate-400">Created: {house.createdAt}</p>
                <Link
                  href="/login"
                  className="mt-3 inline-flex rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
                >
                  Sign in to join
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {userSearch.results.map((user) => (
              <li key={user.id} className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <p className="text-base font-semibold text-slate-100">{user.displayName}</p>
                <p className="mt-1 text-sm text-slate-300">@{user.username}</p>
                <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm text-slate-300">
                  {user.bio || "No bio yet."}
                </p>
                <Link
                  href={`/profile/${user.username}`}
                  className="mt-3 inline-flex rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
                >
                  Open profile
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Pagination
          page={activeSearch.page}
          totalPages={activeSearch.totalPages}
          onPrevious={
            isHousesTab ? () => setHousePage((value) => Math.max(1, value - 1)) : () => setUserPage((value) => Math.max(1, value - 1))
          }
          onNext={
            isHousesTab
              ? () => setHousePage((value) => Math.min(houseSearch.totalPages, value + 1))
              : () => setUserPage((value) => Math.min(userSearch.totalPages, value + 1))
          }
          hasPreviousPage={activeSearch.hasPreviousPage}
          hasNextPage={activeSearch.hasNextPage}
        />
      </section>
    </main>
  );
}

type PaginationProps = {
  page: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

function Pagination({
  page,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  onPrevious,
  onNext
}: PaginationProps) {
  return (
    <div className="flex items-center justify-between border-t border-slate-800 pt-3">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!hasPreviousPage}
        className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Previous
      </button>
      <p className="text-xs text-slate-400">
        Page {page} of {totalPages}
      </p>
      <button
        type="button"
        onClick={onNext}
        disabled={!hasNextPage}
        className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Next
      </button>
    </div>
  );
}
