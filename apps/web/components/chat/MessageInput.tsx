"use client";

import { FormEvent, useState } from "react";
import { invokeMessageReducer } from "@/lib/spacetime";

type MessageInputProps = {
  roomId: string;
  threadParentId?: string;
  onMessageSent?: () => void;
  onCancelThread?: () => void;
  placeholder?: string;
};

export function MessageInput({
  roomId,
  threadParentId,
  onMessageSent,
  onCancelThread,
  placeholder
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextContent = content.trim();
    if (!nextContent) {
      setError("Message cannot be empty.");
      return;
    }

    setIsSending(true);
    setError(null);
    try {
      await invokeMessageReducer("messages.sendMessage", {
        roomId,
        content: nextContent,
        threadParentId: threadParentId ?? ""
      });
      setContent("");
      onMessageSent?.();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      {threadParentId ? (
        <div className="flex items-center justify-between rounded-md border border-sky-800/60 bg-sky-950/30 px-3 py-2">
          <p className="text-xs text-sky-200">Replying in thread</p>
          {onCancelThread ? (
            <button
              type="button"
              onClick={onCancelThread}
              className="text-xs text-sky-300 hover:text-sky-200"
            >
              Cancel
            </button>
          ) : null}
        </div>
      ) : null}

      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={3}
        maxLength={2000}
        placeholder={placeholder ?? "Write a message"}
        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">{content.length}/2000</p>
        <button
          type="submit"
          disabled={isSending}
          className="rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </div>

      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </form>
  );
}
