import { Permission } from "@houseplan/types";
import { t } from "spacetimedb/server";
import {
  ROOM_CREATE_SCHEMA,
  ROOM_DELETE_SCHEMA,
  ROOM_PERMISSION_OVERRIDE_SCHEMA,
  ROOM_UPDATE_SCHEMA,
  deleteRoomArtifacts,
  findRoleById,
  findRoomById,
  findRoomPermissionOverride,
  nowIso,
  nextRoomPosition,
  parsePermissionBits,
  recordEvent,
  requireAuthenticatedUser,
  requireHouseMember,
  requireHouseOwner,
  requirePermission,
  spacetimedb,
  upsertPresence,
  upsertVoiceState
} from "../shared.js";

export const roomsSetRoomPermissionOverride = spacetimedb.reducer(
  {
    roomId: t.string(),
    roleId: t.string(),
    allow: t.string(),
    deny: t.string()
  },
  (ctx, args) => {
    const parsed = ROOM_PERMISSION_OVERRIDE_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid room override payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const room = findRoomById(ctx, parsed.data.roomId);
    if (!room) {
      throw new Error("Room not found.");
    }

    const house = requireHouseMember(ctx, room.houseId, user.id);
    if (house.ownerId !== user.id) {
      requirePermission(ctx, house.id, user.id, Permission.MANAGE_ROLES);
    }

    const role = findRoleById(ctx, parsed.data.roleId);
    if (!role || role.houseId !== house.id) {
      throw new Error("Role not found in this house.");
    }

    const allow = parsePermissionBits(parsed.data.allow);
    const deny = parsePermissionBits(parsed.data.deny);
    const existing = findRoomPermissionOverride(ctx, room.id, role.id);

    if (allow === 0n && deny === 0n) {
      if (existing) {
        ctx.db.roomPermissionOverrides.delete(existing);
      }
      recordEvent(
        ctx,
        "room_permission_override_cleared",
        `roomId=${room.id};roleId=${role.id};userId=${user.id}`
      );
      return;
    }

    if (existing) {
      ctx.db.roomPermissionOverrides.delete(existing);
    }

    ctx.db.roomPermissionOverrides.insert({
      id: existing?.id ?? ctx.newUuidV7().toString(),
      roomId: room.id,
      roleId: role.id,
      allow: allow.toString(),
      deny: deny.toString()
    });

    recordEvent(
      ctx,
      "room_permission_override_set",
      `roomId=${room.id};roleId=${role.id};allow=${allow.toString()};deny=${deny.toString()};userId=${user.id}`
    );
  }
);

export const roomsCreateRoom = spacetimedb.reducer(
  {
    houseId: t.string(),
    name: t.string(),
    type: t.string(),
    description: t.string(),
    position: t.i32().optional(),
    slowmodeSeconds: t.u32().optional()
  },
  (ctx, args) => {
    const parsed = ROOM_CREATE_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid create room payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const house = requireHouseOwner(ctx, parsed.data.houseId, user.id);
    const roomId = ctx.newUuidV7().toString();
    const position = parsed.data.position ?? nextRoomPosition(ctx, house.id);

    ctx.db.rooms.insert({
      id: roomId,
      houseId: house.id,
      name: parsed.data.name,
      type: parsed.data.type,
      description: parsed.data.description,
      position,
      slowmodeSeconds: parsed.data.slowmodeSeconds,
      createdAt: nowIso()
    });

    recordEvent(ctx, "room_created", `roomId=${roomId};houseId=${house.id};userId=${user.id}`);
  }
);

export const roomsUpdateRoom = spacetimedb.reducer(
  {
    roomId: t.string(),
    name: t.string(),
    type: t.string(),
    description: t.string(),
    position: t.i32(),
    slowmodeSeconds: t.u32()
  },
  (ctx, args) => {
    const parsed = ROOM_UPDATE_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid update room payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const room = findRoomById(ctx, parsed.data.roomId);
    if (!room) {
      throw new Error("Room not found.");
    }

    requireHouseMember(ctx, room.houseId, user.id);
    requirePermission(ctx, room.houseId, user.id, Permission.MANAGE_ROOMS, room.id);
    ctx.db.rooms.delete(room);
    ctx.db.rooms.insert({
      ...room,
      name: parsed.data.name,
      type: parsed.data.type,
      description: parsed.data.description,
      position: parsed.data.position,
      slowmodeSeconds: parsed.data.slowmodeSeconds
    });

    recordEvent(ctx, "room_updated", `roomId=${room.id};houseId=${room.houseId};userId=${user.id}`);
  }
);

export const roomsDeleteRoom = spacetimedb.reducer(
  {
    roomId: t.string()
  },
  (ctx, args) => {
    const parsed = ROOM_DELETE_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid delete room payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const room = findRoomById(ctx, parsed.data.roomId);
    if (!room) {
      throw new Error("Room not found.");
    }

    requireHouseMember(ctx, room.houseId, user.id);
    requirePermission(ctx, room.houseId, user.id, Permission.MANAGE_ROOMS, room.id);
    deleteRoomArtifacts(ctx, room.id);
    ctx.db.rooms.delete(room);

    for (const presence of ctx.db.presence.iter()) {
      if (presence.currentRoomId === room.id) {
        upsertPresence(
          ctx,
          presence.userId,
          undefined,
          undefined,
          presence.currentHouseId || room.houseId,
          ""
        );
        upsertVoiceState(ctx, presence.userId, true, false);
      }
    }

    recordEvent(ctx, "room_deleted", `roomId=${room.id};houseId=${room.houseId};userId=${user.id}`);
  }
);
