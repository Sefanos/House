import { Permission } from "@houseplan/types";

export type RoomOverride = {
  allow: bigint;
  deny: bigint;
};

export type ResolveInput = {
  isOwner: boolean;
  basePerms: bigint;
  roomOverrides?: RoomOverride[];
};

export function hasPermission(userPerms: bigint, permission: bigint): boolean {
  if ((userPerms & Permission.ADMINISTRATOR) === Permission.ADMINISTRATOR) {
    return true;
  }
  return (userPerms & permission) === permission;
}

export function resolvePermissions(input: ResolveInput): bigint {
  if (input.isOwner) {
    return ~0n;
  }

  const base = input.basePerms;
  if (hasPermission(base, Permission.ADMINISTRATOR)) {
    return base;
  }

  let allow = 0n;
  let deny = 0n;
  for (const override of input.roomOverrides ?? []) {
    allow |= override.allow;
    deny |= override.deny;
  }

  return (base | allow) & ~deny;
}
