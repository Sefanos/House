import { placeholder, type ReducerInput } from "../types.js";

export function createRoom(input: ReducerInput) {
  return placeholder("rooms.createRoom", input);
}

export function updateRoom(input: ReducerInput) {
  return placeholder("rooms.updateRoom", input);
}

export function deleteRoom(input: ReducerInput) {
  return placeholder("rooms.deleteRoom", input);
}

export function setRoomPermissionOverride(input: ReducerInput) {
  return placeholder("rooms.setRoomPermissionOverride", input);
}
