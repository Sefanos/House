"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePresignedUploadQuery } from "@/hooks/query/usePresignedUploadQuery";
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
  const presignMutation = usePresignedUploadQuery();
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "");
    const description = String(formData.get("description") ?? "");
    let iconUrl = String(formData.get("iconUrl") ?? "");
    const isPublic = formData.get("isPublic") === "on";
    const themeId = String(formData.get("themeId") ?? "");
    const accentColor = String(formData.get("accentColor") ?? "");

    setIsCreating(true);
    setCreateError(null);
    setCreateResult(null);
    try {
      if (iconFile) {
        const { uploadUrl, publicUrl } = await presignMutation.mutateAsync({
          fileName: iconFile.name,
          contentType: iconFile.type,
          sizeBytes: iconFile.size
        });
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: iconFile,
          headers: { "Content-Type": iconFile.type }
        });
        if (!uploadResponse.ok) throw new Error("Failed to upload house icon.");
        if (!publicUrl) {
          throw new Error("House icon upload is unavailable because no public asset URL is configured.");
        }
        if (publicUrl) iconUrl = publicUrl;
      }

      const reducerResult = await invokeHouseReducer("house.createHouse", {
        name,
        description,
        iconUrl,
        isPublic,
        themeId,
        accentColor
      });
      setCreateResult(reducerResult);
      form.reset();
      setIconFile(null);
      setIconPreviewUrl(null);
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

      <section className="grid items-start gap-4 lg:grid-cols-2">
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
            <span className="text-xs uppercase tracking-wide text-slate-400">Icon</span>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith("image/")) {
                  setIconFile(file);
                  setIconPreviewUrl(URL.createObjectURL(file));
                }
              }}
              className={`relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed p-6 transition-colors ${
                isDragging 
                  ? "border-sky-500 bg-sky-500/10" 
                  : "border-slate-700 bg-slate-950/50 hover:bg-slate-900"
              }`}
            >
              <input 
                type="hidden" 
                name="iconUrl"
                value=""
              />
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && file.type.startsWith("image/")) {
                    setIconFile(file);
                    setIconPreviewUrl(URL.createObjectURL(file));
                  }
                }}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              />
              {iconPreviewUrl ? (
                <div className="flex flex-col items-center gap-3 relative z-20">
                  <img src={iconPreviewUrl} alt="House Icon Preview" className="h-16 w-16 rounded-2xl object-cover" />
                  <span className="text-xs text-sky-400">Change icon</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400 relative z-20">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="text-xs font-medium">Click or drag image here</span>
                </div>
              )}
            </div>
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

      <div className="flex flex-col gap-4">
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
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-lg font-semibold text-slate-100">
                  {house.iconUrl ? (
                    <img
                      src={house.iconUrl}
                      alt={`${house.name} icon`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (house.name.trim().charAt(0) || "H").toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-slate-100">{house.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                    {house.isPublic ? "Public" : "Private"}
                  </p>
                </div>
              </div>
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
      </div>
      </section>
    </main>
  );
}
