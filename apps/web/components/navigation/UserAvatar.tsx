"use client";

type UserAvatarProps = {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  status: "online" | "idle" | "dnd" | "offline";
  size?: "sm" | "md";
};

function statusTone(status: UserAvatarProps["status"]) {
  if (status === "online") return "bg-emerald-400";
  if (status === "idle") return "bg-amber-400";
  if (status === "dnd") return "bg-rose-500";
  return "bg-slate-500";
}

export function UserAvatar({ username, displayName, avatarUrl, status, size = "md" }: UserAvatarProps) {
  const initials = (displayName.trim().charAt(0) || username.trim().charAt(0) || "?").toUpperCase();
  const dimensions = size === "sm" ? "h-9 w-9 text-sm" : "h-11 w-11 text-base";
  const statusSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <div className="relative shrink-0">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${displayName} avatar`}
          className={`${dimensions} rounded-2xl border border-slate-700 object-cover`}
        />
      ) : (
        <div
          className={`${dimensions} grid place-items-center rounded-2xl border border-slate-700 bg-slate-800 font-semibold text-slate-100`}
        >
          {initials}
        </div>
      )}
      <span
        className={`absolute bottom-0 right-0 ${statusSize} rounded-full border-2 border-slate-900 ${statusTone(status)}`}
      />
    </div>
  );
}
