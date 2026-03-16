type ProfileCardProps = {
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  status: "online" | "idle" | "dnd" | "offline";
  customText: string;
  lastSeen: string;
  badges?: Array<{
    id: string;
    name: string;
    icon: string;
    badgeType: "earned" | "achievement" | "house";
  }>;
};

function statusTone(status: ProfileCardProps["status"]) {
  if (status === "online") return "bg-emerald-400";
  if (status === "idle") return "bg-amber-400";
  if (status === "dnd") return "bg-rose-500";
  return "bg-slate-500";
}

export function ProfileCard({
  username,
  displayName,
  avatarUrl,
  bio,
  status,
  customText,
  lastSeen,
  badges = []
}: ProfileCardProps) {
  const effectiveBio = bio.trim().length > 0 ? bio : "No bio yet.";
  const effectiveCustomText = customText.trim().length > 0 ? customText : "No custom status.";
  const initials = (displayName.trim().charAt(0) || username.charAt(0) || "?").toUpperCase();

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <header className="flex items-center gap-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${displayName} avatar`}
            className="h-16 w-16 rounded-full border border-slate-700 object-cover"
          />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-full border border-slate-700 bg-slate-800 text-lg font-semibold">
            {initials}
          </div>
        )}
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{displayName}</h1>
          <p className="text-sm text-slate-300">@{username}</p>
          <p className="flex items-center gap-2 text-sm text-slate-300">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusTone(status)}`} />
            <span className="capitalize">{status}</span>
          </p>
        </div>
      </header>

      <div className="mt-4 space-y-3 text-sm text-slate-300">
        <p>{effectiveBio}</p>
        <p>
          <span className="font-medium text-slate-200">Status text:</span> {effectiveCustomText}
        </p>
        <p>
          <span className="font-medium text-slate-200">Last seen:</span> {lastSeen}
        </p>
        <div>
          <p className="font-medium text-slate-200">Badges</p>
          {badges.length === 0 ? (
            <p className="text-slate-400">No badges yet.</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {badges.map((badge) => (
                <li
                  key={badge.id}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs text-slate-200"
                >
                  {badge.icon ? <span aria-hidden>{badge.icon}</span> : null}
                  <span>{badge.name}</span>
                  <span className="uppercase text-slate-400">{badge.badgeType}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}
