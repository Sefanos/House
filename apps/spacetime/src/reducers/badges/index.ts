import { Permission } from "@houseplan/types";
import { t } from "spacetimedb/server";
import {
  BADGE_GRANT_SCHEMA,
  BADGE_REVOKE_SCHEMA,
  badgesByHouseId,
  findBadgeById,
  findHouseMember,
  findUserBadge,
  nowIso,
  recordEvent,
  requireAuthenticatedUser,
  requireHouseMember,
  requirePermission,
  spacetimedb,
  userBadgesByHouseId
} from "../shared.js";

function findExistingBadge(
  ctx: Parameters<typeof requirePermission>[0],
  houseId: string,
  badgeName: string,
  badgeType: string
) {
  const normalizedName = badgeName.toLowerCase();
  for (const badge of badgesByHouseId(ctx, houseId)) {
    if (badge.name.toLowerCase() === normalizedName && badge.badgeType === badgeType) {
      return badge;
    }
  }
  return null;
}

export const badgesGrantBadge = spacetimedb.reducer(
  {
    houseId: t.string(),
    userId: t.string(),
    badgeName: t.string(),
    badgeIcon: t.string(),
    badgeType: t.string()
  },
  (ctx, args) => {
    const parsed = BADGE_GRANT_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid grant badge payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const house = requireHouseMember(ctx, parsed.data.houseId, user.id);
    if (house.ownerId !== user.id) {
      requirePermission(ctx, house.id, user.id, Permission.MANAGE_ROLES);
    }
    if (!findHouseMember(ctx, house.id, parsed.data.userId)) {
      throw new Error("Target user must be a house member.");
    }

    const existingBadge = findExistingBadge(
      ctx,
      house.id,
      parsed.data.badgeName,
      parsed.data.badgeType
    );

    const badge =
      existingBadge ??
      ctx.db.badges.insert({
        id: ctx.newUuidV7().toString(),
        houseId: house.id,
        name: parsed.data.badgeName,
        icon: parsed.data.badgeIcon,
        badgeType: parsed.data.badgeType,
        createdBy: user.id,
        createdAt: nowIso()
      });

    const existingAssignment = findUserBadge(ctx, house.id, parsed.data.userId, badge.id);
    if (existingAssignment) {
      return;
    }

    ctx.db.userBadges.insert({
      id: ctx.newUuidV7().toString(),
      houseId: house.id,
      badgeId: badge.id,
      userId: parsed.data.userId,
      grantedBy: user.id,
      grantedAt: nowIso()
    });

    recordEvent(
      ctx,
      "badge_granted",
      `houseId=${house.id};badgeId=${badge.id};targetUserId=${parsed.data.userId};actorId=${user.id}`
    );
  }
);

export const badgesRevokeBadge = spacetimedb.reducer(
  {
    houseId: t.string(),
    userId: t.string(),
    badgeId: t.string()
  },
  (ctx, args) => {
    const parsed = BADGE_REVOKE_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid revoke badge payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const house = requireHouseMember(ctx, parsed.data.houseId, user.id);
    if (house.ownerId !== user.id) {
      requirePermission(ctx, house.id, user.id, Permission.MANAGE_ROLES);
    }

    const badge = findBadgeById(ctx, parsed.data.badgeId);
    if (!badge || badge.houseId !== house.id) {
      throw new Error("Badge not found in this house.");
    }

    const assignment = findUserBadge(ctx, house.id, parsed.data.userId, badge.id);
    if (!assignment) {
      throw new Error("Badge assignment not found.");
    }

    ctx.db.userBadges.delete(assignment);
    const remainingAssignments = userBadgesByHouseId(ctx, house.id).filter(
      (userBadge) => userBadge.badgeId === badge.id
    );
    if (remainingAssignments.length === 0) {
      ctx.db.badges.delete(badge);
    }

    recordEvent(
      ctx,
      "badge_revoked",
      `houseId=${house.id};badgeId=${badge.id};targetUserId=${parsed.data.userId};actorId=${user.id}`
    );
  }
);
