"use client";

import { useRouter } from "next/navigation";
import { type CSSProperties, type PointerEvent as ReactPointerEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getFrequentEmojis, readEmojiUsage, rememberEmojiUsage, type EmojiUsageMap } from "@/components/dms/emojiHistory";
import { MessageList } from "@/components/chat/MessageList";
import { RoomComposer } from "@/components/chat/RoomComposer";
import { ThreadPanel } from "@/components/chat/ThreadPanel";
import { ToastStack, type ChatToast } from "@/components/chat/ToastStack";
import type { RoomRenderableMessage } from "@/components/chat/RoomMessageBubble";
import { UserAvatar } from "@/components/navigation/UserAvatar";
import { VoiceRoomPanel } from "@/components/voice/VoiceRoomPanel";
import { useCurrentUser } from "@/hooks/spacetime/useCurrentUser";
import { useHouseRoles } from "@/hooks/spacetime/useHouseRoles";
import { useMessages } from "@/hooks/spacetime/useMessages";
import { usePermissions } from "@/hooks/spacetime/usePermissions";
import { usePresence } from "@/hooks/spacetime/usePresence";
import { useRoomMembers } from "@/hooks/spacetime/useRoomMembers";
import { useRooms } from "@/hooks/spacetime/useRooms";
import { useUsers } from "@/hooks/spacetime/useUsers";
import { resolveHouseAccess } from "@/lib/houseAccess";
import { invokeMessageReducer, invokeRoomReducer } from "@/lib/spacetime";
import { useCustomizationStore } from "@/store/customization";

type RoomPageProps = {
  params: {
    houseId: string;
    roomId: string;
  };
};

const MIN_CHAT_SIDEBAR_WIDTH = 260;

function RoomSettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path
        d="M12 3.75 14 5l2.5-.5 1.2 2.25 2.3 1.05-.3 2.55L21 12l-1.3 1.65.3 2.55-2.3 1.05-1.2 2.25L14 19l-2 1.25L10 19l-2.5.5-1.2-2.25L4 16.2l.3-2.55L3 12l1.3-1.65L4 7.8l2.3-1.05L7.5 4.5 10 5l2-1.25Z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.1" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="M6 6 18 18" strokeLinecap="round" />
      <path d="M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function SidebarToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <rect x="4" y="5" width="16" height="14" rx="2.5" />
      <path d="M14 5v14" />
      {collapsed ? (
        <path d="m10 9 3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="m13 9-3 3 3 3" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function formatPresenceText(status: "online" | "idle" | "dnd" | "offline", customText: string) {
  if (customText.trim()) return customText;
  if (status === "dnd") return "Do not disturb";
  if (status === "idle") return "Idle";
  if (status === "online") return "Online";
  return "Offline";
}

function createClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function createOptimisticMessage(input: {
  clientId: string;
  roomId: string;
  authorId: string;
  content: string;
  threadParentId: string;
}): RoomRenderableMessage {
  return {
    id: `optimistic:${input.clientId}`,
    clientId: input.clientId,
    roomId: input.roomId,
    authorId: input.authorId,
    content: input.content,
    editedAt: "",
    deletedAt: "",
    threadParentId: input.threadParentId,
    isPinned: false,
    createdAt: new Date().toISOString(),
    attachments: [],
    reactions: [],
    isOptimistic: true,
    optimisticState: "sending",
    sendError: null
  };
}

function matchesConfirmedMessage(optimisticMessage: RoomRenderableMessage, message: RoomRenderableMessage) {
  if (message.authorId !== optimisticMessage.authorId) {
    return false;
  }

  if ((message.threadParentId || "") !== (optimisticMessage.threadParentId || "")) {
    return false;
  }

  if (message.content !== optimisticMessage.content) {
    return false;
  }

  const optimisticTimestamp = Date.parse(optimisticMessage.createdAt);
  const messageTimestamp = Date.parse(message.createdAt);
  if (!Number.isFinite(optimisticTimestamp) || !Number.isFinite(messageTimestamp)) {
    return true;
  }

  return Math.abs(messageTimestamp - optimisticTimestamp) <= 120000;
}

export default function RoomPage({ params }: RoomPageProps) {
  const router = useRouter();
  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const resizeSessionRef = useRef<{ startWidth: number; startX: number } | null>(null);
  const { currentUser } = useCurrentUser();
  const { rooms, isLoading, error } = useRooms(params.houseId);
  const { users } = useUsers();
  const { presence } = usePresence();
  const { members: roomMembers, isLoading: isLoadingRoomMembers, error: roomMembersError } = useRoomMembers(
    params.houseId,
    params.roomId
  );
  const { roles, roomPermissionOverrides } = useHouseRoles(params.houseId);
  const { hasPermission, isOwner } = usePermissions({
    houseId: params.houseId,
    userId: currentUser?.id,
    roomId: params.roomId
  });

  const room = useMemo(
    () => rooms.find((entry) => entry.id === params.roomId) ?? null,
    [params.roomId, rooms]
  );

  const {
    messages,
    isLoading: isLoadingMessages,
    error: messagesError
  } = useMessages(room?.id);

  const [activeThreadParentId, setActiveThreadParentId] = useState<string>("");
  const [optimisticMessages, setOptimisticMessages] = useState<RoomRenderableMessage[]>([]);
  const [pendingSendCount, setPendingSendCount] = useState(0);
  const [isMutatingMessage, setIsMutatingMessage] = useState(false);
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const [isSavingOverride, setIsSavingOverride] = useState(false);
  const [toasts, setToasts] = useState<ChatToast[]>([]);
  const [roomSettingsOpen, setRoomSettingsOpen] = useState(false);
  const [emojiUsage, setEmojiUsage] = useState<EmojiUsageMap>({});
  const isRightSidebarOpen = useCustomizationStore((state) => state.chatSidebarOpen);
  const chatSidebarWidth = useCustomizationStore((state) => state.chatSidebarWidth);
  const toggleRightSidebar = useCustomizationStore((state) => state.toggleChatSidebarOpen);
  const setChatSidebarWidth = useCustomizationStore((state) => state.setChatSidebarWidth);
  const isSendingMessage = pendingSendCount > 0;

  const access = useMemo(() => resolveHouseAccess({ hasPermission, isOwner }), [hasPermission, isOwner]);

  const authorsById = useMemo(() => {
    const presenceByUserId = new Map(presence.map((entry) => [entry.userId, entry]));
    const labels = new Map<
      string,
      {
        name: string;
        username: string;
        avatarUrl: string;
        status: "online" | "idle" | "dnd" | "offline";
      }
    >();
    for (const user of users) {
      labels.set(user.id, {
        name: user.displayName || user.username || user.id,
        username: user.username || user.id,
        avatarUrl: user.avatarUrl,
        status: presenceByUserId.get(user.id)?.status ?? "offline"
      });
    }
    return labels;
  }, [presence, users]);

  const roomOverrides = useMemo(
    () => (room ? roomPermissionOverrides.filter((override) => override.roomId === room.id) : []),
    [room, roomPermissionOverrides]
  );

  const roleNameById = useMemo(() => {
    const names = new Map<string, string>();
    for (const role of roles) {
      names.set(role.id, role.name);
    }
    return names;
  }, [roles]);

  useEffect(() => {
    setOptimisticMessages([]);
    setPendingSendCount(0);
  }, [room?.id]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!resizeSessionRef.current || typeof window === "undefined") {
        return;
      }

      const maxWidth = Math.min(560, Math.max(MIN_CHAT_SIDEBAR_WIDTH, window.innerWidth - 420));
      const nextHeight = Math.min(
        maxWidth,
        Math.max(MIN_CHAT_SIDEBAR_WIDTH, resizeSessionRef.current.startWidth - (event.clientX - resizeSessionRef.current.startX))
      );
      setChatSidebarWidth(nextHeight);
    }

    function stopResize() {
      resizeSessionRef.current = null;
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
    };
  }, [setChatSidebarWidth]);

  useEffect(() => {
    function clampToViewport() {
      if (typeof window === "undefined") {
        return;
      }

      const maxWidth = Math.min(560, Math.max(MIN_CHAT_SIDEBAR_WIDTH, window.innerWidth - 420));
      setChatSidebarWidth(Math.min(chatSidebarWidth, maxWidth));
    }

    clampToViewport();
    window.addEventListener("resize", clampToViewport);
    return () => window.removeEventListener("resize", clampToViewport);
  }, [chatSidebarWidth, setChatSidebarWidth]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    setOptimisticMessages((current) => {
      const usedMessageIds = new Set<string>();
      let changed = false;
      const nextMessages = current.filter((optimisticMessage) => {
        if (optimisticMessage.optimisticState === "failed") {
          return true;
        }

        const match = messages.find((message) => {
          if (usedMessageIds.has(message.id)) {
            return false;
          }

          return matchesConfirmedMessage(optimisticMessage, message);
        });

        if (!match) {
          return true;
        }

        usedMessageIds.add(match.id);
        changed = true;
        return false;
      });

      return changed ? nextMessages : current;
    });
  }, [messages]);

  const visibleMessages = useMemo(() => {
    const nextMessages: RoomRenderableMessage[] = [...messages, ...optimisticMessages];
    nextMessages.sort((left, right) => {
      const byCreatedAt = left.createdAt.localeCompare(right.createdAt);
      if (byCreatedAt !== 0) {
        return byCreatedAt;
      }

      if (Boolean(left.isOptimistic) !== Boolean(right.isOptimistic)) {
        return left.isOptimistic ? 1 : -1;
      }

      return left.id.localeCompare(right.id);
    });
    return nextMessages;
  }, [messages, optimisticMessages]);

  const parentMessage = useMemo(
    () => visibleMessages.find((message) => message.id === activeThreadParentId) ?? null,
    [activeThreadParentId, visibleMessages]
  );
  const threadMessages = useMemo(
    () =>
      activeThreadParentId
        ? visibleMessages.filter((message) => message.threadParentId === activeThreadParentId)
        : [],
    [activeThreadParentId, visibleMessages]
  );

  useEffect(() => {
    if (!activeThreadParentId) return;
    if (!visibleMessages.some((message) => message.id === activeThreadParentId)) {
      setActiveThreadParentId("");
    }
  }, [activeThreadParentId, visibleMessages]);

  useEffect(() => {
    const container = messageScrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [visibleMessages.length]);

  useEffect(() => {
    function syncFromHash() {
      if (typeof window === "undefined") return;
      setRoomSettingsOpen(window.location.hash === "#room-settings");
    }

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  useEffect(() => {
    if (!roomSettingsOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setRoomSettingsOpen(false);
        if (typeof window !== "undefined" && window.location.hash === "#room-settings") {
          window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [roomSettingsOpen]);

  useEffect(() => {
    setEmojiUsage(readEmojiUsage(currentUser?.id));
  }, [currentUser?.id]);

  function setRoomSettingsVisibility(open: boolean) {
    setRoomSettingsOpen(open);

    if (typeof window === "undefined") {
      return;
    }

    const nextHash = open ? "#room-settings" : "";
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${nextHash}`);
  }

  function rememberEmoji(emoji: string) {
    setEmojiUsage((current) => rememberEmojiUsage(currentUser?.id, current, emoji));
  }

  function startSidebarResize(event: ReactPointerEvent<HTMLButtonElement>) {
    resizeSessionRef.current = {
      startWidth: chatSidebarWidth,
      startX: event.clientX
    };
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  }

  const dismissToast = useCallback((toastId: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const pushToast = useCallback((toast: Omit<ChatToast, "id"> & { id?: string }) => {
    const toastId = toast.id ?? createClientId();
    setToasts((current) => [...current.filter((item) => item.id !== toastId), { ...toast, id: toastId }]);
    return toastId;
  }, []);

  const updateToast = useCallback((toastId: string, patch: Partial<Omit<ChatToast, "id">>) => {
    setToasts((current) =>
      current.map((toast) => (toast.id === toastId ? { ...toast, ...patch } : toast))
    );
  }, []);

  async function runToastMutation(input: {
    loadingTitle: string;
    successTitle: string;
    errorFallback: string;
    action: () => Promise<void>;
  }) {
    const toastId = pushToast({
      tone: "loading",
      title: input.loadingTitle
    });

    try {
      await input.action();
      updateToast(toastId, {
        tone: "success",
        title: input.successTitle
      });
    } catch (error) {
      updateToast(toastId, {
        tone: "error",
        title: normalizeError(error, input.errorFallback)
      });
      throw error;
    }
  }

  async function onSendMessage(content: string, threadParentId?: string) {
    if (!room || !currentUser) {
      const message = !room ? "This room is not ready yet." : "Your profile is still loading.";
      pushToast({
        tone: "error",
        title: message
      });
      throw new Error(message);
    }

    const clientId = createClientId();
    const optimisticMessage = createOptimisticMessage({
      clientId,
      roomId: room.id,
      authorId: currentUser.id,
      content,
      threadParentId: threadParentId ?? ""
    });

    setOptimisticMessages((current) => [...current, optimisticMessage]);
    setPendingSendCount((current) => current + 1);

    void invokeMessageReducer("messages.sendMessage", {
      roomId: room.id,
      content,
      threadParentId: threadParentId ?? ""
    })
      .catch((error) => {
        setOptimisticMessages((current) =>
          current.map((message) =>
            message.clientId === clientId
              ? {
                  ...message,
                  optimisticState: "failed",
                  sendError: normalizeError(error, "Failed to send message.")
                }
              : message
          )
        );
      })
      .finally(() => {
        setPendingSendCount((current) => Math.max(0, current - 1));
      });
  }

  async function onEditMessage(messageId: string, content: string) {
    setIsMutatingMessage(true);
    try {
      await runToastMutation({
        loadingTitle: "Saving message...",
        successTitle: "Message updated.",
        errorFallback: "Failed to edit message.",
        action: async () => {
          await invokeMessageReducer("messages.editMessage", {
            messageId,
            content
          });
        }
      });
    } finally {
      setIsMutatingMessage(false);
    }
  }

  async function onDeleteMessage(messageId: string) {
    setIsMutatingMessage(true);
    try {
      await runToastMutation({
        loadingTitle: "Deleting message...",
        successTitle: "Message deleted.",
        errorFallback: "Failed to delete message.",
        action: async () => {
          await invokeMessageReducer("messages.deleteMessage", { messageId });
        }
      });
    } finally {
      setIsMutatingMessage(false);
    }
  }

  async function onAddReaction(messageId: string, emoji: string) {
    setIsMutatingMessage(true);
    try {
      await invokeMessageReducer("messages.addReaction", { messageId, emoji });
    } catch (error) {
      pushToast({
        tone: "error",
        title: normalizeError(error, "Failed to add reaction.")
      });
      throw error;
    } finally {
      setIsMutatingMessage(false);
    }
  }

  async function onRemoveReaction(messageId: string, emoji: string) {
    setIsMutatingMessage(true);
    try {
      await invokeMessageReducer("messages.removeReaction", { messageId, emoji });
    } catch (error) {
      pushToast({
        tone: "error",
        title: normalizeError(error, "Failed to remove reaction.")
      });
      throw error;
    } finally {
      setIsMutatingMessage(false);
    }
  }

  async function onToggleReaction(messageId: string, emoji: string, reactedByCurrentUser: boolean) {
    if (reactedByCurrentUser) {
      await onRemoveReaction(messageId, emoji);
      return;
    }

    await onAddReaction(messageId, emoji);
  }

  async function onUpdateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!room) return;

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const type = String(formData.get("type") ?? "chat");
    const description = String(formData.get("description") ?? "");
    const position = Number(formData.get("position") ?? room.position);
    const slowmodeSeconds = Number(formData.get("slowmodeSeconds") ?? room.slowmodeSeconds);

    setIsSavingRoom(true);
    try {
      await runToastMutation({
        loadingTitle: "Saving room...",
        successTitle: "Room updated.",
        errorFallback: "Failed to update room.",
        action: async () => {
          await invokeRoomReducer("rooms.updateRoom", {
            roomId: room.id,
            name,
            type: type === "voice" ? "voice" : "chat",
            description,
            position: Number.isFinite(position) ? position : room.position,
            slowmodeSeconds: Number.isFinite(slowmodeSeconds) ? slowmodeSeconds : room.slowmodeSeconds
          });
        }
      });
    } finally {
      setIsSavingRoom(false);
    }
  }

  async function onDeleteRoom() {
    if (!room) return;
    if (typeof window !== "undefined" && !window.confirm(`Delete #${room.name}? This can't be undone.`)) {
      return;
    }
    setIsDeletingRoom(true);
    try {
      await runToastMutation({
        loadingTitle: "Deleting room...",
        successTitle: "Room deleted.",
        errorFallback: "Failed to delete room.",
        action: async () => {
          await invokeRoomReducer("rooms.deleteRoom", { roomId: room.id });
        }
      });
      setRoomSettingsVisibility(false);
      router.replace(`/houses/${params.houseId}`);
    } finally {
      setIsDeletingRoom(false);
    }
  }

  async function onSetRoomOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!room) return;

    const formData = new FormData(event.currentTarget);
    const roleId = String(formData.get("overrideRoleId") ?? "");
    const allow = String(formData.get("overrideAllow") ?? "0");
    const deny = String(formData.get("overrideDeny") ?? "0");

    setIsSavingOverride(true);
    try {
      await runToastMutation({
        loadingTitle: "Saving override...",
        successTitle: "Room permission override saved.",
        errorFallback: "Failed to save room override.",
        action: async () => {
          await invokeRoomReducer("rooms.setRoomPermissionOverride", {
            roomId: room.id,
            roleId,
            allow,
            deny
          });
        }
      });
      event.currentTarget.reset();
    } finally {
      setIsSavingOverride(false);
    }
  }

  if (isLoading) {
    return (
      <section>
        <p className="text-sm text-slate-300">Loading room...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <p className="text-sm text-rose-400">{error}</p>
      </section>
    );
  }

  if (!room) {
    return (
      <section className="space-y-2">
        <h4 className="text-lg font-semibold">Room not found</h4>
        <p className="text-sm text-slate-300">No room exists with id {params.roomId}.</p>
      </section>
    );
  }

  const isChatRoom = room.type === "chat";
  const quickReactionEmojis = getFrequentEmojis(emojiUsage, 4);
  const threadCount = visibleMessages.filter((message) => Boolean(message.threadParentId)).length;
  const roomTopic =
    room.description?.trim() ||
    "A richer text room for live chat, quick reactions, and side threads.";
  const showRightSidebar = Boolean(parentMessage) || isRightSidebarOpen;
  const chatLayoutStyle = showRightSidebar
    ? ({ ["--chat-sidebar-width" as string]: `${chatSidebarWidth}px` } as CSSProperties)
    : undefined;

  return (
    <section className="space-y-4">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {isChatRoom ? (
        <section
          className={`grid gap-4 ${showRightSidebar ? "xl:grid-cols-[minmax(0,1fr)_0.875rem_var(--chat-sidebar-width)] xl:gap-2" : ""}`}
          style={chatLayoutStyle}
        >
          <div className="flex h-[calc(100vh-2.5rem)] min-h-[40rem] flex-col overflow-hidden rounded-[32px] border border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(2,6,23,0.98))] shadow-2xl shadow-black/20">
            <header className="border-b border-slate-800 bg-slate-950/70 px-4 py-4 backdrop-blur">
              <div className="flex flex-wrap items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-3xl border border-slate-800 bg-slate-900/80 text-lg font-semibold text-sky-300">
                  #
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-xl font-semibold text-slate-100">#{room.name}</h2>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <div className="hidden items-center gap-2 xl:flex">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-2 text-xs text-slate-400">
                      {visibleMessages.length} messages
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-2 text-xs text-slate-400">
                      {threadCount} thread replies
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-2 text-xs text-slate-400">
                      {roomMembers.length} active now
                    </div>
                  </div>
                  {access.canManageRooms ? (
                    <button
                      type="button"
                      onClick={() => setRoomSettingsVisibility(true)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/[0.08]"
                    >
                      <RoomSettingsIcon />
                      Manage room
                    </button>
                  ) : null}
                  {!parentMessage ? (
                    <button
                      type="button"
                      onClick={toggleRightSidebar}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
                      aria-pressed={isRightSidebarOpen}
                    >
                      <SidebarToggleIcon collapsed={!isRightSidebarOpen} />
                      {isRightSidebarOpen ? "Hide sidebar" : "Show sidebar"}
                    </button>
                  ) : null}
                </div>
              </div>
            </header>

            <div ref={messageScrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {isLoadingMessages ? <p className="text-sm text-slate-300">Loading messages...</p> : null}
              {messagesError ? <p className="text-sm text-rose-400">{messagesError}</p> : null}

              {!isLoadingMessages && !messagesError ? (
                <MessageList
                  messages={visibleMessages}
                  authorsById={authorsById}
                  currentUserId={currentUser?.id}
                  isBusy={isMutatingMessage}
                  quickReactionEmojis={quickReactionEmojis}
                  onRememberEmoji={rememberEmoji}
                  onOpenThread={setActiveThreadParentId}
                  onEditMessage={onEditMessage}
                  onDeleteMessage={onDeleteMessage}
                  onToggleReaction={onToggleReaction}
                />
              ) : null}
            </div>

            <div className="border-t border-slate-800/70 px-3 py-3">
              <RoomComposer
                roomLabel={room.name}
                isSending={isSendingMessage}
                emojiUsage={emojiUsage}
                onRememberEmoji={rememberEmoji}
                onSendMessage={(content) => onSendMessage(content)}
              />
            </div>
          </div>

          {showRightSidebar ? (
            <>
              <div className="hidden xl:flex h-[calc(100vh-2.5rem)] min-h-[40rem] items-center justify-center">
                <button
                  type="button"
                  onPointerDown={startSidebarResize}
                  className="group flex h-full w-3 cursor-col-resize items-center justify-center"
                  aria-label="Resize sidebar width"
                >
                  <span className="h-24 w-1.5 rounded-full bg-slate-700 transition group-hover:bg-sky-300" />
                </button>
              </div>
              <div className="flex h-[calc(100vh-2.5rem)] min-h-[40rem] flex-col gap-4">
              {parentMessage ? (
              <ThreadPanel
                roomName={room.name}
                parentMessage={parentMessage}
                threadMessages={threadMessages}
                authorsById={authorsById}
                currentUserId={currentUser?.id}
                isSending={isSendingMessage}
                isBusy={isMutatingMessage}
                emojiUsage={emojiUsage}
                onClose={() => setActiveThreadParentId("")}
                onRememberEmoji={rememberEmoji}
                onSendMessage={onSendMessage}
                onEditMessage={onEditMessage}
                onDeleteMessage={onDeleteMessage}
                onToggleReaction={onToggleReaction}
              />
              ) : (
                <>
                  <aside className="rounded-[32px] border border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(2,6,23,0.96))] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">About</p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-100">#{room.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{roomTopic}</p>

                    <div className="mt-4 grid gap-2.5">
                      <div className="rounded-[22px] border border-slate-800 bg-slate-950/70 px-3.5 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Room activity</p>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-300">
                          <div>
                            <p className="text-lg font-semibold text-white">{visibleMessages.length}</p>
                            <p className="text-xs text-slate-500">messages</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-white">{threadCount}</p>
                            <p className="text-xs text-slate-500">thread replies</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[22px] border border-slate-800 bg-slate-950/70 px-3.5 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Posting rules</p>
                        <p className="mt-3 text-sm text-slate-300">
                          Slowmode is set to <span className="font-semibold text-white">{room.slowmodeSeconds}s</span>.
                          Use threads for side conversations and quick reactions for fast feedback.
                        </p>
                      </div>
                    </div>
                  </aside>

                  <aside className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(2,6,23,0.96))]">
                    <header className="border-b border-slate-800 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                            Active now
                          </p>
                          <h3 className="mt-1 text-base font-semibold text-slate-100">{roomMembers.length} members</h3>
                        </div>
                        {isLoadingRoomMembers ? (
                          <span className="text-xs text-slate-500">Syncing...</span>
                        ) : null}
                      </div>
                    </header>

                    <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5">
                      {roomMembersError ? <p className="text-sm text-rose-400">{roomMembersError}</p> : null}

                      {!roomMembersError && roomMembers.length === 0 ? (
                        <div className="rounded-[22px] border border-dashed border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-400">
                          Nobody else is actively viewing this room right now.
                        </div>
                      ) : null}

                      <div className="space-y-3">
                        {roomMembers.map((member) => (
                          <div
                            key={member.userId}
                            className="flex items-center gap-3 rounded-[24px] border border-slate-800 bg-slate-950/70 px-3 py-3"
                          >
                            <UserAvatar
                              username={member.username}
                              displayName={member.displayName}
                              avatarUrl={member.avatarUrl}
                              status={member.status}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-100">{member.displayName}</p>
                              <p className="truncate text-xs text-slate-500">
                                {formatPresenceText(member.status, member.customText)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </aside>
                </>
              )}
            </div>
            </>
          ) : null}
        </section>
      ) : (
        <div className="space-y-4">
          <VoiceRoomPanel
            houseId={params.houseId}
            roomId={room.id}
            roomName={room.name}
            roomDescription={room.description}
            variant="main"
          />
        </div>
      )}

      {access.canManageRooms && roomSettingsOpen ? (
        <div className="fixed inset-0 z-[70]" aria-labelledby="room-settings-title" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close room settings"
            onClick={() => setRoomSettingsVisibility(false)}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          <aside
            id="room-settings"
            className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-[#060914] p-6 shadow-2xl shadow-black/40"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">Privileged controls</p>
                <h5 id="room-settings-title" className="mt-2 text-2xl font-semibold text-white">
                  Manage #{room.name}
                </h5>
                <p className="mt-2 max-w-lg text-sm leading-6 text-slate-300">
                  Hidden by default for a cleaner room experience. Only members with room management access can open
                  this panel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRoomSettingsVisibility(false)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/[0.08]"
              >
                <CloseIcon />
                Close
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-4">
                  <h6 className="text-sm font-semibold text-white">Room details</h6>
                  <p className="mt-1 text-sm text-slate-400">Update how this room appears to members.</p>
                </div>

                <form onSubmit={onUpdateRoom} className="space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="name" className="text-xs uppercase tracking-wide text-slate-400">
                      Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      required
                      maxLength={60}
                      defaultValue={room.name}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="type" className="text-xs uppercase tracking-wide text-slate-400">
                      Type
                    </label>
                    <select
                      id="type"
                      name="type"
                      defaultValue={room.type}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-slate-100"
                    >
                      <option value="chat">Chat</option>
                      <option value="voice">Voice</option>
                    </select>
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
                      defaultValue={room.description}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-slate-100"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label htmlFor="position" className="text-xs uppercase tracking-wide text-slate-400">
                        Position
                      </label>
                      <input
                        id="position"
                        name="position"
                        type="number"
                        min={0}
                        defaultValue={room.position}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-slate-100"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="slowmodeSeconds" className="text-xs uppercase tracking-wide text-slate-400">
                        Slowmode Seconds
                      </label>
                      <input
                        id="slowmodeSeconds"
                        name="slowmodeSeconds"
                        type="number"
                        min={0}
                        max={21600}
                        defaultValue={room.slowmodeSeconds}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={isSavingRoom}
                      className="rounded-full bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSavingRoom ? "Saving..." : "Save room"}
                    </button>
                    <button
                      type="button"
                      onClick={onDeleteRoom}
                      disabled={isDeletingRoom}
                      className="rounded-full bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isDeletingRoom ? "Deleting..." : "Delete room"}
                    </button>
                  </div>
                </form>
              </section>

              {access.canManageRoomOverrides ? (
                <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="mb-4">
                    <h6 className="text-sm font-semibold text-white">Room permission overrides</h6>
                    <p className="mt-1 text-sm text-slate-400">
                      Fine-tune access by role without exposing these controls to everyone.
                    </p>
                  </div>

                  <form onSubmit={onSetRoomOverride} className="grid gap-3 sm:grid-cols-2">
                    <select
                      name="overrideRoleId"
                      required
                      defaultValue=""
                      className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-slate-100"
                    >
                      <option value="" disabled>
                        Select role
                      </option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                    <input
                      name="overrideAllow"
                      required
                      defaultValue="0"
                      className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-slate-100"
                      placeholder="Allow bitfield"
                    />
                    <input
                      name="overrideDeny"
                      required
                      defaultValue="0"
                      className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-slate-100"
                      placeholder="Deny bitfield"
                    />
                    <button
                      type="submit"
                      disabled={isSavingOverride}
                      className="rounded-full bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSavingOverride ? "Saving..." : "Save override"}
                    </button>
                  </form>

                  <div className="mt-4 space-y-2">
                    {roomOverrides.map((override) => (
                      <div
                        key={override.id}
                        className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-200"
                      >
                        <p className="font-medium text-white">{roleNameById.get(override.roleId) ?? override.roleId}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Allow {override.allow} · Deny {override.deny}
                        </p>
                      </div>
                    ))}
                    {roomOverrides.length === 0 ? (
                      <p className="text-sm text-slate-400">No overrides set for this room.</p>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
