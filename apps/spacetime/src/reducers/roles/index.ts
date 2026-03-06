import { placeholder, type ReducerInput } from "../types.js";

export function createRole(input: ReducerInput) {
  return placeholder("roles.createRole", input);
}

export function updateRole(input: ReducerInput) {
  return placeholder("roles.updateRole", input);
}

export function deleteRole(input: ReducerInput) {
  return placeholder("roles.deleteRole", input);
}

export function assignRole(input: ReducerInput) {
  return placeholder("roles.assignRole", input);
}

export function revokeRole(input: ReducerInput) {
  return placeholder("roles.revokeRole", input);
}
