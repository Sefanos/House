"use client";

import { FormEvent, useState } from "react";
import type { PresenceStatus } from "@/lib/spacetime";

type StatusPickerProps = {
  initialStatus: PresenceStatus;
  initialCustomText: string;
  onSubmit: (payload: { status: PresenceStatus; customText: string }) => Promise<void>;
};

export function StatusPicker({ initialStatus, initialCustomText, onSubmit }: StatusPickerProps) {
  const [status, setStatus] = useState<PresenceStatus>(initialStatus);
  const [customText, setCustomText] = useState(initialCustomText);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({ status, customText });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
    >
      <h2 className="text-sm font-semibold tracking-wide text-slate-200">Status</h2>

      <div className="space-y-1">
        <label htmlFor="status" className="text-xs uppercase tracking-wide text-slate-400">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(event) => setStatus(event.target.value as PresenceStatus)}
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        >
          <option value="online">Online</option>
          <option value="idle">Idle</option>
          <option value="dnd">Do Not Disturb</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="customStatus" className="text-xs uppercase tracking-wide text-slate-400">
          Custom Text
        </label>
        <input
          id="customStatus"
          value={customText}
          onChange={(event) => setCustomText(event.target.value)}
          maxLength={80}
          placeholder="What are you working on?"
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Saving..." : "Save Status"}
      </button>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </form>
  );
}
