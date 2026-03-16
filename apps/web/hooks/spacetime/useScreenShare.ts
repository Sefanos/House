"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getLivekitRoom } from "@/lib/livekitRoom";
import { ensureSpacetimeConnection, invokeVoiceReducer } from "@/lib/spacetime";
import { useUsers } from "./useUsers";

type ScreenShareRow = {
  userId: string;
  houseId: string;
  roomId: string;
  startedAt: string;
};

type ScreenShareParticipant = {
  userId: string;
  username: string;
  displayName: string;
  roomId: string;
  houseId: string;
  startedAt: string;
};

type UseScreenShareResult = {
  shares: ScreenShareParticipant[];
  activeShare: ScreenShareParticipant | null;
  isLoading: boolean;
  error: string | null;
  isStarting: boolean;
  isStopping: boolean;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
};

export function useScreenShare(houseId?: string, roomId?: string): UseScreenShareResult {
  const { users, isLoading: isLoadingUsers, error: usersError } = useUsers();
  const [shares, setShares] = useState<ScreenShareRow[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(true);
  const [sharesError, setSharesError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    async function setup() {
      try {
        const connection = await ensureSpacetimeConnection();
        const table = (connection.db as unknown as {
          screenShares: {
            iter: () => Iterable<ScreenShareRow>;
            onInsert: (callback: () => void) => void;
            onDelete: (callback: () => void) => void;
            onUpdate: (callback: () => void) => void;
            removeOnInsert: (callback: () => void) => void;
            removeOnDelete: (callback: () => void) => void;
            removeOnUpdate: (callback: () => void) => void;
          };
        }).screenShares;

        const syncShares = () => {
          if (disposed) return;
          const rows = Array.from(table.iter()) as ScreenShareRow[];
          setShares(rows);
          setIsLoadingShares(false);
        };

        const onInsert = () => syncShares();
        const onDelete = () => syncShares();
        const onUpdate = () => syncShares();

        table.onInsert(onInsert);
        table.onDelete(onDelete);
        table.onUpdate(onUpdate);
        syncShares();

        cleanup = () => {
          table.removeOnInsert(onInsert);
          table.removeOnDelete(onDelete);
          table.removeOnUpdate(onUpdate);
        };
      } catch (error) {
        if (disposed) return;
        setSharesError(error instanceof Error ? error.message : "Failed to load screen shares.");
        setIsLoadingShares(false);
      }
    }

    setup();

    return () => {
      disposed = true;
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  const visibleShares = useMemo(() => {
    const usersById = new Map(users.map((entry) => [entry.id, entry]));
    return shares
      .filter((entry) => {
        if (houseId && entry.houseId !== houseId) return false;
        if (roomId && entry.roomId !== roomId) return false;
        return true;
      })
      .map((entry) => {
        const user = usersById.get(entry.userId);
        return {
          userId: entry.userId,
          username: user?.username ?? entry.userId,
          displayName: user?.displayName || user?.username || entry.userId,
          roomId: entry.roomId,
          houseId: entry.houseId,
          startedAt: entry.startedAt
        };
      })
      .sort((left, right) => left.startedAt.localeCompare(right.startedAt));
  }, [houseId, roomId, shares, users]);

  const startScreenShare = useCallback(async () => {
    setActionError(null);
    setIsStarting(true);
    try {
      const room = getLivekitRoom();
      if (!room || room.state !== "connected") {
        throw new Error("Join the voice room first.");
      }

      await room.localParticipant.setScreenShareEnabled(true);
      await invokeVoiceReducer("voice.startScreenShare");
    } catch (error) {
      const room = getLivekitRoom();
      await room?.localParticipant.setScreenShareEnabled(false).catch(() => undefined);
      setActionError(error instanceof Error ? error.message : "Failed to start screen share.");
      throw error;
    } finally {
      setIsStarting(false);
    }
  }, []);

  const stopScreenShare = useCallback(async () => {
    setActionError(null);
    setIsStopping(true);
    try {
      const room = getLivekitRoom();
      if (!room || room.state !== "connected") {
        throw new Error("Join the voice room first.");
      }

      await room.localParticipant.setScreenShareEnabled(false);
      await invokeVoiceReducer("voice.stopScreenShare");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to stop screen share.");
      throw error;
    } finally {
      setIsStopping(false);
    }
  }, []);

  return {
    shares: visibleShares,
    activeShare: visibleShares[0] ?? null,
    isLoading: isLoadingShares || isLoadingUsers,
    error: actionError ?? sharesError ?? usersError ?? null,
    isStarting,
    isStopping,
    startScreenShare,
    stopScreenShare
  };
}
