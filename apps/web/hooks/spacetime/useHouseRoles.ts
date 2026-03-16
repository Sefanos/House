"use client";

import { useEffect, useState } from "react";
import { ensureSpacetimeConnection } from "@/lib/spacetime";

type RoleRow = {
  id: string;
  houseId: string;
  name: string;
  color: string;
  position: number;
  permissions: string;
  isDefault: boolean;
  createdAt: string;
};

type MemberRoleRow = {
  id: string;
  houseId: string;
  userId: string;
  roleId: string;
  assignedBy: string;
  assignedAt: string;
};

type RoomPermissionOverrideRow = {
  id: string;
  roomId: string;
  roleId: string;
  allow: string;
  deny: string;
};

type UseHouseRolesResult = {
  roles: RoleRow[];
  memberRoles: MemberRoleRow[];
  roomPermissionOverrides: RoomPermissionOverrideRow[];
  isLoading: boolean;
  error: string | null;
};

export function useHouseRoles(houseId?: string): UseHouseRolesResult {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [memberRoles, setMemberRoles] = useState<MemberRoleRow[]>([]);
  const [roomPermissionOverrides, setRoomPermissionOverrides] = useState<RoomPermissionOverrideRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    async function setup() {
      try {
        const connection = await ensureSpacetimeConnection();
        const roleTable = connection.db.roles;
        const memberRoleTable = connection.db.memberRoles;
        const overrideTable = connection.db.roomPermissionOverrides;

        const syncRows = () => {
          if (disposed) return;

          const roleRows = Array.from(roleTable.iter()) as RoleRow[];
          const nextRoles = houseId ? roleRows.filter((role) => role.houseId === houseId) : roleRows;
          nextRoles.sort((a, b) => b.position - a.position || a.name.localeCompare(b.name));

          const roleIds = new Set(nextRoles.map((role) => role.id));
          const memberRoleRows = (Array.from(memberRoleTable.iter()) as MemberRoleRow[]).filter((memberRole) =>
            houseId ? memberRole.houseId === houseId : true
          );

          const overrideRows = (Array.from(overrideTable.iter()) as RoomPermissionOverrideRow[]).filter((override) =>
            roleIds.has(override.roleId)
          );

          setRoles(nextRoles);
          setMemberRoles(memberRoleRows);
          setRoomPermissionOverrides(overrideRows);
          setIsLoading(false);
        };

        const onInsert = () => syncRows();
        const onDelete = () => syncRows();
        const onUpdate = () => syncRows();

        roleTable.onInsert(onInsert);
        roleTable.onDelete(onDelete);
        roleTable.onUpdate(onUpdate);
        memberRoleTable.onInsert(onInsert);
        memberRoleTable.onDelete(onDelete);
        memberRoleTable.onUpdate(onUpdate);
        overrideTable.onInsert(onInsert);
        overrideTable.onDelete(onDelete);
        overrideTable.onUpdate(onUpdate);

        syncRows();

        cleanup = () => {
          roleTable.removeOnInsert(onInsert);
          roleTable.removeOnDelete(onDelete);
          roleTable.removeOnUpdate(onUpdate);
          memberRoleTable.removeOnInsert(onInsert);
          memberRoleTable.removeOnDelete(onDelete);
          memberRoleTable.removeOnUpdate(onUpdate);
          overrideTable.removeOnInsert(onInsert);
          overrideTable.removeOnDelete(onDelete);
          overrideTable.removeOnUpdate(onUpdate);
        };
      } catch (nextError) {
        if (disposed) return;
        setError(nextError instanceof Error ? nextError.message : "Failed to load roles.");
        setIsLoading(false);
      }
    }

    setup();

    return () => {
      disposed = true;
      if (cleanup) {
        cleanup();
      }
    };
  }, [houseId]);

  return { roles, memberRoles, roomPermissionOverrides, isLoading, error };
}
