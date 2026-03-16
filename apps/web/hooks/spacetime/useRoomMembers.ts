"use client";

import { useMemo } from "react";
import { useHouseMembers } from "./useHouseMembers";
import { usePresence } from "./usePresence";
import { useUsers } from "./useUsers";
import { useVoiceStates } from "./useVoiceStates";

export type RoomMemberPresence = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  status: "online" | "idle" | "dnd" | "offline";
  customText: string;
  lastSeen: string;
  voiceMuted: boolean;
  voiceCameraOn: boolean;
  currentRoomId: string;
  currentHouseId: string;
};

type UseRoomMembersResult = {
  members: RoomMemberPresence[];
  isLoading: boolean;
  error: string | null;
};

export function useRoomMembers(houseId?: string, roomId?: string): UseRoomMembersResult {
  const { members: houseMembers, isLoading: isLoadingHouseMembers, error: houseMembersError } = useHouseMembers(houseId);
  const { presence, isLoading: isLoadingPresence, error: presenceError } = usePresence();
  const { users, isLoading: isLoadingUsers, error: usersError } = useUsers();
  const { voiceStates, isLoading: isLoadingVoiceStates, error: voiceStatesError } = useVoiceStates();

  const members = useMemo(() => {
    if (!houseId || !roomId) return [];

    const userIds = new Set(houseMembers.map((entry) => entry.userId));
    const usersById = new Map(users.map((entry) => [entry.id, entry]));
    const voiceStateByUserId = new Map(voiceStates.map((entry) => [entry.userId, entry]));

    return presence
      .filter((entry) => {
        return (
          userIds.has(entry.userId) &&
          entry.currentHouseId === houseId &&
          entry.currentRoomId === roomId &&
          entry.status !== "offline"
        );
      })
      .map((entry) => {
        const user = usersById.get(entry.userId);
        const voiceState = voiceStateByUserId.get(entry.userId);
        return {
          userId: entry.userId,
          username: user?.username ?? entry.userId,
          displayName: user?.displayName || user?.username || entry.userId,
          avatarUrl: user?.avatarUrl ?? "",
          status: entry.status,
          customText: entry.customText,
          lastSeen: entry.lastSeen,
          voiceMuted: voiceState?.muted ?? true,
          voiceCameraOn: voiceState?.cameraOn ?? false,
          currentRoomId: entry.currentRoomId,
          currentHouseId: entry.currentHouseId
        };
      })
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  }, [houseId, houseMembers, presence, roomId, users, voiceStates]);

  return {
    members,
    isLoading: isLoadingHouseMembers || isLoadingPresence || isLoadingUsers || isLoadingVoiceStates,
    error: houseMembersError ?? presenceError ?? usersError ?? voiceStatesError
  };
}
