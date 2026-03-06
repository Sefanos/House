import { placeholder, type ReducerInput } from "../types.js";

export function grantBadge(input: ReducerInput) {
  return placeholder("badges.grantBadge", input);
}

export function revokeBadge(input: ReducerInput) {
  return placeholder("badges.revokeBadge", input);
}
