import { placeholder, type ReducerInput } from "../types.js";

export function createHouse(input: ReducerInput) {
  return placeholder("house.createHouse", input);
}

export function updateHouse(input: ReducerInput) {
  return placeholder("house.updateHouse", input);
}

export function deleteHouse(input: ReducerInput) {
  return placeholder("house.deleteHouse", input);
}

export function joinByInvite(input: ReducerInput) {
  return placeholder("house.joinByInvite", input);
}

export function kickMember(input: ReducerInput) {
  return placeholder("house.kickMember", input);
}
