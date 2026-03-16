"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DmComposer } from "@/components/dms/DmComposer";
import { DmMessageBubble } from "@/components/dms/DmMessageBubble";
import { getFrequentEmojis, readEmojiUsage, rememberEmojiUsage, type EmojiUsageMap } from "@/components/dms/emojiHistory";
import { UserAvatar } from "@/components/navigation/UserAvatar";
import { useDmLocalReactions } from "@/hooks/useDmLocalReactions";
import { useCurrentUser } from "@/hooks/spacetime/useCurrentUser";
import { useDMs } from "@/hooks/spacetime/useDMs";
import { usePresence } from "@/hooks/spacetime/usePresence";
import { useUsers } from "@/hooks/spacetime/useUsers";
import { invokeDmReducer } from "@/lib/spacetime";

type DmConversationPageProps = {
  params: {
    userId: string;
  };
};

function formatDayDivider(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric"
  }).format(new Date(value));
}

function formatProfileStatus(status: "online" | "idle" | "dnd" | "offline", customText: string) {
  if (customText.trim()) return customText;
  if (status === "dnd") return "Do not disturb";
  if (status === "idle") return "Idle";
  if (status === "online") return "Online";
  return "Offline";
}

export default function DmConversationPage({ params }: DmConversationPageProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { users } = useUsers();
  const { presence } = usePresence();
  const { currentUser, isLoading: isLoadingCurrentUser, error: currentUserError } = useCurrentUser();
  const otherUser = useMemo(() => users.find((entry) => entry.id === params.userId) ?? null, [users, params.userId]);
  const otherPresence = useMemo(
    () => presence.find((entry) => entry.userId === params.userId) ?? null,
    [params.userId, presence]
  );

  const {
    conversationKey,
    messages,
    isLoading: isLoadingDms,
    error: dmsError
  } = useDMs(currentUser?.id, otherUser?.id);

  const [isSending, setIsSending] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [emojiUsage, setEmojiUsage] = useState<EmojiUsageMap>({});

  const { reactionsByMessage, toggleReaction } = useDmLocalReactions(conversationKey, currentUser?.id);

  const messagesWithDividers = useMemo(() => {
    const items: Array<
      | { kind: "divider"; id: string; label: string }
      | { kind: "message"; id: string; message: (typeof messages)[number] }
    > = [];

    let previousDay = "";
    for (const message of messages) {
      const nextDay = message.createdAt.slice(0, 10);
      if (nextDay !== previousDay) {
        items.push({
          kind: "divider",
          id: `divider-${nextDay}`,
          label: formatDayDivider(message.createdAt)
        });
        previousDay = nextDay;
      }
      items.push({
        kind: "message",
        id: message.id,
        message
      });
    }

    return items;
  }, [messages]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    setEmojiUsage(readEmojiUsage(currentUser?.id));
  }, [currentUser?.id]);

  const quickReactionEmojis = useMemo(() => getFrequentEmojis(emojiUsage, 4), [emojiUsage]);

  function rememberEmoji(emoji: string) {
    setEmojiUsage((current) => rememberEmojiUsage(currentUser?.id, current, emoji));
  }

  async function sendMessage(content: string) {
    if (!otherUser) return;

    setIsSending(true);
    setPageError(null);
    setStatusMessage(null);
    try {
      await invokeDmReducer("dms.sendDM", {
        toUserId: otherUser.id,
        content
      });
      setStatusMessage("Message sent.");
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Failed to send DM.";
      setPageError(message);
      throw nextError;
    } finally {
      setIsSending(false);
    }
  }

  async function editMessage(dmMessageId: string, content: string) {
    setIsMutating(true);
    setPageError(null);
    setStatusMessage(null);
    try {
      await invokeDmReducer("dms.editDM", {
        dmMessageId,
        content
      });
      setStatusMessage("Message updated.");
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Failed to edit DM.";
      setPageError(message);
      throw nextError;
    } finally {
      setIsMutating(false);
    }
  }

  async function deleteMessage(dmMessageId: string) {
    setIsMutating(true);
    setPageError(null);
    setStatusMessage(null);
    try {
      await invokeDmReducer("dms.deleteDM", {
        dmMessageId
      });
      setStatusMessage("Message deleted.");
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Failed to delete DM.";
      setPageError(message);
      throw nextError;
    } finally {
      setIsMutating(false);
    }
  }

  if (isLoadingCurrentUser) {
    return <p className="text-sm text-slate-300">Resolving current user...</p>;
  }

  if (currentUserError) {
    return <p className="text-sm text-rose-400">{currentUserError}</p>;
  }

  if (!currentUser) {
    return <p className="text-sm text-rose-400">Current user could not be resolved from session state.</p>;
  }

  if (!otherUser) {
    return <p className="text-sm text-rose-400">Target user not found.</p>;
  }

  const otherDisplayName = otherUser.displayName || otherUser.username;
  const otherStatus = otherPresence?.status ?? "offline";
  const profileStatus = formatProfileStatus(otherStatus, otherPresence?.customText ?? "");

  return (
    <section className="flex h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[32px] border border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(2,6,23,0.96))]">
      <header className="border-b border-slate-800 bg-slate-950/70 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-4">
          <UserAvatar
            username={otherUser.username}
            displayName={otherDisplayName}
            avatarUrl={otherUser.avatarUrl}
            status={otherStatus}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="truncate text-xl font-semibold text-slate-100">{otherDisplayName}</h2>
              <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                DM
              </span>
            </div>
            <p className="mt-1 truncate text-sm text-slate-400">
              @{otherUser.username} • {profileStatus}
            </p>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <a
              href={`/profile/${otherUser.username}`}
              className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Open profile
            </a>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-2 text-xs text-slate-500">
              {conversationKey || "No conversation key"}
            </div>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {isLoadingDms ? <p className="text-sm text-slate-300">Loading DMs...</p> : null}
        {dmsError ? <p className="text-sm text-rose-400">{dmsError}</p> : null}

        {!isLoadingDms && !dmsError && messages.length === 0 ? (
          <div className="mx-auto grid max-w-xl gap-4 rounded-[28px] border border-slate-800 bg-slate-950/60 p-8 text-center">
            <UserAvatar
              username={otherUser.username}
              displayName={otherDisplayName}
              avatarUrl={otherUser.avatarUrl}
              status={otherStatus}
              size="md"
            />
            <div>
              <h3 className="text-2xl font-semibold text-slate-100">{otherDisplayName}</h3>
              <p className="mt-2 text-sm text-slate-400">
                Start the conversation with text, an emoji, or a GIF.
              </p>
            </div>
          </div>
        ) : null}

        <div className="space-y-6">
          {messagesWithDividers.map((entry) => {
            if (entry.kind === "divider") {
              return (
                <div key={entry.id} className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-800" />
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {entry.label}
                  </p>
                  <div className="h-px flex-1 bg-slate-800" />
                </div>
              );
            }

            const message = entry.message;
            const isMine = message.fromUserId === currentUser.id;
            const author = isMine ? currentUser : otherUser;
            const authorPresence =
              presence.find((presenceEntry) => presenceEntry.userId === author.id)?.status ?? "offline";

            return (
              <DmMessageBubble
                key={entry.id}
                message={message}
                isMine={isMine}
                authorName={author.displayName || author.username}
                authorUsername={author.username}
                authorAvatarUrl={author.avatarUrl}
                authorStatus={authorPresence}
                reactions={reactionsByMessage[message.id] ?? []}
                quickReactionEmojis={quickReactionEmojis}
                isBusy={isMutating}
                onEditMessage={editMessage}
                onDeleteMessage={deleteMessage}
                onToggleReaction={toggleReaction}
                onRememberEmoji={rememberEmoji}
              />
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-800/70 px-4 py-4">
        <DmComposer
          recipientLabel={otherDisplayName}
          isSending={isSending}
          emojiUsage={emojiUsage}
          onRememberEmoji={rememberEmoji}
          onSendMessage={sendMessage}
        />
        {pageError ? <p className="mt-3 text-sm text-rose-400">{pageError}</p> : null}
        {statusMessage ? <p className="mt-3 text-sm text-emerald-400">{statusMessage}</p> : null}
      </div>
    </section>
  );
}
