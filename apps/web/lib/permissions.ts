import {
  hasPermission as hasPermissionBit,
  resolveUserPermissions,
  type PermissionMemberRole,
  type PermissionRole,
  type PermissionRoomOverride
} from "@houseplan/types";

export type WebPermissionRole = PermissionRole;
export type WebPermissionMemberRole = PermissionMemberRole;
export type WebPermissionRoomOverride = PermissionRoomOverride;

export type ResolveWebPermissionsInput = {
  houseOwnerId?: string;
  userId: string;
  roomId?: string;
  roles: WebPermissionRole[];
  memberRoles: WebPermissionMemberRole[];
  roomPermissionOverrides: WebPermissionRoomOverride[];
};

export function resolveWebPermissions(input: ResolveWebPermissionsInput): bigint {
  return resolveUserPermissions({
    houseOwnerId: input.houseOwnerId,
    userId: input.userId,
    roomId: input.roomId,
    roles: input.roles,
    memberRoles: input.memberRoles,
    roomPermissionOverrides: input.roomPermissionOverrides
  });
}

export function hasPermission(userPerms: bigint, permission: bigint): boolean {
  return hasPermissionBit(userPerms, permission);
}
