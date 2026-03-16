"use client";

import { useMemo } from "react";
import { useHouseRoles } from "@/hooks/spacetime/useHouseRoles";
import { useHouses } from "@/hooks/spacetime/useHouses";
import { hasPermission as hasPermissionBit, resolveWebPermissions } from "@/lib/permissions";

type UsePermissionsInput = {
  houseId?: string;
  userId?: string;
  roomId?: string;
};

type UsePermissionsResult = {
  resolvedPermissions: bigint;
  hasPermission: (permission: bigint) => boolean;
  isOwner: boolean;
  isLoading: boolean;
  error: string | null;
};

export function usePermissions(input: UsePermissionsInput): UsePermissionsResult {
  const { roles, memberRoles, roomPermissionOverrides, isLoading: isLoadingRoles, error } = useHouseRoles(
    input.houseId
  );
  const { houses, isLoading: isLoadingHouses } = useHouses();

  const house = useMemo(
    () => houses.find((entry) => entry.id === input.houseId) ?? null,
    [houses, input.houseId]
  );

  const resolvedPermissions = useMemo(() => {
    if (!input.houseId || !input.userId) {
      return 0n;
    }
    return resolveWebPermissions({
      houseOwnerId: house?.ownerId,
      userId: input.userId,
      roomId: input.roomId,
      roles,
      memberRoles,
      roomPermissionOverrides
    });
  }, [house?.ownerId, input.houseId, input.roomId, input.userId, memberRoles, roles, roomPermissionOverrides]);

  const hasPermission = useMemo(
    () => (permission: bigint) => hasPermissionBit(resolvedPermissions, permission),
    [resolvedPermissions]
  );

  return {
    resolvedPermissions,
    hasPermission,
    isOwner: Boolean(house?.ownerId && input.userId && house.ownerId === input.userId),
    isLoading: isLoadingRoles || isLoadingHouses,
    error
  };
}
