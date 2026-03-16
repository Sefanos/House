import { Permission } from "@houseplan/types";
import { t } from "spacetimedb/server";
import {
  VOICE_JOIN_SCHEMA,
  VOICE_UPDATE_MEDIA_SCHEMA,
  clearScreenShare,
  findPresenceByUserId,
  findRoomById,
  findScreenShareByUserId,
  recordEvent,
  requireAuthenticatedUser,
  requireHouseMember,
  requirePermission,
  spacetimedb,
  upsertPresence,
  upsertScreenShare,
  upsertVoiceState
} from "../shared.js";

export const voiceJoinRoom = spacetimedb.reducer(
  {
    roomId: t.string()
  },
  (ctx, args) => {
    const parsed = VOICE_JOIN_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid voice join payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const room = findRoomById(ctx, parsed.data.roomId);
    if (!room) {
      throw new Error("Room not found.");
    }
    if (room.type !== "voice") {
      throw new Error("Only voice rooms can be joined.");
    }

    requireHouseMember(ctx, room.houseId, user.id);
    requirePermission(ctx, room.houseId, user.id, Permission.VIEW_ROOM, room.id);
    requirePermission(ctx, room.houseId, user.id, Permission.CONNECT_VOICE, room.id);

    upsertPresence(ctx, user.id, "online", undefined, room.houseId, room.id);
    upsertVoiceState(ctx, user.id, true, false);
    recordEvent(ctx, "voice_joined_room", `houseId=${room.houseId};roomId=${room.id};userId=${user.id}`);
  }
);

export const voiceLeaveRoom = spacetimedb.reducer((ctx) => {
  const { user } = requireAuthenticatedUser(ctx);
  const presence = findPresenceByUserId(ctx, user.id);
  if (!presence || !presence.currentRoomId) {
    clearScreenShare(ctx, user.id);
    return;
  }

  upsertPresence(ctx, user.id, undefined, undefined, presence.currentHouseId, "");
  upsertVoiceState(ctx, user.id, true, false);
  clearScreenShare(ctx, user.id);
  recordEvent(ctx, "voice_left_room", `roomId=${presence.currentRoomId};userId=${user.id}`);
});

export const voiceUpdateMediaState = spacetimedb.reducer(
  {
    muted: t.bool(),
    cameraOn: t.bool()
  },
  (ctx, args) => {
    const parsed = VOICE_UPDATE_MEDIA_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid voice media payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const presence = findPresenceByUserId(ctx, user.id);
    if (!presence || !presence.currentRoomId) {
      throw new Error("Join a voice room before updating media state.");
    }

    const room = findRoomById(ctx, presence.currentRoomId);
    if (!room) {
      throw new Error("Voice room not found.");
    }
    if (room.type !== "voice") {
      throw new Error("Current room is not a voice room.");
    }

    requireHouseMember(ctx, room.houseId, user.id);
    requirePermission(ctx, room.houseId, user.id, Permission.VIEW_ROOM, room.id);
    requirePermission(ctx, room.houseId, user.id, Permission.CONNECT_VOICE, room.id);

    if (!parsed.data.muted) {
      requirePermission(ctx, room.houseId, user.id, Permission.SPEAK, room.id);
    }
    if (parsed.data.cameraOn) {
      requirePermission(ctx, room.houseId, user.id, Permission.SHARE_CAMERA, room.id);
    }

    upsertPresence(ctx, user.id, undefined, undefined, room.houseId, room.id);
    upsertVoiceState(ctx, user.id, parsed.data.muted, parsed.data.cameraOn);

    recordEvent(
      ctx,
      "voice_media_state_updated",
      `roomId=${room.id};userId=${user.id};muted=${parsed.data.muted};cameraOn=${parsed.data.cameraOn}`
    );
  }
);

export const voiceStartScreenShare = spacetimedb.reducer((ctx) => {
  const { user } = requireAuthenticatedUser(ctx);
  const presence = findPresenceByUserId(ctx, user.id);
  if (!presence || !presence.currentRoomId) {
    throw new Error("Join a voice room before sharing your screen.");
  }

  const room = findRoomById(ctx, presence.currentRoomId);
  if (!room) {
    throw new Error("Voice room not found.");
  }
  if (room.type !== "voice") {
    throw new Error("Current room is not a voice room.");
  }

  requireHouseMember(ctx, room.houseId, user.id);
  requirePermission(ctx, room.houseId, user.id, Permission.VIEW_ROOM, room.id);
  requirePermission(ctx, room.houseId, user.id, Permission.CONNECT_VOICE, room.id);
  requirePermission(ctx, room.houseId, user.id, Permission.SHARE_SCREEN, room.id);

  upsertScreenShare(ctx, user.id, room.houseId, room.id);
  recordEvent(ctx, "voice_screen_share_started", `roomId=${room.id};userId=${user.id}`);
});

export const voiceStopScreenShare = spacetimedb.reducer((ctx) => {
  const { user } = requireAuthenticatedUser(ctx);
  const existingShare = findScreenShareByUserId(ctx, user.id);
  if (!existingShare) {
    return;
  }

  clearScreenShare(ctx, user.id);
  recordEvent(ctx, "voice_screen_share_stopped", `roomId=${existingShare.roomId};userId=${user.id}`);
});
