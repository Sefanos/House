import test from "node:test";
import assert from "node:assert/strict";
import {
  Permission,
  hasPermission,
  resolvePermissions,
  resolveUserPermissions
} from "../dist/permissions.js";

test("resolvePermissions: owner bypass grants full permissions", () => {
  const resolved = resolvePermissions({
    isOwner: true,
    basePerms: 0n,
    roomOverrides: [
      {
        allow: 0n,
        deny: Permission.SEND_MESSAGES
      }
    ]
  });

  assert.equal(resolved, ~0n);
});

test("resolvePermissions: administrator bypass ignores room denies", () => {
  const basePerms = Permission.ADMINISTRATOR | Permission.SEND_MESSAGES;

  const resolved = resolvePermissions({
    isOwner: false,
    basePerms,
    roomOverrides: [
      {
        allow: 0n,
        deny: Permission.SEND_MESSAGES
      }
    ]
  });

  assert.equal(resolved, basePerms);
  assert.equal(hasPermission(resolved, Permission.SEND_MESSAGES), true);
});

test("resolvePermissions: allow/deny precedence follows (base | allow) & ~deny", () => {
  const resolved = resolvePermissions({
    isOwner: false,
    basePerms: Permission.SEND_MESSAGES,
    roomOverrides: [
      {
        allow: Permission.ATTACH_FILES,
        deny: Permission.SEND_MESSAGES
      }
    ]
  });

  assert.equal(hasPermission(resolved, Permission.SEND_MESSAGES), false);
  assert.equal(hasPermission(resolved, Permission.ATTACH_FILES), true);
});

test("resolveUserPermissions: includes default role and member roles", () => {
  const resolved = resolveUserPermissions({
    houseOwnerId: "owner",
    userId: "member",
    roomId: "room-1",
    roles: [
      {
        id: "everyone",
        permissions: String(Permission.VIEW_ROOM),
        isDefault: true
      },
      {
        id: "writer",
        permissions: String(Permission.SEND_MESSAGES),
        isDefault: false
      }
    ],
    memberRoles: [
      {
        userId: "member",
        roleId: "writer"
      }
    ],
    roomPermissionOverrides: []
  });

  assert.equal(hasPermission(resolved, Permission.VIEW_ROOM), true);
  assert.equal(hasPermission(resolved, Permission.SEND_MESSAGES), true);
});

test("resolveUserPermissions: room overrides apply only for the active room", () => {
  const resolved = resolveUserPermissions({
    houseOwnerId: "owner",
    userId: "member",
    roomId: "room-1",
    roles: [
      {
        id: "everyone",
        permissions: String(Permission.SEND_MESSAGES),
        isDefault: true
      }
    ],
    memberRoles: [],
    roomPermissionOverrides: [
      {
        roomId: "room-2",
        roleId: "everyone",
        allow: "0",
        deny: String(Permission.SEND_MESSAGES)
      }
    ]
  });

  assert.equal(hasPermission(resolved, Permission.SEND_MESSAGES), true);
});
