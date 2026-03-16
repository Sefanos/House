import { Permission } from "@houseplan/types";
import { t } from "spacetimedb/server";
import {
  HOUSE_BAN_MEMBER_SCHEMA,
  HOUSE_CREATE_INVITE_SCHEMA,
  HOUSE_CREATE_SCHEMA,
  HOUSE_DELETE_SCHEMA,
  HOUSE_JOIN_BY_INVITE_SCHEMA,
  HOUSE_KICK_MEMBER_SCHEMA,
  HOUSE_REVOKE_INVITE_SCHEMA,
  HOUSE_UNBAN_MEMBER_SCHEMA,
  HOUSE_UPDATE_SCHEMA,
  deleteHouseBadgeArtifacts,
  clearScreenShare,
  createDefaultInvite,
  createDefaultRole,
  deleteHouseRoleArtifacts,
  deleteRoomArtifacts,
  findHouseBan,
  findHouseById,
  findHouseMember,
  findInviteByCode,
  findPresenceByUserId,
  findUserById,
  houseBansByHouseId,
  houseMembersByHouseId,
  invitesByHouseId,
  memberRolesByHouseAndUser,
  normalizeInviteCode,
  nowIso,
  recordEvent,
  requireAuthenticatedUser,
  requireHouseMember,
  requireHouseOwner,
  requirePermission,
  roomsByHouseId,
  spacetimedb,
  upsertPresence,
  upsertVoiceState,
  userBadgesByHouseId
} from "../shared.js";

function requireHouseModerationPermission(
  ctx: Parameters<typeof requirePermission>[0],
  houseId: string,
  actorUserId: string,
  permission: bigint
) {
  const house = requireHouseMember(ctx, houseId, actorUserId);
  if (house.ownerId !== actorUserId) {
    requirePermission(ctx, house.id, actorUserId, permission);
  }
  return house;
}

function removeMemberState(ctx: Parameters<typeof requirePermission>[0], houseId: string, userId: string) {
  const member = findHouseMember(ctx, houseId, userId);
  if (member) {
    ctx.db.houseMembers.delete(member);
  }

  for (const memberRole of memberRolesByHouseAndUser(ctx, houseId, userId)) {
    ctx.db.memberRoles.delete(memberRole);
  }

  for (const userBadge of userBadgesByHouseId(ctx, houseId)) {
    if (userBadge.userId === userId) {
      ctx.db.userBadges.delete(userBadge);
    }
  }

  const presence = findPresenceByUserId(ctx, userId);
  if (presence?.currentHouseId === houseId) {
    upsertPresence(ctx, userId, undefined, undefined, "", "");
    upsertVoiceState(ctx, userId, true, false);
    clearScreenShare(ctx, userId);
  }
}

function newInviteCode(ctx: Parameters<typeof requirePermission>[0]): string {
  let code = ctx.newUuidV7().toString().replace(/-/g, "").slice(-8).toUpperCase();
  while (findInviteByCode(ctx, code)) {
    code = ctx.newUuidV7().toString().replace(/-/g, "").slice(-8).toUpperCase();
  }
  return code;
}

export const houseCreateHouse = spacetimedb.reducer(
  {
    name: t.string(),
    description: t.string(),
    iconUrl: t.string(),
    isPublic: t.bool(),
    themeId: t.string(),
    accentColor: t.string()
  },
  (ctx, args) => {
    const parsed = HOUSE_CREATE_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid create house payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const houseId = ctx.newUuidV7().toString();
    const createdAt = nowIso();

    ctx.db.houses.insert({
      id: houseId,
      name: parsed.data.name,
      description: parsed.data.description,
      iconUrl: parsed.data.iconUrl,
      ownerId: user.id,
      isPublic: parsed.data.isPublic,
      tags: "[]",
      themeId: parsed.data.themeId,
      accentColor: parsed.data.accentColor,
      createdAt
    });

    ctx.db.houseMembers.insert({
      id: ctx.newUuidV7().toString(),
      houseId,
      userId: user.id,
      joinedAt: createdAt
    });

    createDefaultRole(ctx, houseId);
    createDefaultInvite(ctx, houseId, user.id);
    upsertPresence(ctx, user.id, undefined, undefined, houseId, "");
    upsertVoiceState(ctx, user.id, true, false);
    clearScreenShare(ctx, user.id);
    recordEvent(ctx, "house_created", `houseId=${houseId};ownerId=${user.id}`);
  }
);

export const houseUpdateHouse = spacetimedb.reducer(
  {
    houseId: t.string(),
    name: t.string(),
    description: t.string(),
    iconUrl: t.string(),
    isPublic: t.bool(),
    themeId: t.string(),
    accentColor: t.string()
  },
  (ctx, args) => {
    const parsed = HOUSE_UPDATE_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid update house payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const house = requireHouseMember(ctx, parsed.data.houseId, user.id);
    requirePermission(ctx, house.id, user.id, Permission.MANAGE_ROOMS);

    ctx.db.houses.delete(house);
    ctx.db.houses.insert({
      ...house,
      name: parsed.data.name,
      description: parsed.data.description,
      iconUrl: parsed.data.iconUrl,
      isPublic: parsed.data.isPublic,
      themeId: parsed.data.themeId,
      accentColor: parsed.data.accentColor
    });

    recordEvent(ctx, "house_updated", `houseId=${house.id};userId=${user.id}`);
  }
);

export const houseDeleteHouse = spacetimedb.reducer(
  {
    houseId: t.string()
  },
  (ctx, args) => {
    const parsed = HOUSE_DELETE_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid delete house payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const house = requireHouseOwner(ctx, parsed.data.houseId, user.id);

    for (const member of houseMembersByHouseId(ctx, house.id)) {
      ctx.db.houseMembers.delete(member);
      const presence = findPresenceByUserId(ctx, member.userId);
      if (presence?.currentHouseId === house.id) {
        upsertPresence(ctx, member.userId, undefined, undefined, "", "");
        upsertVoiceState(ctx, member.userId, true, false);
        clearScreenShare(ctx, member.userId);
      }
    }

    for (const invite of invitesByHouseId(ctx, house.id)) {
      ctx.db.invites.delete(invite);
    }

    for (const houseBan of houseBansByHouseId(ctx, house.id)) {
      ctx.db.houseBans.delete(houseBan);
    }

    deleteHouseRoleArtifacts(ctx, house.id);
    deleteHouseBadgeArtifacts(ctx, house.id);

    for (const room of roomsByHouseId(ctx, house.id)) {
      deleteRoomArtifacts(ctx, room.id);
      ctx.db.rooms.delete(room);
    }

    ctx.db.houses.delete(house);
    recordEvent(ctx, "house_deleted", `houseId=${house.id};userId=${user.id}`);
  }
);

export const houseCreateInvite = spacetimedb.reducer(
  {
    houseId: t.string(),
    maxUses: t.u32(),
    expiresInSeconds: t.u32()
  },
  (ctx, args) => {
    const parsed = HOUSE_CREATE_INVITE_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid create invite payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const house = requireHouseModerationPermission(ctx, parsed.data.houseId, user.id, Permission.MANAGE_INVITES);

    const code = newInviteCode(ctx);
    const createdAt = nowIso();
    const expiresAt =
      parsed.data.expiresInSeconds > 0
        ? new Date(Date.now() + parsed.data.expiresInSeconds * 1000).toISOString()
        : undefined;
    const maxUses = parsed.data.maxUses > 0 ? parsed.data.maxUses : undefined;

    ctx.db.invites.insert({
      code,
      houseId: house.id,
      createdBy: user.id,
      expiresAt,
      maxUses,
      uses: 0,
      createdAt
    });

    recordEvent(
      ctx,
      "house_invite_created",
      `houseId=${house.id};code=${code};createdBy=${user.id};maxUses=${maxUses ?? "unlimited"}`
    );
  }
);

export const houseRevokeInvite = spacetimedb.reducer(
  {
    houseId: t.string(),
    code: t.string()
  },
  (ctx, args) => {
    const parsed = HOUSE_REVOKE_INVITE_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid revoke invite payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const house = requireHouseModerationPermission(ctx, parsed.data.houseId, user.id, Permission.MANAGE_INVITES);

    const code = normalizeInviteCode(parsed.data.code);
    const invite = findInviteByCode(ctx, code);
    if (!invite || invite.houseId !== house.id) {
      throw new Error("Invite not found in this house.");
    }

    ctx.db.invites.delete(invite);
    recordEvent(ctx, "house_invite_revoked", `houseId=${house.id};code=${code};revokedBy=${user.id}`);
  }
);

export const houseJoinByInvite = spacetimedb.reducer(
  {
    code: t.string()
  },
  (ctx, args) => {
    const parsed = HOUSE_JOIN_BY_INVITE_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid invite payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const code = normalizeInviteCode(parsed.data.code);
    const invite = findInviteByCode(ctx, code);
    if (!invite) {
      throw new Error("Invite not found.");
    }

    const house = findHouseById(ctx, invite.houseId);
    if (!house) {
      throw new Error("House not found.");
    }

    if (findHouseBan(ctx, house.id, user.id)) {
      throw new Error("You are banned from this house.");
    }

    if (invite.expiresAt && Date.parse(invite.expiresAt) <= Date.now()) {
      throw new Error("Invite expired.");
    }

    if (invite.maxUses !== undefined && invite.uses >= invite.maxUses) {
      throw new Error("Invite has reached max uses.");
    }

    if (findHouseMember(ctx, house.id, user.id)) {
      throw new Error("You are already a member of this house.");
    }

    ctx.db.houseMembers.insert({
      id: ctx.newUuidV7().toString(),
      houseId: house.id,
      userId: user.id,
      joinedAt: nowIso()
    });

    ctx.db.invites.delete(invite);
    ctx.db.invites.insert({
      ...invite,
      uses: invite.uses + 1
    });

    upsertPresence(ctx, user.id, undefined, undefined, house.id, "");
    upsertVoiceState(ctx, user.id, true, false);
    clearScreenShare(ctx, user.id);
    recordEvent(ctx, "house_joined_by_invite", `houseId=${house.id};userId=${user.id};code=${code}`);
  }
);

export const houseKickMember = spacetimedb.reducer(
  {
    houseId: t.string(),
    userId: t.string()
  },
  (ctx, args) => {
    const parsed = HOUSE_KICK_MEMBER_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid kick member payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const house = requireHouseModerationPermission(ctx, parsed.data.houseId, user.id, Permission.KICK_MEMBERS);
    if (house.ownerId === parsed.data.userId) {
      throw new Error("Owner cannot be kicked from their own house.");
    }

    const member = findHouseMember(ctx, house.id, parsed.data.userId);
    if (!member) {
      throw new Error("Member not found in house.");
    }

    removeMemberState(ctx, house.id, parsed.data.userId);

    recordEvent(ctx, "house_member_kicked", `houseId=${house.id};actorId=${user.id};userId=${parsed.data.userId}`);
  }
);

export const houseBanMember = spacetimedb.reducer(
  {
    houseId: t.string(),
    userId: t.string(),
    reason: t.string()
  },
  (ctx, args) => {
    const parsed = HOUSE_BAN_MEMBER_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid ban member payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const house = requireHouseModerationPermission(ctx, parsed.data.houseId, user.id, Permission.BAN_MEMBERS);

    if (house.ownerId === parsed.data.userId) {
      throw new Error("Owner cannot be banned from their own house.");
    }

    if (parsed.data.userId === user.id) {
      throw new Error("You cannot ban yourself.");
    }

    const targetUser = findUserById(ctx, parsed.data.userId);
    if (!targetUser) {
      throw new Error("Target user not found.");
    }

    const existingBan = findHouseBan(ctx, house.id, parsed.data.userId);
    if (existingBan) {
      ctx.db.houseBans.delete(existingBan);
    }

    removeMemberState(ctx, house.id, parsed.data.userId);

    ctx.db.houseBans.insert({
      id: existingBan?.id ?? ctx.newUuidV7().toString(),
      houseId: house.id,
      userId: parsed.data.userId,
      bannedBy: user.id,
      reason: parsed.data.reason,
      bannedAt: nowIso()
    });

    recordEvent(
      ctx,
      "house_member_banned",
      `houseId=${house.id};actorId=${user.id};userId=${parsed.data.userId};reason=${parsed.data.reason || "none"}`
    );
  }
);

export const houseUnbanMember = spacetimedb.reducer(
  {
    houseId: t.string(),
    userId: t.string()
  },
  (ctx, args) => {
    const parsed = HOUSE_UNBAN_MEMBER_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid unban member payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const house = requireHouseModerationPermission(ctx, parsed.data.houseId, user.id, Permission.BAN_MEMBERS);

    const existingBan = findHouseBan(ctx, house.id, parsed.data.userId);
    if (!existingBan) {
      throw new Error("Ban not found for this user.");
    }

    ctx.db.houseBans.delete(existingBan);
    recordEvent(ctx, "house_member_unbanned", `houseId=${house.id};actorId=${user.id};userId=${parsed.data.userId}`);
  }
);
