"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Track } from "livekit-client";
import { useParticipantLayout } from "@/hooks/useParticipantLayout";
import { useCurrentUser } from "@/hooks/spacetime/useCurrentUser";
import { useScreenShare } from "@/hooks/spacetime/useScreenShare";
import { useVoiceRoom } from "@/hooks/spacetime/useVoiceRoom";
import { type RoomMemberPresence } from "@/hooks/spacetime/useRoomMembers";
import { type LivekitMediaTrack } from "@/lib/livekitRoom";
import { useCustomizationStore } from "@/store/customization";

type VoiceRoomPanelProps = {
  houseId: string;
  roomId: string;
  roomName: string;
  roomDescription?: string;
  variant?: "main" | "bottomBar";
};

function AudioTrackRenderer({ mediaTrack }: { mediaTrack: LivekitMediaTrack }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const element = audioRef.current;
    if (!element) {
      return;
    }

    mediaTrack.track.attach(element);
    element.autoplay = true;
    void element.play().catch(() => undefined);

    return () => {
      mediaTrack.track.detach(element);
    };
  }, [mediaTrack]);

  return <audio ref={audioRef} hidden />;
}

function MicIcon({ muted = false }: { muted?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="M12 15a3 3 0 0 0 3-3V8a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3Z" />
      <path d="M18 12a6 6 0 0 1-9.8 4.6" strokeLinecap="round" />
      <path d="M6 12c0-.7.1-1.4.4-2" strokeLinecap="round" />
      <path d="M12 18v3" strokeLinecap="round" />
      <path d="M9 21h6" strokeLinecap="round" />
      {muted ? <path d="M4 4l16 16" strokeLinecap="round" /> : null}
    </svg>
  );
}

function CameraIcon({ off = false }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="M15 8.5 19 6v12l-4-2.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="4" y="7" width="11" height="10" rx="2" />
      {off ? <path d="M4 4l16 16" strokeLinecap="round" /> : null}
    </svg>
  );
}

function ScreenShareIcon({ active = false }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <rect x="3.5" y="5" width="17" height="11" rx="2" />
      <path d="M12 16.5V21" strokeLinecap="round" />
      <path d="M8.5 21h7" strokeLinecap="round" />
      <path d="M12 9v4" strokeLinecap="round" />
      <path d="m9.8 11.2 2.2-2.2 2.2 2.2" strokeLinecap="round" strokeLinejoin="round" />
      {active ? <circle cx="18.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" /> : null}
    </svg>
  );
}

function LayoutIcon({ focus = false }: { focus?: boolean }) {
  return focus ? (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <rect x="7.5" y="8.5" width="9" height="7" rx="1.5" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <rect x="4" y="5" width="7" height="6" rx="1.5" />
      <rect x="13" y="5" width="7" height="6" rx="1.5" />
      <rect x="4" y="13" width="7" height="6" rx="1.5" />
      <rect x="13" y="13" width="7" height="6" rx="1.5" />
    </svg>
  );
}

function LeaveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="M4 13.5c1.8-2 4.5-3.1 8-3.1s6.2 1 8 3.1" strokeLinecap="round" />
      <path d="M8.5 12.7 7.2 15" strokeLinecap="round" />
      <path d="M15.5 12.7 16.8 15" strokeLinecap="round" />
    </svg>
  );
}

function FullscreenIcon({ active = false }: { active?: boolean }) {
  return active ? (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="M8 4H4v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m4 4 5 5" strokeLinecap="round" />
      <path d="M16 4h4v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m20 4-5 5" strokeLinecap="round" />
      <path d="M8 20H4v-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m4 20 5-5" strokeLinecap="round" />
      <path d="M16 20h4v-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m20 20-5-5" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="M9 4H4v5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 4h5v5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 20H4v-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 20h5v-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getInitials(label: string): string {
  return label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function ParticipantAvatar({
  member,
  size = "md"
}: {
  member: Pick<RoomMemberPresence, "avatarUrl" | "displayName" | "voiceMuted" | "status">;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses =
    size === "sm" ? "h-9 w-9 text-xs" : size === "lg" ? "h-16 w-16 text-base" : "h-11 w-11 text-sm";

  return (
    <div className="relative shrink-0">
      {member.avatarUrl ? (
        <img
          src={member.avatarUrl}
          alt={member.displayName}
          className={cn("rounded-2xl object-cover shadow-lg shadow-black/30", sizeClasses)}
          loading="lazy"
        />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400/30 via-cyan-300/20 to-emerald-300/30 font-semibold text-slate-100 shadow-lg shadow-black/30",
            sizeClasses
          )}
        >
          {getInitials(member.displayName || "U")}
        </div>
      )}
      <span
        className={cn(
          "absolute -bottom-1 -right-1 rounded-full border border-slate-950",
          member.status === "dnd"
            ? "bg-rose-400"
            : member.status === "idle"
              ? "bg-amber-400"
              : "bg-emerald-400",
          size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"
        )}
      />
      {member.voiceMuted ? (
        <span className="absolute -left-1 -top-1 rounded-full border border-slate-950 bg-slate-950/90 p-1 text-slate-200">
          <MicIcon muted />
        </span>
      ) : null}
    </div>
  );
}

function VideoTrackTile({
  mediaTrack,
  displayName,
  username,
  avatarUrl,
  isFocused = false,
  onSelect
}: {
  mediaTrack: LivekitMediaTrack;
  displayName: string;
  username: string;
  avatarUrl?: string;
  isFocused?: boolean;
  onSelect?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const tileRef = useRef<HTMLElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isScreenShare = mediaTrack.source === Track.Source.ScreenShare;

  useEffect(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }

    mediaTrack.track.attach(element);
    element.autoplay = true;
    element.playsInline = true;
    element.muted = mediaTrack.isLocal;

    void element.play().catch(() => undefined);

    return () => {
      mediaTrack.track.detach(element);
    };
  }, [mediaTrack]);

  useEffect(() => {
    function syncFullscreenState() {
      setIsFullscreen(typeof document !== "undefined" && document.fullscreenElement === tileRef.current);
    }

    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  async function toggleFullscreen() {
    const element = tileRef.current;
    if (!element) return;

    if (document.fullscreenElement === element) {
      await document.exitFullscreen();
      return;
    }

    await element.requestFullscreen();
  }

  return (
    <article
      ref={tileRef}
      onClick={onSelect}
      className={cn(
        "group relative overflow-hidden rounded-[28px] border shadow-2xl shadow-black/25",
        isScreenShare
          ? "border-amber-400/30 bg-amber-300/10"
          : "border-white/10 bg-slate-950/70",
        onSelect ? "cursor-pointer" : ""
      )}
    >
      <div className={cn("relative bg-slate-950", isFocused ? "aspect-[16/9]" : "aspect-[16/10]")}>
        <video
          ref={videoRef}
          className={cn(
            "h-full w-full object-cover",
            isScreenShare ? "object-contain" : ""
          )}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/15 to-transparent" />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
              isScreenShare
                ? "bg-amber-300/20 text-amber-100"
                : "bg-slate-900/70 text-slate-100"
            )}
          >
            {isScreenShare ? "Presenting" : mediaTrack.isLocal ? "You" : "Live"}
          </span>
        </div>
        {isScreenShare ? (
          <div className="absolute right-4 top-4">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void toggleFullscreen();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-100 backdrop-blur transition hover:bg-slate-900"
            >
              <FullscreenIcon active={isFullscreen} />
              {isFullscreen ? "Exit full screen" : "Full screen"}
            </button>
          </div>
        ) : null}
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-10 w-10 rounded-2xl object-cover ring-1 ring-white/10"
                loading="lazy"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-white ring-1 ring-white/10">
                {getInitials(displayName)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{displayName}</p>
              <p className="truncate text-xs text-slate-300">@{username}</p>
            </div>
          </div>
          <span className="rounded-full bg-black/40 px-3 py-1 text-[11px] font-medium text-slate-100 backdrop-blur">
            {isScreenShare ? "Screen Share" : "Camera"}
          </span>
        </div>
      </div>
    </article>
  );
}

function VoiceStage({
  roomName,
  members
}: {
  roomName: string;
  members: RoomMemberPresence[];
}) {
  const featured = members.slice(0, 6);

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#090d19] px-6 py-8 shadow-2xl shadow-black/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.14),_transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.18),rgba(2,6,23,0.8))]" />
      <div className="relative flex min-h-[24rem] flex-col items-center justify-center text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Voice room</p>
        <h3 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">#{roomName}</h3>
        <p className="mt-3 text-sm text-slate-300">
          {featured.length > 0
            ? `${featured.length} participant${featured.length === 1 ? "" : "s"} connected`
            : "No camera or screen share live right now"}
        </p>

        {featured.length > 0 ? (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {featured.map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3"
              >
                <ParticipantAvatar member={member} />
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-semibold text-white">{member.displayName}</p>
                  <p className="truncate text-xs text-slate-400">@{member.username}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function BottomBarVoicePanel({
  roomName,
  participantCount,
  connectionState,
  isInRoom,
  isJoining,
  isLeaving,
  muted,
  cameraOn,
  isCurrentUserSharing,
  isStartingShare,
  isStoppingShare,
  onJoin,
  onLeave,
  onToggleMuted,
  onToggleCamera,
  onStartScreenShare,
  onStopScreenShare,
  voiceBarExpanded,
  toggleVoiceBarExpanded
}: {
  roomName: string;
  participantCount: number;
  connectionState: string;
  isInRoom: boolean;
  isJoining: boolean;
  isLeaving: boolean;
  muted: boolean;
  cameraOn: boolean;
  isCurrentUserSharing: boolean;
  isStartingShare: boolean;
  isStoppingShare: boolean;
  onJoin: () => Promise<void>;
  onLeave: () => Promise<void>;
  onToggleMuted: () => Promise<void>;
  onToggleCamera: () => Promise<void>;
  onStartScreenShare: () => Promise<void>;
  onStopScreenShare: () => Promise<void>;
  voiceBarExpanded: boolean;
  toggleVoiceBarExpanded: () => void;
}) {
  if (!voiceBarExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-40 flex w-[340px] items-center justify-between rounded-3xl border border-white/10 bg-slate-950/95 px-4 py-3 shadow-2xl shadow-black/35 backdrop-blur">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Voice</p>
          <p className="text-sm font-medium text-slate-100">
            #{roomName} · {participantCount} live
          </p>
        </div>
        <button
          type="button"
          onClick={toggleVoiceBarExpanded}
          className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-white/10"
        >
          Expand
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[430px] max-w-[calc(100vw-2rem)] space-y-4 rounded-[28px] border border-white/10 bg-slate-950/95 p-4 shadow-2xl shadow-black/40 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Voice Room</p>
          <h5 className="mt-1 text-lg font-semibold text-white">#{roomName}</h5>
          <p className="text-sm text-slate-400">
            {participantCount} participant{participantCount === 1 ? "" : "s"} · {connectionState}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleVoiceBarExpanded}
          className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-white/10"
        >
          Minimize
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onToggleMuted}
          disabled={!isInRoom}
          className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {muted ? "Unmute" : "Mute"}
        </button>
        <button
          type="button"
          onClick={onToggleCamera}
          disabled={!isInRoom}
          className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cameraOn ? "Camera Off" : "Camera On"}
        </button>
        <button
          type="button"
          onClick={isCurrentUserSharing ? onStopScreenShare : onStartScreenShare}
          disabled={!isInRoom || isStartingShare || isStoppingShare}
          className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCurrentUserSharing ? (isStoppingShare ? "Stopping..." : "Stop Share") : isStartingShare ? "Starting..." : "Share Screen"}
        </button>
        {isInRoom ? (
          <button
            type="button"
            onClick={onLeave}
            disabled={isLeaving}
            className="rounded-2xl bg-rose-500 px-3 py-3 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLeaving ? "Leaving..." : "Leave"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onJoin}
            disabled={isJoining}
            className="rounded-2xl bg-emerald-500 px-3 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isJoining ? "Joining..." : "Join"}
          </button>
        )}
      </div>
    </div>
  );
}

export function VoiceRoomPanel({
  houseId,
  roomId,
  roomName,
  variant = "main"
}: VoiceRoomPanelProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const voiceBarExpanded = useCustomizationStore((state) => state.voiceBarExpanded);
  const setVoiceBarExpanded = useCustomizationStore((state) => state.setVoiceBarExpanded);
  const toggleVoiceBarExpanded = useCustomizationStore((state) => state.toggleVoiceBarExpanded);
  const { currentUser } = useCurrentUser();
  const {
    members,
    isLoading,
    error,
    isJoining,
    isLeaving,
    isInRoom,
    muted,
    cameraOn,
    mediaTracks,
    connectionState,
    join,
    leave,
    toggleMuted,
    toggleCameraOn
  } = useVoiceRoom({
    houseId,
    roomId,
    roomName
  });
  const {
    shares,
    activeShare,
    isStarting: isStartingShare,
    isStopping: isStoppingShare,
    startScreenShare,
    stopScreenShare,
    error: screenShareError
  } = useScreenShare(houseId, roomId);
  const { mode, focusedUserId, setMode, setFocusedUserId, resetLayout } = useParticipantLayout();

  const participantCount = members.length;
  const isBottomBar = variant === "bottomBar";
  const membersByUserId = useMemo(() => new Map(members.map((member) => [member.userId, member])), [members]);
  const videoTracks = useMemo(
    () =>
      mediaTracks
        .filter((entry) => entry.kind === Track.Kind.Video)
        .sort((left, right) => {
          if (left.source === right.source) return left.participantName.localeCompare(right.participantName);
          return left.source === Track.Source.ScreenShare ? -1 : 1;
        }),
    [mediaTracks]
  );
  const audioTracks = useMemo(
    () => mediaTracks.filter((entry) => entry.kind === Track.Kind.Audio && !entry.isLocal),
    [mediaTracks]
  );
  const livekitActiveShare = useMemo(
    () => videoTracks.find((entry) => entry.source === Track.Source.ScreenShare) ?? null,
    [videoTracks]
  );
  const activeShareUserId = livekitActiveShare?.participantIdentity ?? activeShare?.userId ?? null;
  const isCurrentUserSharing = useMemo(
    () =>
      Boolean(
        currentUser &&
          (videoTracks.some(
            (entry) => entry.source === Track.Source.ScreenShare && entry.participantIdentity === currentUser.id
          ) ||
            shares.some((share) => share.userId === currentUser.id))
      ),
    [currentUser, shares, videoTracks]
  );
  const focusableUserIds = useMemo(() => new Set(videoTracks.map((track) => track.participantIdentity)), [videoTracks]);
  const focusTargetUserId = activeShareUserId ?? videoTracks[0]?.participantIdentity ?? null;

  useEffect(() => {
    if (mode !== "focus") return;
    if (focusedUserId && focusableUserIds.has(focusedUserId)) {
      return;
    }
    if (activeShareUserId && focusableUserIds.has(activeShareUserId)) {
      setFocusedUserId(activeShareUserId);
      return;
    }
    if (videoTracks[0]) {
      setFocusedUserId(videoTracks[0].participantIdentity);
      return;
    }
    resetLayout();
  }, [activeShareUserId, focusableUserIds, focusedUserId, mode, resetLayout, setFocusedUserId, videoTracks]);

  useEffect(() => {
    if (!isBottomBar && !voiceBarExpanded) {
      setVoiceBarExpanded(true);
    }
  }, [isBottomBar, setVoiceBarExpanded, voiceBarExpanded]);

  const focusedTrack = useMemo(() => {
    if (mode !== "focus" || !focusedUserId) return null;
    return (
      videoTracks.find(
        (entry) =>
          entry.participantIdentity === focusedUserId && entry.source === Track.Source.ScreenShare
      ) ??
      videoTracks.find((entry) => entry.participantIdentity === focusedUserId) ??
      null
    );
  }, [focusedUserId, mode, videoTracks]);
  const secondaryTracks = useMemo(() => {
    if (!focusedTrack) {
      return videoTracks;
    }
    return videoTracks.filter((entry) => entry.id !== focusedTrack.id);
  }, [focusedTrack, videoTracks]);
  async function onJoin() {
    setLocalError(null);
    try {
      await join();
    } catch (nextError) {
      setLocalError(nextError instanceof Error ? nextError.message : "Failed to join voice room.");
    }
  }

  async function onLeave() {
    setLocalError(null);
    try {
      await leave();
      resetLayout();
    } catch (nextError) {
      setLocalError(nextError instanceof Error ? nextError.message : "Failed to leave voice room.");
    }
  }

  async function onToggleMuted() {
    setLocalError(null);
    try {
      await toggleMuted();
    } catch (nextError) {
      setLocalError(nextError instanceof Error ? nextError.message : "Failed to update mute state.");
    }
  }

  async function onToggleCamera() {
    setLocalError(null);
    try {
      await toggleCameraOn();
    } catch (nextError) {
      setLocalError(nextError instanceof Error ? nextError.message : "Failed to update camera state.");
    }
  }

  async function onStartScreenShare() {
    setLocalError(null);
    try {
      await startScreenShare();
    } catch (nextError) {
      setLocalError(nextError instanceof Error ? nextError.message : "Failed to start screen share.");
    }
  }

  async function onStopScreenShare() {
    setLocalError(null);
    try {
      await stopScreenShare();
      resetLayout();
    } catch (nextError) {
      setLocalError(nextError instanceof Error ? nextError.message : "Failed to stop screen share.");
    }
  }

  if (isBottomBar) {
    return (
      <>
        <BottomBarVoicePanel
          roomName={roomName}
          participantCount={participantCount}
          connectionState={connectionState}
          isInRoom={isInRoom}
          isJoining={isJoining}
          isLeaving={isLeaving}
          muted={muted}
          cameraOn={cameraOn}
          isCurrentUserSharing={isCurrentUserSharing}
          isStartingShare={isStartingShare}
          isStoppingShare={isStoppingShare}
          onJoin={onJoin}
          onLeave={onLeave}
          onToggleMuted={onToggleMuted}
          onToggleCamera={onToggleCamera}
          onStartScreenShare={onStartScreenShare}
          onStopScreenShare={onStopScreenShare}
          voiceBarExpanded={voiceBarExpanded}
          toggleVoiceBarExpanded={toggleVoiceBarExpanded}
        />
        {audioTracks.map((track) => (
          <AudioTrackRenderer key={track.id} mediaTrack={track} />
        ))}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {audioTracks.map((track) => (
        <AudioTrackRenderer key={track.id} mediaTrack={track} />
      ))}

      {!isInRoom ? (
        <section className="space-y-4">
          <VoiceStage roomName={roomName} members={members} />
          <div className="flex flex-wrap items-center justify-center gap-3 rounded-[28px] border border-white/10 bg-slate-950/90 px-4 py-4 shadow-2xl shadow-black/25">
            <button
              type="button"
              onClick={onJoin}
              disabled={isJoining}
              className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isJoining ? "Joining..." : participantCount > 0 ? "Join room" : "Start room"}
            </button>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
              {participantCount} connected
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-400">
              {connectionState}
            </span>
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          {focusedTrack ? (
            <div className="space-y-4">
              <VideoTrackTile
                mediaTrack={focusedTrack}
                displayName={
                  membersByUserId.get(focusedTrack.participantIdentity)?.displayName ?? focusedTrack.participantName
                }
                username={
                  membersByUserId.get(focusedTrack.participantIdentity)?.username ?? focusedTrack.participantIdentity
                }
                avatarUrl={membersByUserId.get(focusedTrack.participantIdentity)?.avatarUrl}
                isFocused
              />
              {secondaryTracks.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {secondaryTracks.map((track) => (
                    <VideoTrackTile
                      key={track.id}
                      mediaTrack={track}
                      displayName={membersByUserId.get(track.participantIdentity)?.displayName ?? track.participantName}
                      username={membersByUserId.get(track.participantIdentity)?.username ?? track.participantIdentity}
                      avatarUrl={membersByUserId.get(track.participantIdentity)?.avatarUrl}
                      onSelect={() => {
                        setMode("focus");
                        setFocusedUserId(track.participantIdentity);
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : videoTracks.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {videoTracks.map((track) => (
                <VideoTrackTile
                  key={track.id}
                  mediaTrack={track}
                  displayName={membersByUserId.get(track.participantIdentity)?.displayName ?? track.participantName}
                  username={membersByUserId.get(track.participantIdentity)?.username ?? track.participantIdentity}
                  avatarUrl={membersByUserId.get(track.participantIdentity)?.avatarUrl}
                  onSelect={() => {
                    setMode("focus");
                    setFocusedUserId(track.participantIdentity);
                  }}
                />
              ))}
            </div>
          ) : (
            <VoiceStage roomName={roomName} members={members} />
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 rounded-[28px] border border-white/10 bg-slate-950/90 px-4 py-4 shadow-2xl shadow-black/25">
            <button
              type="button"
              onClick={() => {
                resetLayout();
                setMode("grid");
              }}
              className={cn(
                "inline-flex min-w-[112px] items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition",
                mode === "grid"
                  ? "border-sky-300/40 bg-sky-400/15 text-sky-100"
                  : "border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]"
              )}
            >
              <LayoutIcon />
              Grid
            </button>
            <button
              type="button"
              onClick={() => {
                if (!focusTargetUserId) return;
                setMode("focus");
                setFocusedUserId(focusTargetUserId);
              }}
              disabled={!focusTargetUserId}
              className={cn(
                "inline-flex min-w-[112px] items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
                mode === "focus"
                  ? "border-sky-300/40 bg-sky-400/15 text-sky-100"
                  : "border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]"
              )}
            >
              <LayoutIcon focus />
              Focus
            </button>
            <button
              type="button"
              onClick={onToggleMuted}
              className={cn(
                "inline-flex min-w-[112px] items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition",
                muted
                  ? "border-amber-300/30 bg-amber-300/12 text-amber-100 hover:bg-amber-300/18"
                  : "border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]"
              )}
            >
              <MicIcon muted={muted} />
              {muted ? "Unmute" : "Mute"}
            </button>
            <button
              type="button"
              onClick={onToggleCamera}
              className={cn(
                "inline-flex min-w-[112px] items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition",
                cameraOn
                  ? "border-emerald-300/30 bg-emerald-300/12 text-emerald-100 hover:bg-emerald-300/18"
                  : "border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]"
              )}
            >
              <CameraIcon off={!cameraOn} />
              {cameraOn ? "Camera Off" : "Camera On"}
            </button>
            <button
              type="button"
              onClick={isCurrentUserSharing ? onStopScreenShare : onStartScreenShare}
              disabled={isStartingShare || isStoppingShare}
              className={cn(
                "inline-flex min-w-[136px] items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
                isCurrentUserSharing
                  ? "border-amber-300/30 bg-amber-300/12 text-amber-100 hover:bg-amber-300/18"
                  : "border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]"
              )}
            >
              <ScreenShareIcon active={isCurrentUserSharing} />
              {isCurrentUserSharing ? (isStoppingShare ? "Stopping..." : "Stop Share") : isStartingShare ? "Starting..." : "Share Screen"}
            </button>
            <button
              type="button"
              onClick={onLeave}
              disabled={isLeaving}
              className="inline-flex min-w-[112px] items-center justify-center gap-2 rounded-full bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LeaveIcon />
              {isLeaving ? "Leaving..." : "Leave"}
            </button>
          </div>
        </section>
      )}

      {isLoading ? <p className="text-sm text-slate-400">Loading voice participants...</p> : null}
      {localError ? <p className="text-sm text-rose-400">{localError}</p> : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {screenShareError ? <p className="text-sm text-rose-400">{screenShareError}</p> : null}
    </div>
  );
}
