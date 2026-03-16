"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ContextMenu, type ContextMenuSection } from "@/components/navigation/ContextMenu";
import { CurrentUserCard } from "@/components/navigation/CurrentUserCard";
import { useCurrentUser } from "@/hooks/spacetime/useCurrentUser";
import { useHouses } from "@/hooks/spacetime/useHouses";
import { useInvites } from "@/hooks/spacetime/useInvites";
import { usePermissions } from "@/hooks/spacetime/usePermissions";
import { usePresence } from "@/hooks/spacetime/usePresence";
import { useRooms } from "@/hooks/spacetime/useRooms";
import { resolveHouseAccess } from "@/lib/houseAccess";
import { invokeHouseReducer, invokeRoomReducer } from "@/lib/spacetime";

type HouseLayoutProps = {
  children: ReactNode;
  params: {
    houseId: string;
  };
};

type MenuState =
  | { kind: "house"; x: number; y: number }
  | { kind: "room"; roomId: string; x: number; y: number }
  | null;

function resolveActiveRoomId(pathname: string): string | null {
  const match = pathname.match(/^\/houses\/[^/]+\/rooms\/([^/]+)/);
  return match?.[1] ?? null;
}

function RoomGlyph({ type }: { type: string }) {
  if (type === "voice") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M12 4.5a3.25 3.25 0 0 1 3.25 3.25v4.5a3.25 3.25 0 1 1-6.5 0v-4.5A3.25 3.25 0 0 1 12 4.5Z" />
        <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0" />
        <path d="M12 17v3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M5 8.5h14" />
      <path d="M5 15.5h14" />
      <path d="m8 4.5-3 15" />
      <path d="m19 4.5-3 15" />
    </svg>
  );
}

function KebabIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

export default function HouseLayout({ children, params }: HouseLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const activeRoomId = useMemo(() => resolveActiveRoomId(pathname), [pathname]);
  const { rooms, isLoading, error } = useRooms(params.houseId);
  const { houses } = useHouses();
  const { invites } = useInvites(params.houseId);
  const { presence } = usePresence();
  const { currentUser } = useCurrentUser();
  const { hasPermission, isOwner } = usePermissions({
    houseId: params.houseId,
    userId: currentUser?.id
  });

  const house = useMemo(
    () => houses.find((entry) => entry.id === params.houseId) ?? null,
    [houses, params.houseId]
  );
  const access = useMemo(() => resolveHouseAccess({ hasPermission, isOwner }), [hasPermission, isOwner]);
  const invitesRef = useRef(invites);
  const [menuState, setMenuState] = useState<MenuState>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [sidebarStatus, setSidebarStatus] = useState<string | null>(null);

  useEffect(() => {
    invitesRef.current = invites;
  }, [invites]);

  const currentPresence = useMemo(() => {
    if (!currentUser) return null;
    return presence.find((entry) => entry.userId === currentUser.id) ?? null;
  }, [currentUser, presence]);

  const housePresence = useMemo(
    () =>
      presence.filter(
        (entry) => entry.currentHouseId === params.houseId && entry.currentRoomId && entry.status !== "offline"
      ),
    [params.houseId, presence]
  );

  const roomOccupancy = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of housePresence) {
      counts.set(entry.currentRoomId, (counts.get(entry.currentRoomId) ?? 0) + 1);
    }
    return counts;
  }, [housePresence]);

  const activePresenceRoomLabel = useMemo(() => {
    if (!currentPresence?.currentRoomId || currentPresence.currentHouseId !== params.houseId) {
      return null;
    }
    const room = rooms.find((entry) => entry.id === currentPresence.currentRoomId);
    return room ? `In ${room.type === "voice" ? "" : "#"}${room.name}` : null;
  }, [currentPresence, params.houseId, rooms]);

  const groupedRooms = useMemo(
    () => ({
      chat: rooms.filter((room) => room.type === "chat"),
      voice: rooms.filter((room) => room.type === "voice")
    }),
    [rooms]
  );

  const selectedRoom = useMemo(() => {
    if (menuState?.kind !== "room") return null;
    return rooms.find((room) => room.id === menuState.roomId) ?? null;
  }, [menuState, rooms]);

  async function waitForInviteCode(previousCodes: Set<string>) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const createdInvite = invitesRef.current.find((invite) => !previousCodes.has(invite.code));
      if (createdInvite) {
        return createdInvite.code;
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    return null;
  }

  async function copyText(value: string) {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return false;
    }
    await navigator.clipboard.writeText(value);
    return true;
  }

  async function createInviteLink() {
    if (!access.canManageInvites) return;

    const previousCodes = new Set(invitesRef.current.map((invite) => invite.code));
    setCreateError(null);
    setSidebarStatus(null);

    try {
      await invokeHouseReducer("house.createInvite", {
        houseId: params.houseId
      });

      const nextCode = await waitForInviteCode(previousCodes);
      if (!nextCode) {
        setSidebarStatus("Invite created. Open house settings to view it.");
        return;
      }

      const inviteLink =
        typeof window === "undefined"
          ? nextCode
          : `${window.location.origin}/houses?invite=${encodeURIComponent(nextCode)}`;
      const copied = await copyText(inviteLink).catch(() => false);
      setSidebarStatus(copied ? "Invite link copied to clipboard." : `Invite created: ${nextCode}`);
    } catch (nextError) {
      setCreateError(nextError instanceof Error ? nextError.message : "Failed to create invite link.");
    }
  }

  async function onCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const type = String(formData.get("type") ?? "chat");
    const description = String(formData.get("description") ?? "");

    setIsCreating(true);
    setCreateError(null);
    setSidebarStatus(null);

    try {
      await invokeRoomReducer("rooms.createRoom", {
        houseId: params.houseId,
        name,
        type: type === "voice" ? "voice" : "chat",
        description
      });
      setSidebarStatus("Room created.");
      setShowCreateRoom(false);
      event.currentTarget.reset();
    } catch (nextError) {
      setCreateError(nextError instanceof Error ? nextError.message : "Failed to create room.");
    } finally {
      setIsCreating(false);
    }
  }

  const houseMenuSections = useMemo<ContextMenuSection[]>(
    () => [
      {
        id: "house-navigation",
        actions: [
          {
            id: "open-house",
            label: "Open house",
            onSelect: () => router.push(`/houses/${params.houseId}`)
          },
          ...(access.canOpenHouseSettings
            ? [
                {
                  id: "house-settings",
                  label: "House settings",
                  onSelect: () => router.push(`/houses/${params.houseId}#house-settings`)
                }
              ]
            : [])
        ]
      },
      {
        id: "house-actions",
        label: "Actions",
        actions: [
          ...(access.canManageInvites
            ? [
                {
                  id: "create-invite-link",
                  label: "Create invite link",
                  onSelect: () => createInviteLink()
                }
              ]
            : []),
          ...(access.canCreateRooms
            ? [
                {
                  id: "create-room",
                  label: "Create room",
                  onSelect: () => setShowCreateRoom(true)
                }
              ]
            : []),
          {
            id: "copy-house-id",
            label: "Copy house ID",
            onSelect: async () => {
              const copied = await copyText(params.houseId).catch(() => false);
              setSidebarStatus(copied ? "House ID copied." : params.houseId);
            }
          }
        ]
      }
    ],
    [access.canCreateRooms, access.canManageInvites, access.canOpenHouseSettings, params.houseId, router]
  );

  const roomMenuSections = useMemo<ContextMenuSection[]>(() => {
    if (!selectedRoom) return [];

    return [
      {
        id: "room-navigation",
        actions: [
          {
            id: "open-room",
            label: `Open ${selectedRoom.type === "voice" ? "voice" : "text"} room`,
            onSelect: () => router.push(`/houses/${params.houseId}/rooms/${selectedRoom.id}`)
          },
          ...(access.canManageRooms
            ? [
                {
                  id: "room-settings",
                  label: "Room settings",
                  onSelect: () => router.push(`/houses/${params.houseId}/rooms/${selectedRoom.id}#room-settings`)
                }
              ]
            : [])
        ]
      },
      {
        id: "room-actions",
        label: "Actions",
        actions: [
          ...(access.canManageInvites
            ? [
                {
                  id: "room-invite-link",
                  label: "Create invite link",
                  onSelect: () => createInviteLink()
                }
              ]
            : []),
          {
            id: "copy-room-id",
            label: "Copy room ID",
            onSelect: async () => {
              const copied = await copyText(selectedRoom.id).catch(() => false);
              setSidebarStatus(copied ? "Room ID copied." : selectedRoom.id);
            }
          }
        ]
      }
    ];
  }, [access.canManageInvites, access.canManageRooms, params.houseId, router, selectedRoom]);

  const activeMenuSections = menuState?.kind === "house" ? houseMenuSections : roomMenuSections;

  return (
    <section className="grid min-h-[calc(100vh-2rem)] grid-cols-1 gap-3 lg:grid-cols-[292px_minmax(0,1fr)]">
      <aside className="flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/60 p-3 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
        <div
          className="rounded-3xl border border-slate-800 bg-slate-900/75 p-3.5"
          onContextMenu={(event) => {
            event.preventDefault();
            setMenuState({ kind: "house", x: event.clientX, y: event.clientY });
          }}
        >
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-700 bg-slate-950 text-lg font-semibold text-slate-100">
              {(house?.name.trim().charAt(0) || "H").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold text-slate-100">{house?.name ?? "House Workspace"}</p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                {house?.description || "Right click this card for house actions and settings."}
              </p>
            </div>
            <button
              type="button"
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setMenuState({ kind: "house", x: rect.right - 8, y: rect.bottom + 8 });
              }}
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-700 bg-slate-950 text-slate-300 transition hover:bg-slate-800"
              aria-label="Open house actions"
            >
              <KebabIcon />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {access.canCreateRooms ? (
              <button
                type="button"
                onClick={() => setShowCreateRoom((value) => !value)}
                className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400"
              >
                {showCreateRoom ? "Close room form" : "Create room"}
              </button>
            ) : null}
            {access.canOpenHouseSettings ? (
              <Link
                href={`/houses/${params.houseId}#house-settings`}
                className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
              >
                House settings
              </Link>
            ) : null}
          </div>
        </div>

        {showCreateRoom && access.canCreateRooms ? (
          <form onSubmit={onCreateRoom} className="mt-3 space-y-3 rounded-3xl border border-slate-800 bg-slate-900/70 p-3.5">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Create room</h2>
              <p className="mt-1 text-xs text-slate-400">Text rooms for chat, voice rooms for live calls.</p>
            </div>
            <input
              name="name"
              required
              maxLength={60}
              placeholder="Room name"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
            <select
              name="type"
              defaultValue="chat"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              <option value="chat">Text room</option>
              <option value="voice">Voice room</option>
            </select>
            <textarea
              name="description"
              rows={2}
              maxLength={280}
              placeholder="Description (optional)"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
            <button
              type="submit"
              disabled={isCreating}
              className="w-full rounded-xl bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isCreating ? "Creating..." : "Create room"}
            </button>
          </form>
        ) : null}

        {sidebarStatus ? (
          <p className="mt-3 rounded-2xl border border-emerald-700/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
            {sidebarStatus}
          </p>
        ) : null}
        {createError ? (
          <p className="mt-3 rounded-2xl border border-rose-700/50 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
            {createError}
          </p>
        ) : null}

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-4">
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Text Rooms</h2>
                <span className="text-xs text-slate-500">{groupedRooms.chat.length}</span>
              </div>
              {isLoading ? <p className="text-xs text-slate-400">Loading rooms...</p> : null}
              {!isLoading && !error && groupedRooms.chat.length === 0 ? (
                <p className="text-xs text-slate-500">No text rooms yet.</p>
              ) : null}
              <ul className="space-y-1.5">
                {groupedRooms.chat.map((room) => {
                  const isActive = room.id === activeRoomId;
                  const occupancy = roomOccupancy.get(room.id) ?? 0;
                  return (
                    <li key={room.id}>
                      <div
                        className={`group flex items-center gap-2 rounded-2xl border px-2 py-1.5 transition ${
                          isActive
                            ? "border-sky-400/50 bg-sky-500/12 text-sky-100"
                            : "border-slate-800 bg-slate-950/70 text-slate-200 hover:bg-slate-900"
                        }`}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setMenuState({ kind: "room", roomId: room.id, x: event.clientX, y: event.clientY });
                        }}
                      >
                        <Link
                          href={`/houses/${params.houseId}/rooms/${room.id}`}
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1 py-1"
                        >
                          <span className={isActive ? "text-sky-200" : "text-slate-500"}>
                            <RoomGlyph type={room.type} />
                          </span>
                          <span className="truncate text-sm font-medium">{room.name}</span>
                        </Link>
                        {occupancy > 0 ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-semibold text-emerald-200"
                            title={`${occupancy} member${occupancy === 1 ? "" : "s"} currently in this room`}
                          >
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            {occupancy}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={(event) => {
                            const rect = event.currentTarget.getBoundingClientRect();
                            setMenuState({ kind: "room", roomId: room.id, x: rect.right - 8, y: rect.bottom + 8 });
                          }}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
                          aria-label={`Open actions for ${room.name}`}
                        >
                          <KebabIcon />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Voice Rooms</h2>
                <span className="text-xs text-slate-500">{groupedRooms.voice.length}</span>
              </div>
              {!isLoading && !error && groupedRooms.voice.length === 0 ? (
                <p className="text-xs text-slate-500">No voice rooms yet.</p>
              ) : null}
              <ul className="space-y-1.5">
                {groupedRooms.voice.map((room) => {
                  const isActive = room.id === activeRoomId;
                  const occupancy = roomOccupancy.get(room.id) ?? 0;
                  return (
                    <li key={room.id}>
                      <div
                        className={`group flex items-center gap-2 rounded-2xl border px-2 py-1.5 transition ${
                          isActive
                            ? "border-emerald-400/50 bg-emerald-500/12 text-emerald-100"
                            : "border-slate-800 bg-slate-950/70 text-slate-200 hover:bg-slate-900"
                        }`}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setMenuState({ kind: "room", roomId: room.id, x: event.clientX, y: event.clientY });
                        }}
                      >
                        <Link
                          href={`/houses/${params.houseId}/rooms/${room.id}`}
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1 py-1"
                        >
                          <span className={isActive ? "text-emerald-200" : "text-slate-500"}>
                            <RoomGlyph type={room.type} />
                          </span>
                          <span className="truncate text-sm font-medium">{room.name}</span>
                        </Link>
                        {occupancy > 0 ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-semibold text-emerald-200"
                            title={`${occupancy} member${occupancy === 1 ? "" : "s"} currently in this room`}
                          >
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            {occupancy}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={(event) => {
                            const rect = event.currentTarget.getBoundingClientRect();
                            setMenuState({ kind: "room", roomId: room.id, x: rect.right - 8, y: rect.bottom + 8 });
                          }}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
                          aria-label={`Open actions for ${room.name}`}
                        >
                          <KebabIcon />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          </div>
        </div>

        <div className="mt-3 pt-1">
          {currentUser ? (
            <CurrentUserCard
              username={currentUser.username}
              displayName={currentUser.displayName || currentUser.username}
              avatarUrl={currentUser.avatarUrl}
              status={currentPresence?.status ?? "offline"}
              customText={currentPresence?.customText}
              activeRoomLabel={activePresenceRoomLabel}
              profileHref={`/profile/${currentUser.username}`}
              settingsHref={access.canOpenHouseSettings ? `/houses/${params.houseId}#house-settings` : null}
            />
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/90 px-3 py-4 text-sm text-slate-400">
              Resolving current user...
            </div>
          )}
        </div>
      </aside>

      <section className="min-w-0 rounded-3xl border border-slate-800 bg-slate-900/60 p-3">
        {children}
      </section>

      <ContextMenu
        open={menuState !== null && activeMenuSections.length > 0}
        x={menuState?.x ?? 0}
        y={menuState?.y ?? 0}
        sections={activeMenuSections}
        onClose={() => setMenuState(null)}
      />
    </section>
  );
}
