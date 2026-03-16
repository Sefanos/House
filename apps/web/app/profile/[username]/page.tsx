"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { StatusPicker } from "@/components/profile/StatusPicker";
import { useBadges } from "@/hooks/spacetime/useBadges";
import { usePresence } from "@/hooks/spacetime/usePresence";
import { useUserBadges } from "@/hooks/spacetime/useUserBadges";
import { useUsers } from "@/hooks/spacetime/useUsers";
import {
  getCurrentUsername,
  hasSessionToken,
  invokeUserReducer,
  type PresenceStatus
} from "@/lib/spacetime";

type ProfilePageProps = {
  params: {
    username: string;
  };
};

export default function ProfilePage({ params }: ProfilePageProps) {
  const { users, isLoading, error } = useUsers();
  const profile = useMemo(
    () => users.find((candidate) => candidate.username.toLowerCase() === params.username.toLowerCase()),
    [params.username, users]
  );
  const presenceState = usePresence(profile ? [profile.id] : undefined);
  const badgesState = useBadges();
  const userBadgesState = useUserBadges(profile?.id);
  const [viewerUsername, setViewerUsername] = useState<string | null>(null);
  const [viewerHasSession, setViewerHasSession] = useState(false);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileResult, setProfileResult] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [statusResult, setStatusResult] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    setViewerUsername(getCurrentUsername());
    setViewerHasSession(hasSessionToken());
  }, []);

  const profilePresence = useMemo(() => {
    if (!profile) return null;
    return presenceState.presence.find((entry) => entry.userId === profile.id) ?? null;
  }, [presenceState.presence, profile]);

  const canEditProfile = useMemo(() => {
    if (!profile || !viewerHasSession || !viewerUsername) return false;
    return profile.username.toLowerCase() === viewerUsername.toLowerCase();
  }, [profile, viewerHasSession, viewerUsername]);

  const profileBadges = useMemo(() => {
    const badgeById = new Map(badgesState.badges.map((badge) => [badge.id, badge]));
    return [...userBadgesState.userBadges]
      .sort((a, b) => b.grantedAt.localeCompare(a.grantedAt))
      .map((assignment) => {
        const badge = badgeById.get(assignment.badgeId);
        if (!badge) return null;
        return {
          id: assignment.id,
          name: badge.name,
          icon: badge.icon,
          badgeType: badge.badgeType
        };
      })
      .filter((entry): entry is { id: string; name: string; icon: string; badgeType: "earned" | "achievement" | "house" } => entry !== null);
  }, [badgesState.badges, userBadgesState.userBadges]);

  async function onSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !canEditProfile) return;

    const formData = new FormData(event.currentTarget);
    const displayName = String(formData.get("displayName") ?? "");
    const bio = String(formData.get("bio") ?? "");
    const avatarUrl = String(formData.get("avatarUrl") ?? "");

    setIsSavingProfile(true);
    setProfileResult(null);
    setProfileError(null);
    try {
      await invokeUserReducer("user.updateProfile", { displayName, bio, avatarUrl });
      setProfileResult("Profile updated.");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function onSaveStatus(payload: { status: PresenceStatus; customText: string }) {
    if (!canEditProfile) {
      throw new Error("You can only edit your own status.");
    }
    setStatusResult(null);
    setStatusError(null);
    try {
      await invokeUserReducer("user.updateStatus", payload);
      setStatusResult("Status updated.");
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Failed to update status.");
      throw err;
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm text-slate-300">Loading profile...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm text-rose-400">{error}</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-xl font-semibold">User not found</h1>
        <p className="mt-2 text-sm text-slate-300">
          No user with username <span className="font-semibold">@{params.username}</span>.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <ProfileCard
        username={profile.username}
        displayName={profile.displayName}
        avatarUrl={profile.avatarUrl}
        bio={profile.bio}
        status={profilePresence?.status ?? "offline"}
        customText={profilePresence?.customText ?? ""}
        lastSeen={profilePresence?.lastSeen ?? "unknown"}
        badges={profileBadges}
      />
      {badgesState.error ? <p className="text-sm text-rose-400">{badgesState.error}</p> : null}
      {userBadgesState.error ? <p className="text-sm text-rose-400">{userBadgesState.error}</p> : null}

      {canEditProfile ? (
        <>
          <form
            key={profile.id}
            onSubmit={onSaveProfile}
            className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
          >
            <h2 className="text-sm font-semibold tracking-wide text-slate-200">Edit Profile</h2>

            <div className="space-y-1">
              <label htmlFor="displayName" className="text-xs uppercase tracking-wide text-slate-400">
                Display Name
              </label>
              <input
                id="displayName"
                name="displayName"
                defaultValue={profile.displayName}
                maxLength={32}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="avatarUrl" className="text-xs uppercase tracking-wide text-slate-400">
                Avatar URL
              </label>
              <input
                id="avatarUrl"
                name="avatarUrl"
                defaultValue={profile.avatarUrl}
                maxLength={512}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="bio" className="text-xs uppercase tracking-wide text-slate-400">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                defaultValue={profile.bio}
                maxLength={190}
                rows={4}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingProfile}
              className="rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSavingProfile ? "Saving..." : "Save Profile"}
            </button>

            {profileResult ? <p className="text-sm text-emerald-400">{profileResult}</p> : null}
            {profileError ? <p className="text-sm text-rose-400">{profileError}</p> : null}
          </form>

          <StatusPicker
            initialStatus={profilePresence?.status ?? "offline"}
            initialCustomText={profilePresence?.customText ?? ""}
            onSubmit={onSaveStatus}
          />

          {statusResult ? <p className="text-sm text-emerald-400">{statusResult}</p> : null}
          {statusError ? <p className="text-sm text-rose-400">{statusError}</p> : null}

          <p className="text-xs text-slate-400">
            Updates apply to the currently authenticated user session in this browser.
          </p>
        </>
      ) : (
        <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
          <p>This is a public profile view.</p>
          {viewerHasSession ? (
            <p>Sign in as @{profile.username} to edit this profile.</p>
          ) : (
            <p>
              <Link href="/login" className="text-sky-300 hover:text-sky-200">
                Sign in
              </Link>{" "}
              to edit your own profile and status.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
