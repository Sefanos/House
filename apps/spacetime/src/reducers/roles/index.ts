import { Permission } from "@houseplan/types";
import { t } from "spacetimedb/server";
import {
  ROLE_ASSIGN_SCHEMA,
  ROLE_CREATE_SCHEMA,
  ROLE_DELETE_SCHEMA,
  ROLE_REVOKE_SCHEMA,
  ROLE_UPDATE_SCHEMA,
  findHouseMember,
  findMemberRole,
  findRoleById,
  nextRolePosition,
  nowIso,
  parsePermissionBits,
  recordEvent,
  requireAuthenticatedUser,
  requireHouseMember,
  requirePermission,
  spacetimedb
} from "../shared.js";

export const rolesCreateRole = spacetimedb.reducer(
  {
    houseId: t.string(),
    name: t.string(),
    color: t.string(),
    position: t.i32().optional(),
    permissions: t.string()
  },
  (ctx, args) => {
    const parsed = ROLE_CREATE_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid create role payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const house = requireHouseMember(ctx, parsed.data.houseId, user.id);
    if (house.ownerId !== user.id) {
      requirePermission(ctx, house.id, user.id, Permission.MANAGE_ROLES);
    }

    const roleId = ctx.newUuidV7().toString();
    ctx.db.roles.insert({
      id: roleId,
      houseId: house.id,
      name: parsed.data.name,
      color: parsed.data.color,
      position: parsed.data.position ?? nextRolePosition(ctx, house.id),
      permissions: parsePermissionBits(parsed.data.permissions).toString(),
      isDefault: false,
      createdAt: nowIso()
    });

    recordEvent(ctx, "role_created", `houseId=${house.id};roleId=${roleId};userId=${user.id}`);
  }
);

export const rolesUpdateRole = spacetimedb.reducer(
  {
    roleId: t.string(),
    name: t.string(),
    color: t.string(),
    position: t.i32(),
    permissions: t.string()
  },
  (ctx, args) => {
    const parsed = ROLE_UPDATE_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid update role payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const role = findRoleById(ctx, parsed.data.roleId);
    if (!role) {
      throw new Error("Role not found.");
    }

    const house = requireHouseMember(ctx, role.houseId, user.id);
    if (house.ownerId !== user.id) {
      requirePermission(ctx, house.id, user.id, Permission.MANAGE_ROLES);
      if (role.isDefault) {
        throw new Error("Only house owner can edit the default role.");
      }
    }

    ctx.db.roles.delete(role);
    ctx.db.roles.insert({
      ...role,
      name: parsed.data.name,
      color: parsed.data.color,
      position: parsed.data.position,
      permissions: parsePermissionBits(parsed.data.permissions).toString()
    });

    recordEvent(ctx, "role_updated", `houseId=${house.id};roleId=${role.id};userId=${user.id}`);
  }
);

export const rolesDeleteRole = spacetimedb.reducer(
  {
    roleId: t.string()
  },
  (ctx, args) => {
    const parsed = ROLE_DELETE_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid delete role payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const role = findRoleById(ctx, parsed.data.roleId);
    if (!role) {
      throw new Error("Role not found.");
    }
    if (role.isDefault) {
      throw new Error("Default role cannot be deleted.");
    }

    const house = requireHouseMember(ctx, role.houseId, user.id);
    if (house.ownerId !== user.id) {
      requirePermission(ctx, house.id, user.id, Permission.MANAGE_ROLES);
    }

    for (const memberRole of ctx.db.memberRoles.iter()) {
      if (memberRole.roleId === role.id) {
        ctx.db.memberRoles.delete(memberRole);
      }
    }
    for (const override of ctx.db.roomPermissionOverrides.iter()) {
      if (override.roleId === role.id) {
        ctx.db.roomPermissionOverrides.delete(override);
      }
    }

    ctx.db.roles.delete(role);
    recordEvent(ctx, "role_deleted", `houseId=${house.id};roleId=${role.id};userId=${user.id}`);
  }
);

export const rolesAssignRole = spacetimedb.reducer(
  {
    houseId: t.string(),
    userId: t.string(),
    roleId: t.string()
  },
  (ctx, args) => {
    const parsed = ROLE_ASSIGN_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid assign role payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const house = requireHouseMember(ctx, parsed.data.houseId, user.id);
    if (house.ownerId !== user.id) {
      requirePermission(ctx, house.id, user.id, Permission.MANAGE_ROLES);
    }
    if (house.ownerId === parsed.data.userId) {
      throw new Error("Cannot assign roles to the house owner.");
    }

    const role = findRoleById(ctx, parsed.data.roleId);
    if (!role || role.houseId !== house.id) {
      throw new Error("Role not found in this house.");
    }
    if (!findHouseMember(ctx, house.id, parsed.data.userId)) {
      throw new Error("Target user is not a house member.");
    }

    const existing = findMemberRole(ctx, house.id, parsed.data.userId, role.id);
    if (existing) {
      return;
    }

    ctx.db.memberRoles.insert({
      id: ctx.newUuidV7().toString(),
      houseId: house.id,
      userId: parsed.data.userId,
      roleId: role.id,
      assignedBy: user.id,
      assignedAt: nowIso()
    });

    recordEvent(
      ctx,
      "role_assigned",
      `houseId=${house.id};roleId=${role.id};userId=${parsed.data.userId};actorId=${user.id}`
    );
  }
);

export const rolesRevokeRole = spacetimedb.reducer(
  {
    houseId: t.string(),
    userId: t.string(),
    roleId: t.string()
  },
  (ctx, args) => {
    const parsed = ROLE_REVOKE_SCHEMA.safeParse(args);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid revoke role payload.");
    }

    const { user } = requireAuthenticatedUser(ctx);
    const house = requireHouseMember(ctx, parsed.data.houseId, user.id);
    if (house.ownerId !== user.id) {
      requirePermission(ctx, house.id, user.id, Permission.MANAGE_ROLES);
    }

    const role = findRoleById(ctx, parsed.data.roleId);
    if (!role || role.houseId !== house.id) {
      throw new Error("Role not found in this house.");
    }
    if (role.isDefault) {
      throw new Error("Default role cannot be revoked.");
    }

    const memberRole = findMemberRole(ctx, house.id, parsed.data.userId, role.id);
    if (!memberRole) {
      throw new Error("Role assignment not found.");
    }

    ctx.db.memberRoles.delete(memberRole);
    recordEvent(
      ctx,
      "role_revoked",
      `houseId=${house.id};roleId=${role.id};userId=${parsed.data.userId};actorId=${user.id}`
    );
  }
);
