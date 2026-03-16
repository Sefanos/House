"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useHouses } from "@/hooks/spacetime/useHouses";
import { invokeHouseReducer, type ReducerResult } from "@/lib/spacetime";

export default function HousesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { houses, isLoading, error } = useHouses();
  const [createResult, setCreateResult] = useState<ReducerResult | null>(null);
  const [joinResult, setJoinResult] = useState<ReducerResult | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    const inviteFromUrl = searchParams.get("invite") ?? "";
    setInviteCode(inviteFromUrl.toUpperCase());
  }, [searchParams]);

  const sortedHouses = useMemo(
    () => [...houses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [houses]
  );

  async function onCreateHouse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const description = String(formData.get("description") ?? "");
    const iconUrl = String(formData.get("iconUrl") ?? "");
    const isPublic = formData.get("isPublic") === "on";
    const themeId = String(formData.get("themeId") ?? "");
    const accentColor = String(formData.get("accentColor") ?? "");

    setIsCreating(true);
    setCreateError(null);
    setCreateResult(null);
    try {
      const reducerResult = await invokeHouseReducer("house.createHouse", {
        name,
        description,
        iconUrl,
        isPublic,
        themeId,
        accentColor
      });
      setCreateResult(reducerResult);
      event.currentTarget.reset();
    } catch (nextError) {
      setCreateError(nextError instanceof Error ? nextError.message : "Failed to create house.");
    } finally {
      setIsCreating(false);
    }
  }

  async function onJoinByInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const code = String(formData.get("inviteCode") ?? "");

    setIsJoining(true);
    setJoinError(null);
    setJoinResult(null);
    try {
      const reducerResult = await invokeHouseReducer("house.joinByInvite", { code });
      setJoinResult(reducerResult);
      setInviteCode("");
      router.replace("/houses#join-house");
    } catch (nextError) {
      setJoinError(nextError instanceof Error ? nextError.message : "Failed to join house.");
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Houses Workspace</h1>
        <p className="text-sm text-slate-300">
          Start here: create a house, join an existing one, then open it to create rooms.
        </p>
      </header>

      <section className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 md:grid-cols-3">
        <article className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Step 1</p>
          <h2 className="mt-1 text-sm font-semibold text-slate-100">Create Your House</h2>
          <p className="mt-1 text-xs text-slate-400">Create a new house with your own theme and visibility.</p>
          <a
            href="#create-house"
            className="mt-3 inline-flex rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-800"
          >
            Go to Create Form
          </a>
        </article>
        <article className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Step 2</p>
          <h2 className="mt-1 text-sm font-semibold text-slate-100">Join With Invite</h2>
          <p className="mt-1 text-xs text-slate-400">Already have a code? Join another house immediately.</p>
          <a
            href="#join-house"
            className="mt-3 inline-flex rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-800"
          >
            Go to Join Form
          </a>
        </article>
        <article className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Step 3</p>
          <h2 className="mt-1 text-sm font-semibold text-slate-100">Open House</h2>
          <p className="mt-1 text-xs text-slate-400">Open a house to create rooms and manage members/settings.</p>
          <a
            href="#house-list"
            className="mt-3 inline-flex rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-800"
          >
            Browse Houses
          </a>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <form
          id="create-house"
          onSubmit={onCreateHouse}
          className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
        >
          <h2 className="text-sm font-semibold tracking-wide text-slate-200">Create House</h2>
          <p className="text-xs text-slate-400">This is your main community container. You can edit details later.</p>

          <div className="space-y-1">
            <label htmlFor="name" className="text-xs uppercase tracking-wide text-slate-400">
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={60}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="description" className="text-xs uppercase tracking-wide text-slate-400">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={280}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="iconUrl" className="text-xs uppercase tracking-wide text-slate-400">
              Icon URL
            </label>
            <input
              id="iconUrl"
              name="iconUrl"
              maxLength={512}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="themeId" className="text-xs uppercase tracking-wide text-slate-400">
              Theme
            </label>
            <select
              id="themeId"
              name="themeId"
              defaultValue="default"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              <option value="default">Default</option>
              <option value="ocean">Ocean</option>
              <option value="forest">Forest</option>
              <option value="ember">Ember</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="accentColor" className="text-xs uppercase tracking-wide text-slate-400">
              Accent Color
            </label>
            <input
              id="accentColor"
              name="accentColor"
              type="color"
              defaultValue="#38bdf8"
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" name="isPublic" className="h-4 w-4 rounded border-slate-600 bg-slate-950" />
            Discoverable (public house)
          </label>

          <button
            type="submit"
            disabled={isCreating}
            className="rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isCreating ? "Creating..." : "Create House"}
          </button>

          {createResult ? <p className="text-sm text-emerald-400">House created.</p> : null}
          {createError ? <p className="text-sm text-rose-400">{createError}</p> : null}
        </form>

        <form
          id="join-house"
          onSubmit={onJoinByInvite}
          className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
        >
          <h2 className="text-sm font-semibold tracking-wide text-slate-200">Join By Invite</h2>
          <p className="text-xs text-slate-400">Paste an invite code from a house owner or admin.</p>
          {inviteCode ? (
            <p className="rounded-md border border-emerald-700/40 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200">
              Invite link detected. Review the code below and join when ready.
            </p>
          ) : null}
          <div className="space-y-1">
            <label htmlFor="inviteCode" className="text-xs uppercase tracking-wide text-slate-400">
              Invite Code
            </label>
            <input
              id="inviteCode"
              name="inviteCode"
              required
              maxLength={32}
              value={inviteCode}
              onChange={(event) => setInviteCode(event.currentTarget.value.toUpperCase())}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm uppercase text-slate-100"
            />
          </div>

          <button
            type="submit"
            disabled={isJoining}
            className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isJoining ? "Joining..." : "Join House"}
          </button>

          {joinResult ? <p className="text-sm text-emerald-400">Joined house successfully.</p> : null}
          {joinError ? <p className="text-sm text-rose-400">{joinError}</p> : null}
        </form>
      </section>

      <section id="house-list" className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold tracking-wide text-slate-200">Your Houses</h2>
        <p className="text-xs text-slate-400">
          Open a house to create rooms and access member/role/invite settings.
        </p>

        {isLoading ? <p className="text-sm text-slate-300">Loading houses...</p> : null}
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        {!isLoading && !error && sortedHouses.length === 0 ? (
          <p className="text-sm text-slate-300">No houses yet. Create one to get started.</p>
        ) : null}

        <ul className="grid gap-3 md:grid-cols-2">
          {sortedHouses.map((house) => (
            <li key={house.id} className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-base font-semibold text-slate-100">{house.name}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                {house.isPublic ? "Public" : "Private"}
              </p>
              <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm text-slate-300">
                {house.description || "No description."}
              </p>
              <Link
                href={`/houses/${house.id}`}
                className="mt-3 inline-flex rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
              >
                Open House
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
