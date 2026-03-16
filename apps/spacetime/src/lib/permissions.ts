import {
  hasPermission as hasPermissionBit,
  resolvePermissions as resolvePermissionBits,
  type ResolvePermissionsInput,
  type RoomOverride
} from "@houseplan/types";

export type { RoomOverride };
export type ResolveInput = ResolvePermissionsInput;

export function hasPermission(userPerms: bigint, permission: bigint): boolean {
  return hasPermissionBit(userPerms, permission);
}

export function resolvePermissions(input: ResolveInput): bigint {
  return resolvePermissionBits(input);
}
