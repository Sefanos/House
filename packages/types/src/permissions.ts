export const Permission = {
  MANAGE_HOUSE: 1n << 0n,
  MANAGE_ROLES: 1n << 1n,
  MANAGE_ROOMS: 1n << 2n,
  MANAGE_INVITES: 1n << 3n,
  KICK_MEMBERS: 1n << 4n,
  BAN_MEMBERS: 1n << 5n,
  VIEW_AUDIT_LOG: 1n << 6n,
  VIEW_ROOM: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  MANAGE_MESSAGES: 1n << 12n,
  ATTACH_FILES: 1n << 13n,
  ADD_REACTIONS: 1n << 14n,
  MENTION_EVERYONE: 1n << 15n,
  USE_THREADS: 1n << 16n,
  CONNECT_VOICE: 1n << 20n,
  SPEAK: 1n << 21n,
  SHARE_CAMERA: 1n << 22n,
  SHARE_SCREEN: 1n << 23n,
  MUTE_MEMBERS: 1n << 24n,
  MOVE_MEMBERS: 1n << 25n,
  ADMINISTRATOR: 1n << 30n
} as const;

export type PermissionKey = keyof typeof Permission;

export const DEFAULT_MEMBER_PERMISSIONS =
  Permission.VIEW_ROOM |
  Permission.SEND_MESSAGES |
  Permission.ATTACH_FILES |
  Permission.ADD_REACTIONS |
  Permission.USE_THREADS |
  Permission.CONNECT_VOICE |
  Permission.SPEAK |
  Permission.SHARE_CAMERA |
  Permission.SHARE_SCREEN;

export const DEFAULT_ADMIN_PERMISSIONS =
  DEFAULT_MEMBER_PERMISSIONS |
  Permission.MANAGE_MESSAGES |
  Permission.MANAGE_ROOMS |
  Permission.MANAGE_INVITES |
  Permission.KICK_MEMBERS |
  Permission.MENTION_EVERYONE |
  Permission.MUTE_MEMBERS |
  Permission.MOVE_MEMBERS |
  Permission.VIEW_AUDIT_LOG;

export function hasPermission(userPerms: bigint, permission: bigint): boolean {
  if ((userPerms & Permission.ADMINISTRATOR) === Permission.ADMINISTRATOR) {
    return true;
  }
  return (userPerms & permission) === permission;
}

export function combinePermissions(...perms: bigint[]): bigint {
  return perms.reduce((acc, p) => acc | p, 0n);
}
