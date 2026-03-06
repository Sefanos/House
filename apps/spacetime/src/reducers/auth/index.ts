import { placeholder, type ReducerInput } from "../types.js";

export function register(input: ReducerInput) {
  return placeholder("auth.register", input);
}

export function login(input: ReducerInput) {
  return placeholder("auth.login", input);
}

export function logout(input: ReducerInput) {
  return placeholder("auth.logout", input);
}
