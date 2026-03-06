import { placeholder, type ReducerInput } from "../types.js";

export function sendDM(input: ReducerInput) {
  return placeholder("dms.sendDM", input);
}

export function editDM(input: ReducerInput) {
  return placeholder("dms.editDM", input);
}

export function deleteDM(input: ReducerInput) {
  return placeholder("dms.deleteDM", input);
}
