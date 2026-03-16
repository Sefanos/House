"use client";

import { RoomEvent, type Participant, type Room, type Track } from "livekit-client";
import { create } from "zustand";

export type LivekitMediaTrack = {
  id: string;
  participantIdentity: string;
  participantName: string;
  source: Track.Source;
  kind: Track.Kind;
  isLocal: boolean;
  track: Track;
};

type LivekitRoomState = {
  room: Room | null;
  mediaTracks: LivekitMediaTrack[];
  connectionState: string;
  error: string | null;
};

type LivekitRoomStore = LivekitRoomState & {
  setSnapshot: (snapshot: Partial<LivekitRoomState>) => void;
  clear: () => void;
};

const initialState: LivekitRoomState = {
  room: null,
  mediaTracks: [],
  connectionState: "disconnected",
  error: null
};

export const useLivekitRoomStore = create<LivekitRoomStore>((set) => ({
  ...initialState,
  setSnapshot: (snapshot) => set((state) => ({ ...state, ...snapshot })),
  clear: () => set(initialState)
}));

let cleanupActiveRoom: (() => void) | null = null;

function collectParticipantTracks(participant: Participant, isLocal: boolean): LivekitMediaTrack[] {
  return Array.from(participant.trackPublications.values())
    .flatMap((publication) => {
      const track = publication.track;
      if (!track) {
        return [];
      }

      return [
        {
          id: publication.trackSid || `${participant.identity}-${publication.source}`,
          participantIdentity: participant.identity,
          participantName: participant.name || participant.identity,
          source: publication.source,
          kind: publication.kind,
          isLocal,
          track
        }
      ];
    })
    .filter((entry) => {
      if (entry.kind === "audio") {
        return entry.source === "microphone";
      }
      return entry.source === "camera" || entry.source === "screen_share";
    });
}

function collectRoomTracks(room: Room): LivekitMediaTrack[] {
  return [
    ...collectParticipantTracks(room.localParticipant, true),
    ...Array.from(room.remoteParticipants.values()).flatMap((participant) =>
      collectParticipantTracks(participant, false)
    )
  ];
}

function syncRoomState(room: Room, error: string | null = null) {
  useLivekitRoomStore.getState().setSnapshot({
    room,
    mediaTracks: collectRoomTracks(room),
    connectionState: room.state,
    error
  });
}

export function attachLivekitRoom(room: Room) {
  cleanupLivekitRoom();

  const sync = () => syncRoomState(room);
  const syncWithError = (error: unknown) =>
    syncRoomState(room, error instanceof Error ? error.message : "Media device error.");

  const events: Array<[RoomEvent, (...args: unknown[]) => void]> = [
    [RoomEvent.Connected, sync],
    [RoomEvent.ConnectionStateChanged, sync],
    [RoomEvent.Reconnecting, sync],
    [RoomEvent.Reconnected, sync],
    [RoomEvent.ParticipantConnected, sync],
    [RoomEvent.ParticipantDisconnected, sync],
    [RoomEvent.TrackPublished, sync],
    [RoomEvent.TrackUnpublished, sync],
    [RoomEvent.TrackSubscribed, sync],
    [RoomEvent.TrackUnsubscribed, sync],
    [RoomEvent.TrackMuted, sync],
    [RoomEvent.TrackUnmuted, sync],
    [RoomEvent.LocalTrackPublished, sync],
    [RoomEvent.LocalTrackUnpublished, sync],
    [RoomEvent.MediaDevicesError, syncWithError],
    [RoomEvent.Disconnected, sync]
  ];

  for (const [event, handler] of events) {
    room.on(event, handler);
  }

  cleanupActiveRoom = () => {
    for (const [event, handler] of events) {
      room.off(event, handler);
    }
  };

  sync();
}

export function cleanupLivekitRoom(room?: Room | null) {
  const activeRoom = useLivekitRoomStore.getState().room;
  if (room && activeRoom && activeRoom !== room) {
    return;
  }

  if (cleanupActiveRoom) {
    cleanupActiveRoom();
    cleanupActiveRoom = null;
  }

  useLivekitRoomStore.getState().clear();
}

export function getLivekitRoom(): Room | null {
  return useLivekitRoomStore.getState().room;
}

export function setLivekitRoomError(error: string | null) {
  useLivekitRoomStore.getState().setSnapshot({ error });
}
