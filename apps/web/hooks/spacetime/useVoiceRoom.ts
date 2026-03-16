"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { useLivekitTokenQuery } from "@/hooks/query/useLivekitTokenQuery";
import {
  attachLivekitRoom,
  cleanupLivekitRoom,
  type LivekitMediaTrack,
  useLivekitRoomStore
} from "@/lib/livekitRoom";
import { invokeVoiceReducer } from "@/lib/spacetime";
import { useCurrentUser } from "./useCurrentUser";
import { useRoomMembers } from "./useRoomMembers";

type UseVoiceRoomInput = {
  houseId?: string;
  roomId?: string;
  roomName?: string;
};

type UseVoiceRoomResult = {
  members: ReturnType<typeof useRoomMembers>["members"];
  isLoading: boolean;
  error: string | null;
  isJoining: boolean;
  isLeaving: boolean;
  isInRoom: boolean;
  muted: boolean;
  cameraOn: boolean;
  mediaTracks: LivekitMediaTrack[];
  connectionState: string;
  join: () => Promise<void>;
  leave: () => Promise<void>;
  setMuted: (muted: boolean) => Promise<void>;
  setCameraOn: (cameraOn: boolean) => Promise<void>;
  toggleMuted: () => Promise<void>;
  toggleCameraOn: () => Promise<void>;
};

function normalizeError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useVoiceRoom(input: UseVoiceRoomInput): UseVoiceRoomResult {
  const { houseId, roomId, roomName } = input;
  const { currentUser, isLoading: isLoadingCurrentUser, error: currentUserError } = useCurrentUser();
  const { members, isLoading: isLoadingMembers, error: membersError } = useRoomMembers(houseId, roomId);
  const livekitTokenMutation = useLivekitTokenQuery();
  const mediaTracks = useLivekitRoomStore((state) => state.mediaTracks);
  const connectionState = useLivekitRoomStore((state) => state.connectionState);
  const livekitError = useLivekitRoomStore((state) => state.error);

  const livekitRoomRef = useRef<Room | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [muted, setMutedState] = useState(true);
  const [cameraOn, setCameraOnState] = useState(false);

  const selfMember = useMemo(() => {
    if (!currentUser) return null;
    return members.find((entry) => entry.userId === currentUser.id) ?? null;
  }, [currentUser, members]);

  const isInRoom = Boolean(selfMember && roomId && selfMember.currentRoomId === roomId);

  useEffect(() => {
    if (!selfMember) return;
    setMutedState(selfMember.voiceMuted);
    setCameraOnState(selfMember.voiceCameraOn);
  }, [selfMember]);

  useEffect(() => {
    return () => {
      if (livekitRoomRef.current) {
        livekitRoomRef.current.disconnect();
        cleanupLivekitRoom(livekitRoomRef.current);
        livekitRoomRef.current = null;
      }
    };
  }, []);

  const leave = useCallback(async () => {
    setActionError(null);
    setIsLeaving(true);
    try {
      if (livekitRoomRef.current) {
        livekitRoomRef.current.disconnect();
        cleanupLivekitRoom(livekitRoomRef.current);
        livekitRoomRef.current = null;
      }
      await invokeVoiceReducer("voice.leaveRoom");
      setMutedState(true);
      setCameraOnState(false);
    } catch (error) {
      setActionError(normalizeError(error, "Failed to leave voice room."));
      throw error;
    } finally {
      setIsLeaving(false);
    }
  }, []);

  const join = useCallback(async () => {
    if (!roomId || !houseId) {
      throw new Error("Missing house or room id.");
    }
    if (!currentUser) {
      throw new Error("Current user is not resolved yet.");
    }

    setActionError(null);
    setIsJoining(true);

    try {
      if (livekitRoomRef.current) {
        livekitRoomRef.current.disconnect();
        cleanupLivekitRoom(livekitRoomRef.current);
        livekitRoomRef.current = null;
      }

      const room = new Room();
      room.on(RoomEvent.Disconnected, () => {
        const wasActiveRoom = livekitRoomRef.current === room;
        cleanupLivekitRoom(room);
        livekitRoomRef.current = null;
        setMutedState(true);
        setCameraOnState(false);
        if (wasActiveRoom) {
          void invokeVoiceReducer("voice.leaveRoom").catch(() => undefined);
        }
      });
      room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
        if (publication.source !== Track.Source.ScreenShare) {
          return;
        }

        void invokeVoiceReducer("voice.stopScreenShare").catch(() => undefined);
      });

      const tokenResponse = await livekitTokenMutation.mutateAsync({
        roomId,
        roomName: roomName || roomId,
        identity: currentUser.id,
        name: currentUser.displayName || currentUser.username
      });

      await room.connect(tokenResponse.url, tokenResponse.token);
      livekitRoomRef.current = room;
      attachLivekitRoom(room);

      await invokeVoiceReducer("voice.joinRoom", { roomId });
      await invokeVoiceReducer("voice.updateMediaState", {
        muted: true,
        cameraOn: false
      });
      setMutedState(true);
      setCameraOnState(false);
    } catch (error) {
      if (livekitRoomRef.current) {
        livekitRoomRef.current.disconnect();
        cleanupLivekitRoom(livekitRoomRef.current);
        livekitRoomRef.current = null;
      }
      setActionError(normalizeError(error, "Failed to join voice room."));
      throw error;
    } finally {
      setIsJoining(false);
    }
  }, [currentUser, houseId, livekitTokenMutation, roomId, roomName]);

  const setMuted = useCallback(
    async (nextMuted: boolean) => {
      const room = livekitRoomRef.current;
      if (!room || room.state !== "connected" || !isInRoom) {
        throw new Error("Join the room first.");
      }

      setActionError(null);
      try {
        await room.localParticipant.setMicrophoneEnabled(!nextMuted);
        await invokeVoiceReducer("voice.updateMediaState", {
          muted: nextMuted,
          cameraOn
        });
        setMutedState(nextMuted);
      } catch (error) {
        await room.localParticipant.setMicrophoneEnabled(!muted).catch(() => undefined);
        setActionError(normalizeError(error, "Failed to update mute state."));
        throw error;
      }
    },
    [cameraOn, isInRoom, muted]
  );

  const setCameraOn = useCallback(
    async (nextCameraOn: boolean) => {
      const room = livekitRoomRef.current;
      if (!room || room.state !== "connected" || !isInRoom) {
        throw new Error("Join the room first.");
      }

      setActionError(null);
      try {
        await room.localParticipant.setCameraEnabled(nextCameraOn);
        await invokeVoiceReducer("voice.updateMediaState", {
          muted,
          cameraOn: nextCameraOn
        });
        setCameraOnState(nextCameraOn);
      } catch (error) {
        await room.localParticipant.setCameraEnabled(cameraOn).catch(() => undefined);
        setActionError(normalizeError(error, "Failed to update camera state."));
        throw error;
      }
    },
    [cameraOn, isInRoom, muted]
  );

  const toggleMuted = useCallback(async () => {
    await setMuted(!muted);
  }, [muted, setMuted]);

  const toggleCameraOn = useCallback(async () => {
    await setCameraOn(!cameraOn);
  }, [cameraOn, setCameraOn]);

  return {
    members,
    isLoading: isLoadingCurrentUser || isLoadingMembers,
    error: actionError ?? livekitError ?? currentUserError ?? membersError ?? null,
    isJoining,
    isLeaving,
    isInRoom,
    muted,
    cameraOn,
    mediaTracks,
    connectionState,
    join,
    leave,
    setMuted,
    setCameraOn,
    toggleMuted,
    toggleCameraOn
  };
}
