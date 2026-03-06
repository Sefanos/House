import { placeholder, type ReducerInput } from "../types.js";

export function sendMessage(input: ReducerInput) {
  return placeholder("messages.sendMessage", input);
}

export function editMessage(input: ReducerInput) {
  return placeholder("messages.editMessage", input);
}

export function deleteMessage(input: ReducerInput) {
  return placeholder("messages.deleteMessage", input);
}

export function addReaction(input: ReducerInput) {
  return placeholder("messages.addReaction", input);
}

export function removeReaction(input: ReducerInput) {
  return placeholder("messages.removeReaction", input);
}
