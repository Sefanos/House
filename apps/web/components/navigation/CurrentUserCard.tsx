"use client";

import Link from "next/link";
import { UserAvatar } from "./UserAvatar";

type CurrentUserCardProps = {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  status: "online" | "idle" | "dnd" | "offline";
  customText?: string;
  activeRoomLabel?: string | null;
  settingsHref?: string | null;
  profileHref: string;
};

function ActionIcon({
  kind
}: {
  kind: "profile" | "settings";
}) {
  if (kind === "profile") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M12 12a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" />
        <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M12 3.75v2.1" />
      <path d="M12 18.15v2.1" />
      <path d="m18.54 5.46-1.49 1.49" />
      <path d="m6.95 17.05-1.49 1.49" />
      <path d="M20.25 12h-2.1" />
      <path d="M5.85 12h-2.1" />
      <path d="m18.54 18.54-1.49-1.49" />
      <path d="m6.95 6.95-1.49-1.49" />
      <path d="M12 15.9A3.9 3.9 0 1 0 12 8.1a3.9 3.9 0 0 0 0 7.8Z" />
    </svg>
  );
}

export function CurrentUserCard({
  username,
  displayName,
  avatarUrl,
  status,
  customText,
  activeRoomLabel,
  settingsHref,
  profileHref
}: CurrentUserCardProps) {
  const statusText = customText?.trim() || activeRoomLabel || status;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-3 shadow-lg shadow-black/20">
      <div className="flex items-center gap-3">
        <UserAvatar
          username={username}
          displayName={displayName}
          avatarUrl={avatarUrl}
          status={status}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-100">{displayName}</p>
          <p className="truncate text-xs text-slate-400">@{username}</p>
          <p className="truncate text-xs capitalize text-slate-500">{statusText}</p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={profileHref}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-700 bg-slate-900 text-slate-200 transition hover:bg-slate-800"
            title="Open profile"
          >
            <ActionIcon kind="profile" />
          </Link>
          {settingsHref ? (
            <Link
              href={settingsHref}
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-700 bg-slate-900 text-slate-200 transition hover:bg-slate-800"
              title="Open house settings"
            >
              <ActionIcon kind="settings" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
