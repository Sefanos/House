"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { CurrentUserCard } from "@/components/navigation/CurrentUserCard";
import { UserAvatar } from "@/components/navigation/UserAvatar";
import { useCurrentUser } from "@/hooks/spacetime/useCurrentUser";
import { usePresence } from "@/hooks/spacetime/usePresence";
import { useUsers } from "@/hooks/spacetime/useUsers";

type DmsLayoutProps = {
  children: ReactNode;
};

export default function DmsLayout({ children }: DmsLayoutProps) {
  const pathname = usePathname();
  const { users, isLoading, error } = useUsers();
  const { currentUser, isLoading: isLoadingCurrentUser, error: currentUserError } = useCurrentUser();
  const { presence, isLoading: isLoadingPresence, error: presenceError } = usePresence();

  const presenceByUserId = useMemo(
    () => new Map(presence.map((entry) => [entry.userId, entry])),
    [presence]
  );

  const contacts = useMemo(
    () =>
      users
        .filter((user) => user.id !== currentUser?.id)
        .map((user) => {
          const entry = presenceByUserId.get(user.id);
          const statusLine = entry?.customText?.trim()
            ? entry.customText
            : entry?.currentRoomId
              ? "In a room"
              : entry?.status
                ? entry.status
                : "offline";

          return {
            ...user,
            status: entry?.status ?? "offline",
            statusLine
          };
        })
        .sort((a, b) => {
          if (a.status !== b.status) {
            if (a.status === "online") return -1;
            if (b.status === "online") return 1;
            if (a.status === "idle") return -1;
            if (b.status === "idle") return 1;
          }
          const aLabel = a.displayName || a.username;
          const bLabel = b.displayName || b.username;
          return aLabel.localeCompare(bLabel);
        }),
    [currentUser?.id, presenceByUserId, users]
  );

  const currentPresence = useMemo(() => {
    if (!currentUser) return null;
    return presenceByUserId.get(currentUser.id) ?? null;
  }, [currentUser, presenceByUserId]);

  return (
    <section className="grid min-h-[calc(100vh-2rem)] gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="flex min-h-[calc(100vh-2rem)] flex-col rounded-3xl border border-slate-800 bg-slate-950/60 p-4 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/75 p-4">
          <h2 className="text-base font-semibold text-slate-100">Direct Messages</h2>
          <p className="mt-1 text-xs text-slate-400">
            {currentUser ? `Signed in as @${currentUser.username}` : "Resolve current user to start DMing."}
          </p>
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-400">
            Search or open a conversation from the list below.
          </div>
        </header>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="mb-3 flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recent DMs</h3>
            <span className="text-xs text-slate-500">{contacts.length}</span>
          </div>

          {isLoading || isLoadingCurrentUser || isLoadingPresence ? (
            <p className="px-1 text-sm text-slate-300">Loading contacts...</p>
          ) : null}
          {error || currentUserError || presenceError ? (
            <p className="px-1 text-sm text-rose-400">{error ?? currentUserError ?? presenceError}</p>
          ) : null}

          {!isLoading &&
          !isLoadingCurrentUser &&
          !isLoadingPresence &&
          !error &&
          !currentUserError &&
          !presenceError &&
          contacts.length === 0 ? (
            <p className="px-1 text-sm text-slate-300">No users available yet.</p>
          ) : null}

          <ul className="space-y-1.5">
            {contacts.map((contact) => {
              const href = `/dms/${contact.id}`;
              const active = pathname === href;

              return (
                <li key={contact.id}>
                  <Link
                    href={href}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
                      active
                        ? "border-rose-500/45 bg-rose-500/12 text-rose-50"
                        : "border-slate-800 bg-slate-950/70 text-slate-200 hover:bg-slate-900"
                    }`}
                  >
                    <UserAvatar
                      username={contact.username}
                      displayName={contact.displayName || contact.username}
                      avatarUrl={contact.avatarUrl}
                      status={contact.status}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {contact.displayName || contact.username}
                      </p>
                      <p className="truncate text-xs capitalize text-slate-400">{contact.statusLine}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-4 pt-2">
          {currentUser ? (
            <CurrentUserCard
              username={currentUser.username}
              displayName={currentUser.displayName || currentUser.username}
              avatarUrl={currentUser.avatarUrl}
              status={currentPresence?.status ?? "offline"}
              customText={currentPresence?.customText}
              profileHref={`/profile/${currentUser.username}`}
            />
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/90 px-3 py-4 text-sm text-slate-400">
              Resolving current user...
            </div>
          )}
        </div>
      </aside>

      <div className="min-w-0">{children}</div>
    </section>
  );
}
