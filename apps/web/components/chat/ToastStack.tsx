"use client";

import { useEffect } from "react";

export type ChatToastTone = "success" | "error" | "loading";

export type ChatToast = {
  id: string;
  title: string;
  description?: string;
  tone: ChatToastTone;
};

type ToastStackProps = {
  toasts: ChatToast[];
  onDismiss: (toastId: string) => void;
};

const AUTO_DISMISS_MS = 3600;

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin fill-none stroke-current stroke-[1.8]">
      <path d="M12 3.5a8.5 8.5 0 1 1-6.01 2.49" strokeLinecap="round" />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[2]">
      <path d="m5.5 12.5 4 4 9-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[2]">
      <path d="M12 8v5" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r=".8" fill="currentColor" stroke="none" />
      <path d="M10.2 4.8 3.8 16a2 2 0 0 0 1.74 3h12.92a2 2 0 0 0 1.74-3L13.8 4.8a2.08 2.08 0 0 0-3.6 0Z" />
    </svg>
  );
}

function ToastIcon({ tone }: { tone: ChatToastTone }) {
  if (tone === "loading") {
    return <Spinner />;
  }

  if (tone === "success") {
    return <SuccessIcon />;
  }

  return <ErrorIcon />;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  useEffect(() => {
    const timers = toasts
      .filter((toast) => toast.tone !== "loading")
      .map((toast) =>
        window.setTimeout(() => {
          onDismiss(toast.id);
        }, AUTO_DISMISS_MS)
      );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [onDismiss, toasts]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto rounded-[22px] border px-4 py-3 shadow-2xl shadow-black/35 backdrop-blur",
            toast.tone === "success" && "border-emerald-400/30 bg-emerald-500/12 text-emerald-50",
            toast.tone === "error" && "border-rose-400/30 bg-rose-500/12 text-rose-50",
            toast.tone === "loading" && "border-sky-400/30 bg-slate-950/95 text-slate-100"
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "mt-0.5 rounded-full p-2",
                toast.tone === "success" && "bg-emerald-400/15 text-emerald-200",
                toast.tone === "error" && "bg-rose-400/15 text-rose-200",
                toast.tone === "loading" && "bg-sky-400/15 text-sky-200"
              )}
            >
              <ToastIcon tone={toast.tone} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description ? <p className="mt-1 text-sm text-white/70">{toast.description}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded-full p-1 text-white/55 transition hover:bg-white/10 hover:text-white"
              aria-label="Dismiss notification"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[2]">
                <path d="M6 6 18 18" strokeLinecap="round" />
                <path d="M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
