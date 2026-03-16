import { type InferSchema, type ReducerCtx, schema, table, t } from "spacetimedb/server";
import { z } from "zod";
import { DEFAULT_MEMBER_PERMISSIONS } from "@houseplan/types";
import { hasPermission, resolvePermissions } from "../lib/permissions";

const REGISTER_SCHEMA = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(24, "Username must be at most 24 characters.")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128)
});

const LOGIN_SCHEMA = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1)
});

const PROFILE_SCHEMA = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters.")
    .max(32, "Display name must be at most 32 characters."),
  bio: z.string().trim().max(190, "Bio must be 190 characters or less.").optional().default(""),
  avatarUrl: z.string().trim().max(512, "Avatar URL is too long.").optional().default("")
});

const STATUS_SCHEMA = z.object({
  status: z.enum(["online", "idle", "dnd", "offline"]),
  customText: z
    .string()
    .trim()
    .max(80, "Custom status must be 80 characters or less.")
    .optional()
    .default("")
});

const HEX_COLOR_OR_EMPTY_SCHEMA = z
  .string()
  .trim()
  .regex(/^$|^#[0-9a-fA-F]{6}$/, "accentColor must be empty or a hex color like #1A2B3C.");

const HOUSE_CREATE_SCHEMA = z.object({
  name: z
    .string()
    .trim()
    .min(2, "House name must be at least 2 characters.")
    .max(60, "House name must be at most 60 characters."),
  description: z
    .string()
    .trim()
    .max(280, "House description must be at most 280 characters.")
    .optional()
    .default(""),
  iconUrl: z.string().trim().max(512, "House icon URL is too long.").optional().default(""),
  isPublic: z.boolean().optional().default(false),
  themeId: z.string().trim().max(64, "House theme id is too long.").optional().default(""),
  accentColor: HEX_COLOR_OR_EMPTY_SCHEMA.optional().default("")
});

const HOUSE_UPDATE_SCHEMA = HOUSE_CREATE_SCHEMA.extend({
  houseId: z.string().trim().min(1, "houseId is required.")
});

const HOUSE_DELETE_SCHEMA = z.object({
  houseId: z.string().trim().min(1, "houseId is required.")
});

const HOUSE_JOIN_BY_INVITE_SCHEMA = z.object({
  code: z.string().trim().min(4).max(32)
});

const HOUSE_KICK_MEMBER_SCHEMA = z.object({
  houseId: z.string().trim().min(1, "houseId is required."),
  userId: z.string().trim().min(1, "userId is required.")
});

const HOUSE_CREATE_INVITE_SCHEMA = z.object({
  houseId: z.string().trim().min(1, "houseId is required."),
  maxUses: z.number().int().min(0).max(1000).optional().default(0),
  expiresInSeconds: z.number().int().min(0).max(24 * 30 * 60 * 60).optional().default(0)
});

const HOUSE_REVOKE_INVITE_SCHEMA = z.object({
  houseId: z.string().trim().min(1, "houseId is required."),
  code: z.string().trim().min(4).max(32)
});

const HOUSE_BAN_MEMBER_SCHEMA = z.object({
  houseId: z.string().trim().min(1, "houseId is required."),
  userId: z.string().trim().min(1, "userId is required."),
  reason: z.string().trim().max(280, "Ban reason must be at most 280 characters.").optional().default("")
});

const HOUSE_UNBAN_MEMBER_SCHEMA = z.object({
  houseId: z.string().trim().min(1, "houseId is required."),
  userId: z.string().trim().min(1, "userId is required.")
});

const ROOM_CREATE_SCHEMA = z.object({
  houseId: z.string().trim().min(1, "houseId is required."),
  name: z
    .string()
    .trim()
    .min(1, "Room name must be at least 1 character.")
    .max(60, "Room name must be at most 60 characters."),
  type: z.enum(["chat", "voice"]),
  description: z
    .string()
    .trim()
    .max(280, "Room description must be at most 280 characters.")
    .optional()
    .default(""),
  position: z.number().int().min(0).optional(),
  slowmodeSeconds: z.number().int().min(0).max(21600).optional().default(0)
});

const ROOM_UPDATE_SCHEMA = z.object({
  roomId: z.string().trim().min(1, "roomId is required."),
  name: z
    .string()
    .trim()
    .min(1, "Room name must be at least 1 character.")
    .max(60, "Room name must be at most 60 characters."),
  type: z.enum(["chat", "voice"]),
  description: z
    .string()
    .trim()
    .max(280, "Room description must be at most 280 characters.")
    .optional()
    .default(""),
  position: z.number().int().min(0),
  slowmodeSeconds: z.number().int().min(0).max(21600)
});

const ROOM_DELETE_SCHEMA = z.object({
  roomId: z.string().trim().min(1, "roomId is required.")
});

const VOICE_JOIN_SCHEMA = z.object({
  roomId: z.string().trim().min(1, "roomId is required.")
});

const BOOLEANISH_SCHEMA = z
  .union([z.boolean(), z.number().int().min(0).max(1)])
  .transform((value) => value === true || value === 1);

const VOICE_UPDATE_MEDIA_SCHEMA = z.object({
  muted: BOOLEANISH_SCHEMA,
  cameraOn: BOOLEANISH_SCHEMA
});

const MESSAGE_ATTACHMENT_SCHEMA = z.object({
  url: z.string().trim().min(1, "Attachment URL is required.").max(1024, "Attachment URL is too long."),
  filename: z.string().trim().min(1, "Attachment filename is required.").max(256, "Attachment filename is too long."),
  mimeType: z.string().trim().min(1, "Attachment mimeType is required.").max(128, "Attachment mimeType is too long."),
  sizeBytes: z.number().int().positive().max(20 * 1024 * 1024, "Attachment too large.")
});

const MESSAGE_ATTACHMENTS_SCHEMA = z.array(MESSAGE_ATTACHMENT_SCHEMA).max(10, "Message supports at most 10 attachments.");

const MESSAGE_SEND_SCHEMA = z.object({
  roomId: z.string().trim().min(1, "roomId is required."),
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message must be at most 2000 characters."),
  threadParentId: z.string().trim().optional().default(""),
  attachmentsJson: z.string().optional().default("[]")
});

const MESSAGE_EDIT_SCHEMA = z.object({
  messageId: z.string().trim().min(1, "messageId is required."),
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message must be at most 2000 characters.")
});

const MESSAGE_DELETE_SCHEMA = z.object({
  messageId: z.string().trim().min(1, "messageId is required.")
});

const MESSAGE_REACTION_SCHEMA = z.object({
  messageId: z.string().trim().min(1, "messageId is required."),
  emoji: z.string().trim().min(1, "Emoji is required.").max(64, "Emoji is too long.")
});

const ROLE_CREATE_SCHEMA = z.object({
  houseId: z.string().trim().min(1, "houseId is required."),
  name: z.string().trim().min(1, "Role name is required.").max(32, "Role name is too long."),
  color: z.string().trim().max(32, "Role color is too long.").optional().default(""),
  position: z.number().int().min(0).optional(),
  permissions: z.string().trim().regex(/^[0-9]+$/, "permissions must be an unsigned integer bitfield.")
});

const ROLE_UPDATE_SCHEMA = z.object({
  roleId: z.string().trim().min(1, "roleId is required."),
  name: z.string().trim().min(1, "Role name is required.").max(32, "Role name is too long."),
  color: z.string().trim().max(32, "Role color is too long.").optional().default(""),
  position: z.number().int().min(0),
  permissions: z.string().trim().regex(/^[0-9]+$/, "permissions must be an unsigned integer bitfield.")
});

const ROLE_DELETE_SCHEMA = z.object({
  roleId: z.string().trim().min(1, "roleId is required.")
});

const ROLE_ASSIGN_SCHEMA = z.object({
  houseId: z.string().trim().min(1, "houseId is required."),
  userId: z.string().trim().min(1, "userId is required."),
  roleId: z.string().trim().min(1, "roleId is required.")
});

const ROLE_REVOKE_SCHEMA = ROLE_ASSIGN_SCHEMA;

const ROOM_PERMISSION_OVERRIDE_SCHEMA = z.object({
  roomId: z.string().trim().min(1, "roomId is required."),
  roleId: z.string().trim().min(1, "roleId is required."),
  allow: z.string().trim().regex(/^[0-9]+$/, "allow must be an unsigned integer bitfield."),
  deny: z.string().trim().regex(/^[0-9]+$/, "deny must be an unsigned integer bitfield.")
});

const DM_SEND_SCHEMA = z.object({
  toUserId: z.string().trim().min(1, "toUserId is required."),
  content: z
    .string()
    .trim()
    .min(1, "DM cannot be empty.")
    .max(2000, "DM must be at most 2000 characters.")
});

const DM_EDIT_SCHEMA = z.object({
  dmMessageId: z.string().trim().min(1, "dmMessageId is required."),
  content: z
    .string()
    .trim()
    .min(1, "DM cannot be empty.")
    .max(2000, "DM must be at most 2000 characters.")
});

const DM_DELETE_SCHEMA = z.object({
  dmMessageId: z.string().trim().min(1, "dmMessageId is required.")
});

const BADGE_GRANT_SCHEMA = z.object({
  houseId: z.string().trim().min(1, "houseId is required."),
  userId: z.string().trim().min(1, "userId is required."),
  badgeName: z.string().trim().min(1, "badgeName is required.").max(40, "badgeName is too long."),
  badgeIcon: z.string().trim().max(256, "badgeIcon is too long.").optional().default(""),
  badgeType: z.enum(["earned", "achievement", "house"]).optional().default("house")
});

const BADGE_REVOKE_SCHEMA = z.object({
  houseId: z.string().trim().min(1, "houseId is required."),
  userId: z.string().trim().min(1, "userId is required."),
  badgeId: z.string().trim().min(1, "badgeId is required.")
});

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export const spacetimedb = schema({
  bootstrapEvents: table(
    { public: true, name: "bootstrap_events" },
    {
      event: t.string(),
      createdAt: t.string()
    }
  ),
  users: table(
    { public: true, name: "users" },
    {
      id: t.string().primaryKey(),
      username: t.string().unique(),
      passwordHash: t.string(),
      createdAt: t.string(),
      displayName: t.string().optional(),
      avatarUrl: t.string().optional(),
      bio: t.string().optional()
    }
  ),
  sessions: table(
    { public: false, name: "sessions" },
    {
      token: t.string().primaryKey(),
      userId: t.string().index(),
      expiresAt: t.string(),
      createdAt: t.string()
    }
  ),
  presence: table(
    { public: true, name: "presence" },
    {
      userId: t.string().primaryKey(),
      status: t.string(),
      customText: t.string().default(""),
      lastSeen: t.string(),
      currentHouseId: t.string().default(""),
      currentRoomId: t.string().default("")
    }
  ),
  voiceStates: table(
    { public: true, name: "voice_states" },
    {
      userId: t.string().primaryKey(),
      muted: t.bool(),
      cameraOn: t.bool(),
      updatedAt: t.string()
    }
  ),
  screenShares: table(
    { public: true, name: "screen_shares" },
    {
      userId: t.string().primaryKey(),
      houseId: t.string().index(),
      roomId: t.string().index(),
      startedAt: t.string()
    }
  ),
  houses: table(
    { public: true, name: "houses" },
    {
      id: t.string().primaryKey(),
      name: t.string(),
      description: t.string().default(""),
      iconUrl: t.string().default(""),
      ownerId: t.string().index(),
      isPublic: t.bool().default(false),
      tags: t.string().default("[]"),
      themeId: t.string().default(""),
      accentColor: t.string().default(""),
      createdAt: t.string()
    }
  ),
  houseMembers: table(
    { public: true, name: "house_members" },
    {
      id: t.string().primaryKey(),
      houseId: t.string().index(),
      userId: t.string().index(),
      joinedAt: t.string()
    }
  ),
  invites: table(
    { public: true, name: "invites" },
    {
      code: t.string().primaryKey(),
      houseId: t.string().index(),
      createdBy: t.string(),
      expiresAt: t.string().optional(),
      maxUses: t.u32().optional(),
      uses: t.u32().default(0),
      createdAt: t.string()
    }
  ),
  houseBans: table(
    { public: true, name: "house_bans" },
    {
      id: t.string().primaryKey(),
      houseId: t.string().index(),
      userId: t.string().index(),
      bannedBy: t.string(),
      reason: t.string().default(""),
      bannedAt: t.string()
    }
  ),
  roles: table(
    { public: true, name: "roles" },
    {
      id: t.string().primaryKey(),
      houseId: t.string().index(),
      name: t.string(),
      color: t.string().default(""),
      position: t.i32().default(0),
      permissions: t.string().default("0"),
      isDefault: t.bool().default(false),
      createdAt: t.string()
    }
  ),
  memberRoles: table(
    { public: true, name: "member_roles" },
    {
      id: t.string().primaryKey(),
      houseId: t.string().index(),
      userId: t.string().index(),
      roleId: t.string().index(),
      assignedBy: t.string(),
      assignedAt: t.string()
    }
  ),
  roomPermissionOverrides: table(
    { public: true, name: "room_permission_overrides" },
    {
      id: t.string().primaryKey(),
      roomId: t.string().index(),
      roleId: t.string().index(),
      allow: t.string().default("0"),
      deny: t.string().default("0")
    }
  ),
  rooms: table(
    { public: true, name: "rooms" },
    {
      id: t.string().primaryKey(),
      houseId: t.string().index(),
      name: t.string(),
      type: t.string(),
      description: t.string().default(""),
      position: t.i32().default(0),
      slowmodeSeconds: t.u32().default(0),
      createdAt: t.string()
    }
  ),
  messages: table(
    { public: true, name: "messages" },
    {
      id: t.string().primaryKey(),
      roomId: t.string().index(),
      authorId: t.string().index(),
      content: t.string(),
      editedAt: t.string().default(""),
      deletedAt: t.string().default(""),
      threadParentId: t.string().default(""),
      isPinned: t.bool().default(false),
      createdAt: t.string()
    }
  ),
  dmMessages: table(
    { public: true, name: "dm_messages" },
    {
      id: t.string().primaryKey(),
      conversationKey: t.string().index(),
      fromUserId: t.string().index(),
      toUserId: t.string().index(),
      content: t.string(),
      editedAt: t.string().default(""),
      deletedAt: t.string().default(""),
      createdAt: t.string()
    }
  ),
  attachments: table(
    { public: true, name: "attachments" },
    {
      id: t.string().primaryKey(),
      messageId: t.string().index(),
      url: t.string(),
      filename: t.string(),
      mimeType: t.string(),
      sizeBytes: t.u32(),
      createdAt: t.string()
    }
  ),
  reactions: table(
    { public: true, name: "reactions" },
    {
      id: t.string().primaryKey(),
      messageId: t.string().index(),
      userId: t.string().index(),
      emoji: t.string(),
      createdAt: t.string()
    }
  ),
  badges: table(
    { public: true, name: "badges" },
    {
      id: t.string().primaryKey(),
      houseId: t.string().index(),
      name: t.string(),
      icon: t.string().default(""),
      badgeType: t.string(),
      createdBy: t.string(),
      createdAt: t.string()
    }
  ),
  userBadges: table(
    { public: true, name: "user_badges" },
    {
      id: t.string().primaryKey(),
      houseId: t.string().index(),
      badgeId: t.string().index(),
      userId: t.string().index(),
      grantedBy: t.string(),
      grantedAt: t.string()
    }
  )
});

export default spacetimedb;
export type SpacetimeCtx = ReducerCtx<InferSchema<typeof spacetimedb>>;

function nowIso(): string {
  return new Date().toISOString();
}

function hashPassword(password: string): string {
  let hash = 2166136261;
  for (let i = 0; i < password.length; i += 1) {
    hash ^= password.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `hp1_${(hash >>> 0).toString(16)}`;
}

function findUserByUsername(ctx: SpacetimeCtx, username: string) {
  for (const user of ctx.db.users.iter()) {
    if (user.username === username) {
      return user;
    }
  }
  return null;
}

function findUserById(ctx: SpacetimeCtx, userId: string) {
  for (const user of ctx.db.users.iter()) {
    if (user.id === userId) {
      return user;
    }
  }
  return null;
}

function findSessionByToken(ctx: SpacetimeCtx, token: string) {
  for (const session of ctx.db.sessions.iter()) {
    if (session.token === token) {
      return session;
    }
  }
  return null;
}

function findPresenceByUserId(ctx: SpacetimeCtx, userId: string) {
  for (const presence of ctx.db.presence.iter()) {
    if (presence.userId === userId) {
      return presence;
    }
  }
  return null;
}

function findVoiceStateByUserId(ctx: SpacetimeCtx, userId: string) {
  for (const voiceState of ctx.db.voiceStates.iter()) {
    if (voiceState.userId === userId) {
      return voiceState;
    }
  }
  return null;
}

function findScreenShareByUserId(ctx: SpacetimeCtx, userId: string) {
  for (const screenShare of ctx.db.screenShares.iter()) {
    if (screenShare.userId === userId) {
      return screenShare;
    }
  }
  return null;
}

function findHouseById(ctx: SpacetimeCtx, houseId: string) {
  for (const house of ctx.db.houses.iter()) {
    if (house.id === houseId) {
      return house;
    }
  }
  return null;
}

function findHouseMember(ctx: SpacetimeCtx, houseId: string, userId: string) {
  for (const member of ctx.db.houseMembers.iter()) {
    if (member.houseId === houseId && member.userId === userId) {
      return member;
    }
  }
  return null;
}

function findInviteByCode(ctx: SpacetimeCtx, code: string) {
  for (const invite of ctx.db.invites.iter()) {
    if (invite.code === code) {
      return invite;
    }
  }
  return null;
}

function findHouseBan(ctx: SpacetimeCtx, houseId: string, userId: string) {
  for (const houseBan of ctx.db.houseBans.iter()) {
    if (houseBan.houseId === houseId && houseBan.userId === userId) {
      return houseBan;
    }
  }
  return null;
}

function findRoomById(ctx: SpacetimeCtx, roomId: string) {
  for (const room of ctx.db.rooms.iter()) {
    if (room.id === roomId) {
      return room;
    }
  }
  return null;
}

function findMessageById(ctx: SpacetimeCtx, messageId: string) {
  for (const message of ctx.db.messages.iter()) {
    if (message.id === messageId) {
      return message;
    }
  }
  return null;
}

function findDMMessageById(ctx: SpacetimeCtx, dmMessageId: string) {
  for (const dmMessage of ctx.db.dmMessages.iter()) {
    if (dmMessage.id === dmMessageId) {
      return dmMessage;
    }
  }
  return null;
}

function findReaction(ctx: SpacetimeCtx, messageId: string, userId: string, emoji: string) {
  for (const reaction of ctx.db.reactions.iter()) {
    if (reaction.messageId === messageId && reaction.userId === userId && reaction.emoji === emoji) {
      return reaction;
    }
  }
  return null;
}

function findRoleById(ctx: SpacetimeCtx, roleId: string) {
  for (const role of ctx.db.roles.iter()) {
    if (role.id === roleId) {
      return role;
    }
  }
  return null;
}

function findMemberRole(ctx: SpacetimeCtx, houseId: string, userId: string, roleId: string) {
  for (const memberRole of ctx.db.memberRoles.iter()) {
    if (memberRole.houseId === houseId && memberRole.userId === userId && memberRole.roleId === roleId) {
      return memberRole;
    }
  }
  return null;
}

function findRoomPermissionOverride(ctx: SpacetimeCtx, roomId: string, roleId: string) {
  for (const override of ctx.db.roomPermissionOverrides.iter()) {
    if (override.roomId === roomId && override.roleId === roleId) {
      return override;
    }
  }
  return null;
}

function findBadgeById(ctx: SpacetimeCtx, badgeId: string) {
  for (const badge of ctx.db.badges.iter()) {
    if (badge.id === badgeId) {
      return badge;
    }
  }
  return null;
}

function findUserBadge(ctx: SpacetimeCtx, houseId: string, userId: string, badgeId: string) {
  for (const userBadge of ctx.db.userBadges.iter()) {
    if (userBadge.houseId === houseId && userBadge.userId === userId && userBadge.badgeId === badgeId) {
      return userBadge;
    }
  }
  return null;
}

function houseMembersByHouseId(ctx: SpacetimeCtx, houseId: string) {
  const members = [];
  for (const member of ctx.db.houseMembers.iter()) {
    if (member.houseId === houseId) {
      members.push(member);
    }
  }
  return members;
}

function invitesByHouseId(ctx: SpacetimeCtx, houseId: string) {
  const invites = [];
  for (const invite of ctx.db.invites.iter()) {
    if (invite.houseId === houseId) {
      invites.push(invite);
    }
  }
  return invites;
}

function houseBansByHouseId(ctx: SpacetimeCtx, houseId: string) {
  const bans = [];
  for (const houseBan of ctx.db.houseBans.iter()) {
    if (houseBan.houseId === houseId) {
      bans.push(houseBan);
    }
  }
  return bans;
}

function roomsByHouseId(ctx: SpacetimeCtx, houseId: string) {
  const rooms = [];
  for (const room of ctx.db.rooms.iter()) {
    if (room.houseId === houseId) {
      rooms.push(room);
    }
  }
  return rooms;
}

function rolesByHouseId(ctx: SpacetimeCtx, houseId: string) {
  const roles = [];
  for (const role of ctx.db.roles.iter()) {
    if (role.houseId === houseId) {
      roles.push(role);
    }
  }
  return roles;
}

function badgesByHouseId(ctx: SpacetimeCtx, houseId: string) {
  const badges = [];
  for (const badge of ctx.db.badges.iter()) {
    if (badge.houseId === houseId) {
      badges.push(badge);
    }
  }
  return badges;
}

function userBadgesByHouseId(ctx: SpacetimeCtx, houseId: string) {
  const userBadges = [];
  for (const userBadge of ctx.db.userBadges.iter()) {
    if (userBadge.houseId === houseId) {
      userBadges.push(userBadge);
    }
  }
  return userBadges;
}

function memberRolesByHouseAndUser(ctx: SpacetimeCtx, houseId: string, userId: string) {
  const roles = [];
  for (const memberRole of ctx.db.memberRoles.iter()) {
    if (memberRole.houseId === houseId && memberRole.userId === userId) {
      roles.push(memberRole);
    }
  }
  return roles;
}

function roomPermissionOverridesByRoomId(ctx: SpacetimeCtx, roomId: string) {
  const overrides = [];
  for (const override of ctx.db.roomPermissionOverrides.iter()) {
    if (override.roomId === roomId) {
      overrides.push(override);
    }
  }
  return overrides;
}

function screenSharesByRoomId(ctx: SpacetimeCtx, roomId: string) {
  const shares = [];
  for (const share of ctx.db.screenShares.iter()) {
    if (share.roomId === roomId) {
      shares.push(share);
    }
  }
  return shares;
}

function messagesByRoomId(ctx: SpacetimeCtx, roomId: string) {
  const messages = [];
  for (const message of ctx.db.messages.iter()) {
    if (message.roomId === roomId) {
      messages.push(message);
    }
  }
  return messages;
}

function reactionsByMessageId(ctx: SpacetimeCtx, messageId: string) {
  const reactions = [];
  for (const reaction of ctx.db.reactions.iter()) {
    if (reaction.messageId === messageId) {
      reactions.push(reaction);
    }
  }
  return reactions;
}

function attachmentsByMessageId(ctx: SpacetimeCtx, messageId: string) {
  const attachments = [];
  for (const attachment of ctx.db.attachments.iter()) {
    if (attachment.messageId === messageId) {
      attachments.push(attachment);
    }
  }
  return attachments;
}

function identityToken(ctx: SpacetimeCtx): string {
  return typeof ctx.sender.toHexString === "function" ? ctx.sender.toHexString() : String(ctx.sender);
}

function upsertSession(ctx: SpacetimeCtx, userId: string): string {
  const token = identityToken(ctx);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  const existing = findSessionByToken(ctx, token);
  if (existing) {
    ctx.db.sessions.delete(existing);
  }

  ctx.db.sessions.insert({
    token,
    userId,
    createdAt,
    expiresAt
  });

  return token;
}

function upsertPresence(
  ctx: SpacetimeCtx,
  userId: string,
  status?: "online" | "idle" | "dnd" | "offline",
  customText?: string,
  currentHouseId?: string,
  currentRoomId?: string
) {
  const existing = findPresenceByUserId(ctx, userId);
  const nextStatus = status ?? existing?.status ?? "online";
  const nextCustomText = customText ?? existing?.customText ?? "";
  const nextCurrentHouseId = currentHouseId ?? existing?.currentHouseId ?? "";
  const nextCurrentRoomId = currentRoomId ?? existing?.currentRoomId ?? "";

  if (existing) {
    ctx.db.presence.delete(existing);
  }

  ctx.db.presence.insert({
    userId,
    status: nextStatus,
    customText: nextCustomText,
    lastSeen: nowIso(),
    currentHouseId: nextCurrentHouseId,
    currentRoomId: nextCurrentRoomId
  });
}

function upsertVoiceState(ctx: SpacetimeCtx, userId: string, muted: boolean, cameraOn: boolean) {
  const existing = findVoiceStateByUserId(ctx, userId);
  if (existing) {
    ctx.db.voiceStates.delete(existing);
  }

  ctx.db.voiceStates.insert({
    userId,
    muted,
    cameraOn,
    updatedAt: nowIso()
  });
}

function upsertScreenShare(ctx: SpacetimeCtx, userId: string, houseId: string, roomId: string) {
  const existing = findScreenShareByUserId(ctx, userId);
  if (existing) {
    ctx.db.screenShares.delete(existing);
  }

  ctx.db.screenShares.insert({
    userId,
    houseId,
    roomId,
    startedAt: nowIso()
  });
}

function clearScreenShare(ctx: SpacetimeCtx, userId: string) {
  const existing = findScreenShareByUserId(ctx, userId);
  if (existing) {
    ctx.db.screenShares.delete(existing);
  }
}

function requireAuthenticatedUser(ctx: SpacetimeCtx) {
  const token = identityToken(ctx);
  const session = findSessionByToken(ctx, token);
  if (!session) {
    throw new Error("Not authenticated.");
  }

  if (Date.parse(session.expiresAt) <= Date.now()) {
    ctx.db.sessions.delete(session);
    throw new Error("Session expired.");
  }

  const user = findUserById(ctx, session.userId);
  if (!user) {
    throw new Error("Authenticated user not found.");
  }

  return { user, session };
}

function requireHouseOwner(ctx: SpacetimeCtx, houseId: string, userId: string) {
  const house = findHouseById(ctx, houseId);
  if (!house) {
    throw new Error("House not found.");
  }

  if (house.ownerId !== userId) {
    throw new Error("Only house owner can perform this action.");
  }

  return house;
}

function requireHouseMember(ctx: SpacetimeCtx, houseId: string, userId: string) {
  const house = findHouseById(ctx, houseId);
  if (!house) {
    throw new Error("House not found.");
  }
  if (!findHouseMember(ctx, houseId, userId)) {
    throw new Error("Only house members can perform this action.");
  }
  return house;
}

function parsePermissionBits(value: string): bigint {
  try {
    return BigInt(value || "0");
  } catch {
    throw new Error("Invalid permission bitfield.");
  }
}

function canonicalConversationKey(firstUserId: string, secondUserId: string): string {
  const ordered = [firstUserId, secondUserId].sort((a, b) => a.localeCompare(b));
  return `${ordered[0]}_${ordered[1]}`;
}

function roleIdsForPermissionResolution(ctx: SpacetimeCtx, houseId: string, userId: string) {
  const roleIds = new Set<string>();

  for (const role of rolesByHouseId(ctx, houseId)) {
    if (role.isDefault) {
      roleIds.add(role.id);
    }
  }

  for (const memberRole of memberRolesByHouseAndUser(ctx, houseId, userId)) {
    roleIds.add(memberRole.roleId);
  }

  return Array.from(roleIds);
}

function resolveUserPermissions(ctx: SpacetimeCtx, houseId: string, userId: string, roomId?: string) {
  const house = findHouseById(ctx, houseId);
  if (!house) {
    throw new Error("House not found.");
  }

  const roleIds = roleIdsForPermissionResolution(ctx, houseId, userId);
  let basePerms = 0n;
  for (const roleId of roleIds) {
    const role = findRoleById(ctx, roleId);
    if (!role) continue;
    basePerms |= parsePermissionBits(role.permissions);
  }

  const roomOverrides: Array<{ allow: bigint; deny: bigint }> = [];
  if (roomId != null) {
    for (const roleId of roleIds) {
      const override = findRoomPermissionOverride(ctx, roomId, roleId);
      if (!override) continue;
      roomOverrides.push({
        allow: parsePermissionBits(override.allow),
        deny: parsePermissionBits(override.deny)
      });
    }
  }

  return resolvePermissions({
    isOwner: house.ownerId === userId,
    basePerms,
    roomOverrides
  });
}

function requirePermission(
  ctx: SpacetimeCtx,
  houseId: string,
  userId: string,
  permission: bigint,
  roomId?: string
) {
  const resolved = resolveUserPermissions(ctx, houseId, userId, roomId);
  if (!hasPermission(resolved, permission)) {
    throw new Error("Missing required permission.");
  }
  return resolved;
}

function parseMessageAttachments(rawJson: string) {
  let parsed: unknown = [];
  try {
    parsed = JSON.parse(rawJson || "[]");
  } catch {
    throw new Error("attachmentsJson must be valid JSON.");
  }

  const validated = MESSAGE_ATTACHMENTS_SCHEMA.safeParse(parsed);
  if (!validated.success) {
    throw new Error(validated.error.issues[0]?.message ?? "Invalid message attachments payload.");
  }
  return validated.data;
}

function deleteMessageArtifacts(ctx: SpacetimeCtx, messageId: string) {
  for (const reaction of reactionsByMessageId(ctx, messageId)) {
    ctx.db.reactions.delete(reaction);
  }
  for (const attachment of attachmentsByMessageId(ctx, messageId)) {
    ctx.db.attachments.delete(attachment);
  }
}

function deleteRoomArtifacts(ctx: SpacetimeCtx, roomId: string) {
  for (const message of messagesByRoomId(ctx, roomId)) {
    deleteMessageArtifacts(ctx, message.id);
    ctx.db.messages.delete(message);
  }

  for (const override of roomPermissionOverridesByRoomId(ctx, roomId)) {
    ctx.db.roomPermissionOverrides.delete(override);
  }

  for (const screenShare of screenSharesByRoomId(ctx, roomId)) {
    ctx.db.screenShares.delete(screenShare);
  }
}

function deleteHouseRoleArtifacts(ctx: SpacetimeCtx, houseId: string) {
  for (const memberRole of ctx.db.memberRoles.iter()) {
    if (memberRole.houseId === houseId) {
      ctx.db.memberRoles.delete(memberRole);
    }
  }

  const roomIds = new Set(roomsByHouseId(ctx, houseId).map((room) => room.id));
  for (const override of ctx.db.roomPermissionOverrides.iter()) {
    if (roomIds.has(override.roomId)) {
      ctx.db.roomPermissionOverrides.delete(override);
    }
  }

  for (const role of rolesByHouseId(ctx, houseId)) {
    ctx.db.roles.delete(role);
  }
}

function deleteHouseBadgeArtifacts(ctx: SpacetimeCtx, houseId: string) {
  for (const userBadge of userBadgesByHouseId(ctx, houseId)) {
    ctx.db.userBadges.delete(userBadge);
  }

  for (const badge of badgesByHouseId(ctx, houseId)) {
    ctx.db.badges.delete(badge);
  }
}

function randomInviteCode(ctx: SpacetimeCtx) {
  const raw = ctx.newUuidV7().toString().replace(/-/g, "").slice(-8).toUpperCase();
  return raw;
}

function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase();
}

function nextRoomPosition(ctx: SpacetimeCtx, houseId: string) {
  let maxPosition = -100;
  for (const room of roomsByHouseId(ctx, houseId)) {
    if (room.position > maxPosition) {
      maxPosition = room.position;
    }
  }
  return maxPosition + 100;
}

function nextRolePosition(ctx: SpacetimeCtx, houseId: string) {
  let maxPosition = 0;
  for (const role of rolesByHouseId(ctx, houseId)) {
    if (role.position > maxPosition) {
      maxPosition = role.position;
    }
  }
  return maxPosition + 10;
}

function createDefaultRole(ctx: SpacetimeCtx, houseId: string) {
  const defaultRoleId = ctx.newUuidV7().toString();
  ctx.db.roles.insert({
    id: defaultRoleId,
    houseId,
    name: "@everyone",
    color: "",
    position: 0,
    permissions: DEFAULT_MEMBER_PERMISSIONS.toString(),
    isDefault: true,
    createdAt: nowIso()
  });
}

function createDefaultInvite(ctx: SpacetimeCtx, houseId: string, createdBy: string) {
  let code = randomInviteCode(ctx);
  while (findInviteByCode(ctx, code)) {
    code = randomInviteCode(ctx);
  }

  ctx.db.invites.insert({
    code,
    houseId,
    createdBy,
    expiresAt: undefined,
    maxUses: undefined,
    uses: 0,
    createdAt: nowIso()
  });
}

function recordEvent(ctx: SpacetimeCtx, event: string, detail?: string) {
  ctx.db.bootstrapEvents.insert({
    event: detail ? `${event}:${detail}` : event,
    createdAt: nowIso()
  });
}

export {
  REGISTER_SCHEMA,
  LOGIN_SCHEMA,
  PROFILE_SCHEMA,
  STATUS_SCHEMA,
  HOUSE_CREATE_SCHEMA,
  HOUSE_UPDATE_SCHEMA,
  HOUSE_DELETE_SCHEMA,
  HOUSE_JOIN_BY_INVITE_SCHEMA,
  HOUSE_KICK_MEMBER_SCHEMA,
  HOUSE_CREATE_INVITE_SCHEMA,
  HOUSE_REVOKE_INVITE_SCHEMA,
  HOUSE_BAN_MEMBER_SCHEMA,
  HOUSE_UNBAN_MEMBER_SCHEMA,
  ROOM_CREATE_SCHEMA,
  ROOM_UPDATE_SCHEMA,
  ROOM_DELETE_SCHEMA,
  VOICE_JOIN_SCHEMA,
  VOICE_UPDATE_MEDIA_SCHEMA,
  MESSAGE_SEND_SCHEMA,
  MESSAGE_EDIT_SCHEMA,
  MESSAGE_DELETE_SCHEMA,
  MESSAGE_REACTION_SCHEMA,
  ROLE_CREATE_SCHEMA,
  ROLE_UPDATE_SCHEMA,
  ROLE_DELETE_SCHEMA,
  ROLE_ASSIGN_SCHEMA,
  ROLE_REVOKE_SCHEMA,
  ROOM_PERMISSION_OVERRIDE_SCHEMA,
  DM_SEND_SCHEMA,
  DM_EDIT_SCHEMA,
  DM_DELETE_SCHEMA,
  BADGE_GRANT_SCHEMA,
  BADGE_REVOKE_SCHEMA,
  nowIso,
  hashPassword,
  findUserByUsername,
  findUserById,
  findSessionByToken,
  findPresenceByUserId,
  findVoiceStateByUserId,
  findScreenShareByUserId,
  findHouseById,
  findHouseMember,
  findInviteByCode,
  findHouseBan,
  findRoomById,
  findMessageById,
  findDMMessageById,
  findReaction,
  findRoleById,
  findMemberRole,
  findRoomPermissionOverride,
  findBadgeById,
  findUserBadge,
  houseMembersByHouseId,
  invitesByHouseId,
  houseBansByHouseId,
  roomsByHouseId,
  rolesByHouseId,
  badgesByHouseId,
  userBadgesByHouseId,
  memberRolesByHouseAndUser,
  roomPermissionOverridesByRoomId,
  screenSharesByRoomId,
  identityToken,
  upsertSession,
  upsertPresence,
  upsertVoiceState,
  upsertScreenShare,
  clearScreenShare,
  requireAuthenticatedUser,
  requireHouseOwner,
  requireHouseMember,
  parsePermissionBits,
  canonicalConversationKey,
  resolveUserPermissions,
  requirePermission,
  parseMessageAttachments,
  deleteMessageArtifacts,
  deleteRoomArtifacts,
  deleteHouseRoleArtifacts,
  deleteHouseBadgeArtifacts,
  normalizeInviteCode,
  nextRoomPosition,
  nextRolePosition,
  createDefaultRole,
  createDefaultInvite,
  recordEvent
};
