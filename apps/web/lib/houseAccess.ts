import { Permission } from "@houseplan/types";

type HouseAccessInput = {
  isOwner: boolean;
  hasPermission: (permission: bigint) => boolean;
};

export type HouseAccess = {
  canOpenHouseSettings: boolean;
  canManageRooms: boolean;
  canCreateRooms: boolean;
  canManageInvites: boolean;
  canManageRoles: boolean;
  canKickMembers: boolean;
  canBanMembers: boolean;
  canDeleteHouse: boolean;
  canManageRoomOverrides: boolean;
};

export function resolveHouseAccess(input: HouseAccessInput): HouseAccess {
  const canManageRooms = input.isOwner || input.hasPermission(Permission.MANAGE_ROOMS);
  const canManageRoles = input.isOwner || input.hasPermission(Permission.MANAGE_ROLES);

  return {
    canOpenHouseSettings: canManageRooms,
    canManageRooms,
    canCreateRooms: input.isOwner,
    canManageInvites: input.isOwner || input.hasPermission(Permission.MANAGE_INVITES),
    canManageRoles,
    canKickMembers: input.isOwner || input.hasPermission(Permission.KICK_MEMBERS),
    canBanMembers: input.isOwner || input.hasPermission(Permission.BAN_MEMBERS),
    canDeleteHouse: input.isOwner,
    canManageRoomOverrides: canManageRoles
  };
}
