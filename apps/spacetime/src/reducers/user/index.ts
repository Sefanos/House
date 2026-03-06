import { placeholder, type ReducerInput } from "../types.js";

export function updateProfile(input: ReducerInput) {
  return placeholder("user.updateProfile", input);
}

export function updateStatus(input: ReducerInput) {
  return placeholder("user.updateStatus", input);
}
